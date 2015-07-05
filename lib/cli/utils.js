/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  'use strict';

  var path = require('path');
  var fs = require('fs');
  var handlebars = require('handlebars');
  var _ = require('lodash');

  var compiler = require('../parsers/compiler');

  // Makes sure a the given project directory exists and return its path.
  var getProjectPath = function(projectName, callback) {
    var projectDir = path.resolve(process.cwd(), projectName || '.');
    if (!fs.existsSync(projectDir)) {
      return callback(new Error('No such directory: ' + projectDir));
    }
    // Project directories have a 'source' subdirectory in which there is the
    // top level info.dry file.
    var infoPath = path.join(projectDir, 'source', 'info.dry');
    if (!fs.existsSync(infoPath)) {
      return callback(new Error(
        'No info file found in: ' + projectDir + '/source' +
        '(usually means this is not a project).'
        ));
    }
    callback(null, projectDir);
  };

  // Finds the path to the given template.
  var getTemplatePath = function(templateName, templateType, callback) {
    templateName = templateName || 'default';
    var sourceDir = templateName;
    if (!fs.existsSync(sourceDir)) {
      sourceDir = path.resolve(__dirname, '..', 'templates',
                               templateType, sourceDir);
      if (!fs.existsSync(sourceDir)) {
        return callback(new Error(
          'Can\'t find ' + templateType + ' template: ' + templateName
          ));
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
      if (!pattern.test(srcpath)) {
        return done();
      }
      fs.stat(srcpath, function(err, stat) {
        if (err) {
          return done(); // Ignore errors.
        }
        if (latest === null || stat.mtime > latest) {
          latest = stat.mtime;
        }
        done();
      });
    }, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, latest);
      }
    });
  };

  // Checks if the given target (whatever it may be) is at least as recent
  // as the most recent dry file in the source directory.
  var isUpToDate = function(sourceDir, targetPath, callback) {
    if (fs.existsSync(targetPath)) {
      // Check its date.
      fs.stat(targetPath, function(err, stat) {
        if (err) {
          return callback(err);
        }
        getLatestMTime(sourceDir, function(err, latest) {
          if (err) {
            return callback(err);
          }
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
          console.log(('    Directory: ' + pathFrag).grey);
        }
      } catch (err) {
        if (pathFrag) {
          console.log(('    Overwriting: ' + pathFrag).grey);
        }
      }
      done();
    };
    var copyFile = function(sourcePath, done) {
      var pathFrag = path.relative(sourceDir, sourcePath);
      var filename = path.basename(pathFrag);
      var destPath;
      var doCopyFile = function() {
        fs.readFile(sourcePath, function(err, input) {
          if (err) {
            return done(err);
          }
          var template = handlebars.compile(input.toString());
          var output = template(data);
          fs.writeFile(destPath, output, function(err) {
            if (err) {
              return done(err);
            }
            console.log(('    File: ' + pathFrag).grey);
            done();
          });
        });
      };
      if (filename.substr(0, 1) === '+') {
        pathFrag = path.join(path.dirname(pathFrag), filename.substr(1));
        destPath = path.join(destDir, pathFrag);
        if (data.overwrite) {
          doCopyFile();
        } else {
          // We have a file we shouldn't overwrite.
          fs.exists(destPath, function(exists) {
            if (exists) {
              // Nothing to do here.
              done();
            } else {
              // Do the copy.
              doCopyFile();
            }
          });
        }
      } else {
        // We should overwrite the destination in all cases.
        destPath = path.join(destDir, pathFrag);
        doCopyFile();
      }
    };
    var doCopy = function(err) {
      if (err) {
        return callback(err);
      }
      compiler.walkDir(
        sourceDir, {directories:true, files:false}, mkDir,
        function(err) {
          if (err) {
            return callback(err);
          }
          compiler.walkDir(sourceDir, {}, copyFile, function(err) {
            if (err) {
              return callback(err);
            } else {
              callback(null, data);
            }
          });
        });
    };

    // Add additional context information.
    data.year = (new Date()).getFullYear();
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
    throw new Error('Command "' + this.name + '" must define a subparser.');
  };
  Command.prototype.run = function(args) {
    throw new Error('Command "' + this.name + '" has no implementation.');
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
