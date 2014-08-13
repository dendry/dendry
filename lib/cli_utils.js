/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var dive = require('dive');
  var path = require('path');
  var fs = require('fs');
  var handlebars = require('handlebars');
  var _ = require('lodash');

  var infoParser = require('./info_parser');
  var sceneParser = require('./scene_parser');
  var compiler = require('./compiler');

  /* An augmented version of dive that allows the processing 'action'
   * function to be asynchronous. It is not given an error, and
   * instead should accept a second parameter 'done' which should be
   * called when it has completed its work, with an error if something
   * happened. Errors are not passed along to future actions, but
   * actions are stopped and the finish routine is called. Unlike
   * dive, the finished routine is guaranteed to be called after all
   * actions have completed, and is passed the error, if there is one.
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
      } else if (!error) {
        donesPending++;
        action(srcpath, function(err) {
          if (err) error = err;
          donesPending--;
          if (donesPending === 0 && hasFinishedDive) {
            complete();
          }
        });
      }
    }, function() {
      hasFinishedDive = true;
      if (donesPending === 0) complete();
    });
  };

  // Makes sure a the given project directory exists and return its path.
  var getProjectPath = function(projectName, callback) {
    var sourceDir = path.resolve(process.cwd(), projectName || '.');
    if (!fs.existsSync(sourceDir)) {
      return callback(new Error("No such directory: "+sourceDir));
    }
    var infoPath = path.join(sourceDir, "info.dry");
    if (!fs.existsSync(infoPath)) {
      return callback(new Error("No info file found in: "+sourceDir+
                                " (usually means this is not a project)."));
    }
    callback(null, sourceDir);
  };

  // Finds the path to the given template.
  var getTemplatePath = function(templateName, templateType, callback) {
    templateName = templateName || "default";
    var sourceDir = templateName;
    if (!fs.existsSync(sourceDir)) {
      sourceDir = path.resolve(__dirname, "templates", templateType, sourceDir);
      if (!fs.existsSync(sourceDir)) {
        return callback(new Error("Can't find "+templateType+" template: "+
                                  templateName));
      }
    }
    return callback(null, sourceDir, templateName);
  };

  // Finds the latest modification time for a dry file in the given
  // directory, or its children.
  var getLatestMTime = function(diry, pattern, callback) {
    if (callback === undefined && _.isFunction(pattern)) {
      callback = pattern;
      pattern = undefined;
    }
    pattern = pattern || /\.dry$/;

    var latest = null;
    walkDir(diry, {}, function(srcpath, done) {
      // Skip non relevant files.
      if (!pattern.test(srcpath)) return done();
      fs.stat(srcpath, function(err, stat) {
        if (err) return done(); // Ignore errors.
        if (latest === null || stat.mtime > latest) {
          latest = stat.mtime;
        }
        done();
      });
    }, function(err) {
      if (err) callback(err);
      else callback(null, latest);
    });
  };

  // Checks if the given target (whatever it may be) is at least as recent
  // as the most recent dry file in the source directory.
  var isUpToDate = function(sourceDir, targetPath, callback) {
    if (fs.existsSync(targetPath)) {
      // Check its date.
      fs.stat(targetPath, function(err, stat) {
        if (err) return callback(err);
        getLatestMTime(sourceDir, function(err, latest) {
          if (err) return callback(err);
          return callback(null, (stat.mtime >= latest));
        });
      });
    } else {
      return callback(null, false);
    }
  };

  // Transform and copy template
  var copyTemplate = function(sourceDir, destDir, data, createRoot, callback) {
    var mkDir = function(sourcePath, done) {
      var pathFrag = path.relative(sourceDir, sourcePath);
      var destPath = path.join(destDir, pathFrag);
      fs.mkdirSync(destPath); // Sync because further paths may depend on it.
      if (pathFrag) {
        console.log(("    Directory: "+pathFrag).grey);
      }
      done();
    };
    var copyFile = function(sourcePath, done) {
      var pathFrag = path.relative(sourceDir, sourcePath);
      var destPath = path.join(destDir, pathFrag);
      fs.readFile(sourcePath, function(err, input) {
        if (err) return done(err);
        var template = handlebars.compile(input.toString());
        var output = template(data);
        fs.writeFile(destPath, output, function(err) {
          if (err) return done(err);
          console.log(("    File: "+pathFrag).grey);
          done();
        });
      });
    };
    var doCopy = function(err) {
      if (err) return callback(err);
      walkDir(sourceDir, {directories:true, files:false}, mkDir, function(err){
        if (err) return callback(err);
        walkDir(sourceDir, {}, copyFile, function(err) {
          if (err) return callback(err);
          else callback(null, data);
        });
      });
    };

    if (createRoot) {
      mkDir(sourceDir, doCopy);
    } else {
      doCopy();
    }
  };

  // Compiles a directory of dry data files into a game object.
  var compileGame = function(sourceDir, callback) {
    var infoContent;
    var sceneContents = [];
    walkDir(sourceDir, {}, function(sourcePath, done) {
      if (/(^|\/)info\.dry$/.test(sourcePath)) {
        infoParser.parseFromFile(sourcePath, function(err, result) {
          if (err) return done(err);
          infoContent = result;
          done();
        });
      } else if (/\.scene\.dry$/.test(sourcePath)) {
        sceneParser.parseFromFile(sourcePath, function(err, result) {
          if (err) return done(err);
          sceneContents.push(result);
          done();
        });
      } else {
        // Skip this file.
        done();
      }
    }, function(err) {
      if (err) return callback(err);
      else {
        compiler.compile(infoContent, sceneContents, function(err, game) {
          if (err) return callback(err);
          callback(null, game);
        });
      }
    });
  };

  // ----------------------------------------------------------------------

  /* Instantiate this prototype to create a new top level management
   * command. Instantiation automatically registers the command. */
  var Command = function(name) {
    this.name = name;
    Command.commandList.push(this);
    Command.commandMap[name] = this;
  };
  Command.prototype.createArgumentParser = function(subparsers) {
    throw new Error("Command '"+this.name+"' must define a subparser.");
  };
  Command.prototype.run = function(args) {
    throw new Error("Command '"+this.name+"' has no implementation.");
  };
  Command.commandList = [];
  Command.commandMap = {};

  // ----------------------------------------------------------------------

  module.exports = {
    walkDir: walkDir,
    getProjectPath: getProjectPath,
    getTemplatePath: getTemplatePath,
    getLatestMTime: getLatestMTime,
    isUpToDate: isUpToDate,
    copyTemplate: copyTemplate,
    compileGame: compileGame,

    Command: Command
  };

}());
