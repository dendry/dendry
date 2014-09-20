/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var path = require('path');
  var fs = require('fs');
  var handlebars = require('handlebars');
  var _ = require('lodash');

  var compiler = require('../parsers/compiler');
  var engine = require('../engine');

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
      sourceDir = path.resolve(__dirname, "..", "templates",
                               templateType, sourceDir);
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
    compiler.walkDir(diry, {}, function(srcpath, done) {
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
  var copyTemplate = function(sourceDir, destDir, data, callback) {
    var mkDir = function(sourcePath, done) {
      var pathFrag = path.relative(sourceDir, sourcePath);
      var destPath = path.join(destDir, pathFrag);
      try {
        fs.mkdirSync(destPath); // Sync because further paths may depend on it.
        if (pathFrag) {
          console.log(("    Directory: "+pathFrag).grey);
        }
      } catch (err) {
        if (pathFrag) {
          console.log(("    Overwriting: "+pathFrag).grey);
        }
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
      compiler.walkDir(
        sourceDir, {directories:true, files:false}, mkDir,
        function(err) {
          if (err) return callback(err);
          compiler.walkDir(sourceDir, {}, copyFile, function(err) {
            if (err) return callback(err);
            else callback(null, data);
          });
        });
    };

    mkDir(sourceDir, doCopy);
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
    getProjectPath: getProjectPath,
    getTemplatePath: getTemplatePath,
    getLatestMTime: getLatestMTime,
    isUpToDate: isUpToDate,
    copyTemplate: copyTemplate,

    Command: Command
  };

}());
