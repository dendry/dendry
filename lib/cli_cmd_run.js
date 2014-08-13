/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var fs = require('fs');
  var async = require('async');

  var cliUtils = require('./cli_utils');
  var cmdCompile = require('./cli_cmd_compile').cmd;
  var CLRuntimeInterface = require('./cli_runtime').CommandLineRuntimeInterface;

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

  // ----------------------------------------------------------------------
  // Run: Runs a project via the command line interface.
  // ----------------------------------------------------------------------

  var cmdRun = new cliUtils.Command("run");
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
    var getData = function(callback) {
      cmdCompile.run(args, callback);
    };
    async.waterfall([getData, loadGame, runGame], callback);
  };

  module.exports = {
    cmd: cmdRun
  };
}());
