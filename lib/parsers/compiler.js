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

  var validators = require('./validators');

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
      if (quality.initial !== undefined) {
        result.initialQualities[quality.id] = quality.initial;
      }
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
    result.initialQualities = {};
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

  module.exports = {
    compile: compile,
    getCandidateAbsoluteIds: getCandidateAbsoluteIds
  };
}());
