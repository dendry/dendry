#!/usr/bin/env node
/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var dive = require('dive');
  var exec = require('child_process').exec;
  var prompt = require('prompt');
  var path = require('path');
  var fs = require('fs');
  var handlebars = require('handlebars');
  var async = require('async');

  var infoParser = require('./info_dry_parser');
  var sceneParser = require('./scene_dry_parser');
  var compiler = require('./compiler');
  var CLRuntimeInterface = require('./cl_runtime').CommandLineRuntimeInterface;

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
  var divePlus = function(diry, opts, action, finished) {
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
  // New: Creates a new project directory structure from a template.
  // ----------------------------------------------------------------------

  var cmdNew = new Command("new");
  cmdNew.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: "Create a new project."
    });
    parser.addArgument(['project'], {
      help: "The project directory to create (must not exist)."
    });
    parser.addArgument(['--title'], {
      help: "The project title (default: will prompt you)."
    });
    parser.addArgument(['--author'], {
      help: "The project's author (default: will prompt you)."
    });
    parser.addArgument(['-t', '--template'], {
      help: "A project template to clone (default: the standard project). "+
        "Can be the name of a built-in template, or the path to a template "+
        "or existing project."
    });
  };
  cmdNew.run = function(args, callback) {
    // Define steps in performing the command, then run them
    // asynchronously in series with async.waterfall.

    // ....................................................................
    // If we need to find a default author, do so.
    var getDefaultAuthor = function(data, callback) {
      if (data.author === null) {
        // Try to find the author name, and use it as a default.
        var child = exec('id -P | cut -f8 -d:', function(err, stdout, stderr) {
          var defaultAuthor;
          // Silently consume the error, if we have one, it just means
          // we won't have a default.
          if (err === null) {
            // Trim the training newline.
            defaultAuthor = stdout.substr(0, stdout.length-1);
          }
          callback(null, data, defaultAuthor);
        });
      } else {
        // We have an explicit author, so don't try to find one from the system.
        callback(null, data, undefined);
      }
    };

    // ....................................................................
    // Make sure we have title and author, prompting if required.
    var getTitleAndAuthor = function(data, defaultAuthor, callback) {
      var id = data.project;

      prompt.override = data;
      prompt.message = "Dendry".grey;
      prompt.start();
      prompt.get([{
        name: 'title',
        description: "Title".red,
        // Capitalise the directory name as a default
        'default': (id.substr(0, 1).toUpperCase() + id.substr(1)),
        required: true
      }, {
        name: 'author',
        description: "Author".red,
        'default': defaultAuthor,
        required: true
      }], function(err, result) {
        if (err) return callback(err);
        data.title = result.title;
        data.author = result.author;
        callback(null, data);
      });
    };

    // ....................................................................
    // Find the template directory.
    var getSourceDir = function(data, callback) {
      var err;

      // Find the source directory, whether given explicitly or as a name.
      var template =  data.template || "standard";
      var sourceDir = template;
      if (!fs.existsSync(sourceDir)) {
        sourceDir = path.resolve(__dirname, "templates", sourceDir);
        if (!fs.existsSync(sourceDir)) {
          err = new Error("Cannot find template: "+template);
          return callback(err);
        } else {
          var infoPath = path.join(sourceDir, "info.dry");
          if (!fs.existsSync(infoPath)) {
            err = new Error("Can't find info file in template: "+infoPath);
            return callback(err);
          }
        }
      }

      data.template = template;
      data.sourceDir = sourceDir;
      callback(null, data);
    };

    // ....................................................................
    // Find the destination directory.
    var getDestDir = function(data, callback) {
      // Make sure we *can't* find the destination directory.
      var destDir = path.resolve(process.cwd(), data.project);
      if (fs.existsSync(destDir)) {
        var err = new Error("Destination directory already exists: "+destDir);
        return callback(err);
      }

      data.destDir = destDir;
      callback(null, data);
    };

    // ....................................................................
    // Tell the user we're outputting the project
    var notifyUser = function(data, callback) {
      console.log(("Creating new project in: "+data.destDir).grey);
      console.log(("Using template: "+data.template).grey);
      callback(null, data);
    };

    // ....................................................................
    // Create the correct directories synchronously.
    var createDirectoryStructure = function(data, callback) {

      var mkDir = function(err, sourcePath) {
        if (err) throw err;
        var pathFrag = path.relative(data.sourceDir, sourcePath);
        var destPath = path.join(data.destDir, pathFrag);
        fs.mkdirSync(destPath); // Sync because further paths may depend on it.
        if (pathFrag) {
          console.log(("    Directory: "+pathFrag).grey);
        }
      };

      mkDir(null, data.sourceDir); // Visit the top level dir (dive doesn't).
      dive(data.sourceDir, {directories:true, files:false}, mkDir, function() {
        callback(null, data);
      });
    };

    // ....................................................................
    // Run files through handlebars and copy them into place, asynchronously.
    var transformAndCopyFiles = function(data, callback) {

      var copyFile = function(err, sourcePath) {
        if (err) throw err;
        var pathFrag = path.relative(data.sourceDir, sourcePath);
        var destPath = path.join(data.destDir, pathFrag);
        fs.readFile(sourcePath, function(err, input) {
          if (err) throw err;
          var template = handlebars.compile(input.toString());
          var output = template(data);
          fs.writeFile(destPath, output, function(err) {
            if (err) throw err;
            console.log(("    File: "+pathFrag).grey);
          });
        });
      };

      dive(data.sourceDir, copyFile, function() {
        callback(null, data);
      });
    };

    // ....................................................................
    // Run the waterfall.
    var getData = function(callback) {
      callback(null, args);
    };
    async.waterfall(
      [getData,
       getDefaultAuthor, getTitleAndAuthor, getSourceDir, getDestDir,
       notifyUser, createDirectoryStructure, transformAndCopyFiles],
      function(err, result) {
        callback(err);
      });
  };

  // ----------------------------------------------------------------------
  // Compile: Checks a project is correct and compiles.
  // ----------------------------------------------------------------------

  var cmdCompile = new Command("compile");
  cmdCompile.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: "Compile a project.",
      aliases: ['co']
    });
    parser.addArgument(['project'], {
      nargs: "?",
      help: "The project to compile (default: the current directory)."
    });
    parser.addArgument(['-f', '--force'], {
      action: "storeTrue",
      default: false,
      help: "Always compiles, even if the compiled game is up to date."
    });
  };
  cmdCompile.run = function(args, callback) {
    // Define steps in performing the command, then run them
    // asynchronously in series with async.waterfall.

    // ....................................................................
    // Check the top level directory is there at all.
    var ensureDirectory = function(data, callback) {
      var sourceDir = path.resolve(process.cwd(), data.project || '.');
      if (!fs.existsSync(sourceDir)) {
        return callback(new Error("No such project: "+sourceDir));
      }
      data.sourceDir = sourceDir;
      callback(null, data);
    };

    // Finds the latest modification time for a file in the given
    // directory, or its children.
    var getLatestMTime = function(diry, callback) {
      var latest = null;
      divePlus(diry, {}, function(srcpath, done) {
        // Skip non relevant files.
        if (!/\.dry$/.test(srcpath)) return done();
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

    // Check if we have an up to date compiled file.
    var checkCompiledGameUpToDate = function(data, callback) {
      data.compiledPath = path.join(data.sourceDir, "game.json");
      data.needsCompilation = true;
      if (!args.force && fs.existsSync(data.compiledPath)) {
        // Check its date.
        fs.stat(data.compiledPath, function(err, stat) {
          if (err) return callback(err);
          getLatestMTime(data.sourceDir, function(err, latest) {
            if (err) return callback(err);
            data.needsCompilation = (latest > stat.mtime);
            return callback(null, data);
          });
        });
      } else {
        return callback(null, data);
      }
    };

    var compileGame = function(data, callback) {
      if (!data.needsCompilation) {
        if (data.command === 'compile') {
          console.log(
            "Game is up to date. Force compilation with -f/--force.".red
          );
        }
        return callback(null, data);
      }

      var infoContent;
      var sceneContents = [];
      divePlus(data.sourceDir, {}, function(srcpath, done) {
        if (/(^|\/)info\.dry$/.test(srcpath)) {
          infoParser.parseFromFile(srcpath, function(err, result) {
            if (err) return done(err);
            infoContent = result;
            done();
          });
        } else if (/\.scene\.dry$/.test(srcpath)) {
          sceneParser.parseFromFile(srcpath, function(err, result) {
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
            data.game = game;
            callback(null, data);
          });
        }
      });
    };

    var saveGame = function(data, callback) {
      if (!data.needsCompilation) return callback(null, data);
      fs.writeFile(
        data.compiledPath, JSON.stringify(data.game, null, 2),
        function(err) {
          if (err) return callback(err);
          callback(null, data);
        });
    };

    // ....................................................................
    // Run the waterfall.
    var getData = function(callback) {
      callback(null, args);
    };
    async.waterfall([getData, ensureDirectory,
                     checkCompiledGameUpToDate, compileGame, saveGame],
                    callback);
  };

  // ----------------------------------------------------------------------
  // Run: Runs a project via the command line interface.
  // ----------------------------------------------------------------------

  var cmdRun = new Command("run");
  cmdRun.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: "Run a project via the command line."
    });
    parser.addArgument(['project'], {
      nargs: "?",
      help: "The project to compile (default: the current directory)."
    });
    parser.addArgument(['-f', '--force'], {
      action: "storeTrue",
      default: false,
      help: "Always recompiles, even if the compiled game is up to date."
    });
  };
  cmdRun.run = function(args, callback) {
    // Optionally compile, then run the game.
    var getData = function(callback) {
      cmdCompile.run(args, callback);
    };

    var loadGame = function(data, callback) {
      if (data.needsCompilation) return callback(null, data);
      fs.readFile(
        data.compiledPath, function(err, result) {
          if (err) return callback(err);
          data.game = JSON.parse(result);
          callback(null, data);
        });
    };

    var runGame = function(data, callback) {
      var clint = new CLRuntimeInterface(data.game);
      clint.run(callback);
    };

    async.waterfall([getData, loadGame, runGame], callback);
  };

  // ======================================================================

  // Export the commands in case we need to run them from code.
  module.exports = {
    commands: Command.commandMap,
    allCommands: Command.commandList
  };

  // Process the command line and run the appropriate command.
  var main = function() {
    // Create the top level parser.
    var ArgumentParser = require('argparse').ArgumentParser;
    var parser = new ArgumentParser({
      prog: "dendry",
      description: "Create and manage dendry projects."
    });
    var subparsers = parser.addSubparsers({
      title: 'Commands',
      description:
        "For more information on a command, run: dendry <COMMAND> --help",
      dest: 'command',
      metavar: '<COMMAND>'
    });

    // Register each command's subparser in turn.
    Command.commandList.forEach(function(command) {
      command.createArgumentParser(subparsers);
    });

    // Parse the arguments and run.
    var args = parser.parseArgs();
    var cmd = Command.commandMap[args.command];
    cmd.run(args, function(err) {
      if (err) {
        console.error(err.toString().red);
      }
    });
  };

  if (require.main === module) {
    main();
  }

}());
