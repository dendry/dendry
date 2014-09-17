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

  var utils = require('../utils');
  var cmdCompile = require('./compile').cmd;
  var CLUserInterface = require('../../ui/cli').CommandLineUserInterface;

  var loadGame = function(data, callback) {
    if (data.needsCompilation) return callback(null, data);
    utils.loadCompiledGame(data.compiledPath, function(err, game) {
      if (err) return callback(err);
      data.game = game;
      return callback(null, data);
    });
  };

  var runGame = function(data, callback) {
    var clint = new CLUserInterface(data.game);
    clint.run(callback);
  };

  // ----------------------------------------------------------------------
  // Run: Runs a project via the command line interface.
  // ----------------------------------------------------------------------

  var cmdRun = new utils.Command("run");
  cmdRun.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: "Run a project via the command line.",
      description: "Runs the project via a simple command line interface. "+
        "Although games are designed to be played with more complex "+
        "interfaces, such as HTML, iOS, or Unity, this command allows "+
        "you to quickly play through a game. Choices are offered numerically, "+
        "and cleared screens are indicated with a horizontal line of equals "+
        "signs. The interface is configured to display in an 80-column "+
        "window."
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
