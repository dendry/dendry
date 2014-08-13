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
  var async = require('async');

  var cliUtils = require('./cli_utils');

  var ensureProject = function(data, callback) {
    cliUtils.getProjectPath(data.project, function(err, sourceDir) {
      if (err) return callback(err);
      data.sourceDir = sourceDir;
      return callback(null, data);
    });
  };

  var checkCompiledGameUpToDate = function(data, callback) {
    data.compiledPath = path.join(data.sourceDir, "out", "game.json");
    data.needsCompilation = true;
    if (data.force) {
      return callback(null, data);
    } else {
      cliUtils.isUpToDate(
        data.sourceDir, data.compiledPath,
        function(err, utd) {
          if (err) return callback(err);
          data.needsCompilation = !utd;
          return callback(null, data);
        });
    }
  };

  var warnAndCompileGame = function(data, callback) {
    if (data.needsCompilation) {
      if (data.command !== 'compile') {
        console.log("Game file is out of date, recompiling.".red);
      }
      cliUtils.compileGame(data.sourceDir, function(err, game) {
        if (err) return callback(err);
        data.game = game;
        return callback(null, data);
      });
    } else {
      if (data.command === 'compile') {
        console.log("Game is up to date. Force compile with -f/--force.".red);
      }
      return callback(null, data);
    }
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

  // ----------------------------------------------------------------------
  // Compile: Checks a project is correct and compiles.
  // ----------------------------------------------------------------------

  var cmdCompile = new cliUtils.Command("compile");
  cmdCompile.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: "Compile a project."
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
  cmdCompile.run = function(args, callback) {
    var getData = function(callback) {
      callback(null, args);
    };
    async.waterfall([getData, ensureProject,
                     checkCompiledGameUpToDate, warnAndCompileGame, saveGame],
                    callback);
  };

  module.exports = {
    cmd: cmdCompile
  };
}());
