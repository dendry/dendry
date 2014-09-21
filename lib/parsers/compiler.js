/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var assert = require('assert');
  var _ = require('lodash');
  var dive = require('dive');
  var fs = require('fs');
  var path = require('path');
  var mkdirp = require('mkdirp');

  var infoParser = require('./info');
  var sceneParser = require('./scene');
  var qualityParser = require('./quality');
  var validators = require('./validators');
  var engine = require('../engine');

  // Returns a list of ids to check, when trying to resolve a relative id.
  var getCandidateAbsoluteIds = function(contextId, id) {
    // Make sure we have valid ids.
    validators.validateRelativeId(id, function(err, _) {
      if (err) throw err;
    });
    var hasContext = contextId && contextId.length > 0;
    if (hasContext) {
      validators.validateId(contextId, function(err, _) {
        if (err) throw err;
      });
    }

    // Ids may begin with dots, which changes their meaning.
    var dots = 0;
    while (id.substr(dots, 1) === '.') ++dots;
    var extra = id.substr(dots);
    var hasExtra = extra.length > 0;

    var contextComponents;

    var result;
    if (dots === 0) {
      if (!hasContext) {
        // If we have no context, there is only a global id.
        result = [id];
      } else {
        // Check from local to global.
        contextComponents = contextId.split('.');
        result = [];
        for (var i = contextComponents.length; i > 0; --i) {
          var thisId = contextComponents.slice(0, i);
          thisId.push(id);
          result.push(thisId.join('.'));
        }
        result.push(id);
      }
    } else if (dots === 1) {
      if (hasExtra) {
        // This is an absolute id.
        result = [extra];
      } else {
        // We are referencing the current context.
        if (!hasContext) {
          throw new Error("Relative id '"+id+"' requires context.");
        }
        result = [contextId];
      }
    } else {
      if (!hasContext) {
        throw new Error("Relative id '"+id+"' requires context.");
      }

      // Go up the correct number of levels.
      contextComponents = contextId.split('.');
      var depthNeeded = hasExtra ? (dots-1) : dots;
      if (contextComponents.length < depthNeeded) {
        throw new Error("Context is not deep enough.");
      }

      var resultComponents = contextComponents.slice(0, -dots+1);

      // Add the extra, if we have it.
      if (hasExtra) {
        resultComponents.push(extra);
      }

      result = [resultComponents.join(".")];
    }
    return result;
  };

  // ----------------------------------------------------------------------

  // Takes lists of dry files and builds a final playable game structure.
  var compile = function(infoDry, listOfScenes, listOfQualities, callback) {
    var result;

    // ......................................................................
    // Helper functions
    // ......................................................................
    var addToScenes = function(scene, parentId) {
      var id = scene.id;
      if (parentId !== undefined && id.lastIndexOf(parentId, 0) === -1) {
        // We have a scene id that doesn't include its parent, so add
        // the parent.
        id = parentId + '.' + id;
        scene.id = id;
      }

      if (result.scenes[id] !== undefined) {
        callback(
          new Error("Duplicate scenes with id '"+id+"' found.")
        );
        return false;
      }

      // Add the scene to the scene list.
      result.scenes[id] = scene;

      // Add tag lookups.
      if (scene.tags !== undefined) {
        _.each(scene.tags, function(tag) {
          if (result.tagLookup[tag] === undefined) {
            result.tagLookup[tag] = {};
          }
          result.tagLookup[tag][id] = true;
        });
      }

      // No error found.
      return true;
    };

    var addTopLevelSceneToScenes = function(scene) {
      // Add sections as scenes.
      if (scene.sections !== undefined && scene.sections.length > 0) {
        var ok = _.every(scene.sections, function(section) {
          return addToScenes(section, scene.id);
        });
        if (!ok) return false;
      }
      delete scene.sections;

      // Add the main scene.
      return addToScenes(scene);
    };

    /**
     * Uses the registered scenes to figure out what fully-qualified
     * id is intended by the given id used in the given parent.
     */
    var getFullyQualifiedId = function(parentId, id) {
      var candidates;
      try {
        candidates = getCandidateAbsoluteIds(parentId, id);
      } catch(err) {
        callback(err);
        return null;
      }
      for (var i = 0; i < candidates.length; ++i) {
        var candidate = candidates[i];
        if (result.scenes[candidate] !== undefined) {
          return candidate;
        }
      }
      callback(
        new Error("Couldn't find an id matching '"+id+"' in '"+parentId+"'.")
        );
      return null;
    };

    var fullyQualifyIdsInScene = function(scene) {
      if (scene.goTo !== undefined) {
        var newId = getFullyQualifiedId(scene.id, scene.goTo);
        if (newId === null) return false;
        scene.goTo = newId;
      }
      var ok = true;
      if (scene.options !== undefined) {
        ok = _.every(scene.options, function(option) {
          if (option.id.substr(0, 1) === '@') {
            var oldId = option.id.substring(1);
            var newId = getFullyQualifiedId(scene.id, oldId);
            if (newId === null) return false;
            option.id = "@"+newId;
          }
          return true;
        });
      }
      return ok;
    };

    var addQuality = function(quality) {
      result.qualities[quality.id] = quality;
      return true;
    };

    // ......................................................................
    // Run the compilation.
    // ......................................................................

    // The info file is the basic data of our game file.
    result = _.clone(infoDry);
    result.scenes = {};
    result.qualities = {};
    result.tagLookup = {};

    // Add all scenes to the game.
    var ok = _.every(listOfScenes, addTopLevelSceneToScenes);
    if (!ok) return;

    // Go through all id references and figure out the fully qualified
    // id intended.
    ok = _.every(result.scenes, fullyQualifyIdsInScene);
    if (!ok) return;

    // Compile the initial list of quality values.
    ok = _.every(listOfQualities, addQuality);
    assert(ok); // addQuality should not fail.
    return callback(null, result);
  };

  // ----------------------------------------------------------------------

  /* An augmented version of dive that allows the processing 'action'
   * function to be asynchronous. It should accept a parameter
   * 'finished' which should be called when it has completed its work,
   * with an error if something happened. Errors are not passed along
   * to future actions, but actions are stopped and the finish routine
   * is called. Unlike dive, the finished routine is guaranteed to be
   * called after all actions have completed, and is passed the error,
   * if there is one.
   *
   * action(src, done); done(err)
   * finished(err)
   */
  var walkDir = function(diry, opts, action, finished) {
    var hasFinishedDive = false;
    var donesPending = 0;
    var error;
    var complete = function() {
      if (error !== undefined) return finished(error);
      else return finished();
    };
    dive(diry, opts, function(err, srcpath) {
      if (err) {
        error = err;
        /* istanbul ignore else */
        if (donesPending === 0) complete(); // Can this ever find an
                                            // error except on the
                                            // first iteration?
      } else if (!error) {
        donesPending++;
        action(srcpath, function(err) {
          if (err) error = err;
          donesPending--;
          // This may be untestable, because of the async nature of the walk.
          /* istanbul ignore next */
          if (donesPending === 0 && hasFinishedDive) {
            complete();
          }
        });
      }
    }, function() {
      // Only called when no error is passed to the dive action callback.
      hasFinishedDive = true;
      // This may be untestable, because of the async nature of the walk.
      /* istanbul ignore next */
      if (donesPending === 0) complete();
    });
  };

  // Compiles a directory of dry data files into a game object.
  var compileGame = function(sourceDir, callback) {
    var info;
    var scenes = [];
    var qualities = [];
    walkDir(sourceDir, {}, function(sourcePath, done) {
      if (/(^|\/)info\.dry$/.test(sourcePath)) {
        infoParser.parseFromFile(sourcePath, function(err, result) {
          /* istanbul ignore if */
          if (err) return done(err);
          info = result;
          done();
        });
      } else if (/\.scene\.dry$/.test(sourcePath)) {
        sceneParser.parseFromFile(sourcePath, function(err, result) {
          /* istanbul ignore if */
          if (err) return done(err);
          scenes.push(result);
          done();
        });
      } else if (/\.quality\.dry$/.test(sourcePath)) {
        qualityParser.parseFromFile(sourcePath, function(err, result) {
          /* istanbul ignore if */
          if (err) return done(err);
          qualities.push(result);
          done();
        });
      } else {
        // Skip this file.
        done();
      }
    }, function(err) {
      /* istanbul ignore if */
      if (err) return callback(err);
      else {
        compile(info, scenes, qualities, function(err, game) {
          /* istanbul ignore if */
          if (err) return callback(err);
          callback(null, game);
        });
      }
    });
  };

  var loadCompiledGame = function(inPath, callback) {
    fs.readFile(inPath, function(err, json) {
      /* istanbul ignore if */
      if (err) return callback(err);
      convertJSONToGame(json, function(err, game) {
        /* istanbul ignore if */
        if (err) return callback(err);
        else return callback(null, game, json);
      });
    });
  };

  var saveCompiledGame = function(game, outPath, callback) {
    convertGameToJSON(game, function(err, json) {
      /* istanbul ignore if */
      if (err) return callback(err);
      var diry = path.dirname(outPath);
      mkdirp(diry, function(err) {
        /* istanbul ignore if */
        if (err) return callback(err);
        fs.writeFile(outPath, json, function(err) {
          /* istanbul ignore if */
          if (err) return callback(err);
          callback(null);
        });
      });
    });
  };

  var convertGameToJSON = function(game, callback) {
    var replacer = function(key, value) {
      if (_.isFunction(value)) {
        assert(value.source !== undefined);
        var source = value.source;
        return {$code:source};
      } else {
        return value;
      }
    };

    try {
      var json = JSON.stringify(game, replacer);
      return callback(null, json);
    } catch (err) {
      /* istanbul ignore next */
      return callback(err);
    }
  };

  // Alias this, because we want to define it in engine.js (so the
  // game engine has fewer dependencies), but it is more logically
  // here with its counterpart, convertGameToJSON.
  var convertJSONToGame = engine.convertJSONToGame;

  // ----------------------------------------------------------------------

  module.exports = {
    compile: compile,
    getCandidateAbsoluteIds: getCandidateAbsoluteIds,
    walkDir: walkDir,
    compileGame: compileGame,
    loadCompiledGame: loadCompiledGame,
    saveCompiledGame: saveCompiledGame,
    convertJSONToGame: convertJSONToGame,
    convertGameToJSON: convertGameToJSON
  };
}());
