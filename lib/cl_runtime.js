/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');
  var prompt = require('prompt');
  var async = require('async');
  var colors = require('colors');

  var runtime = require('./runtime');

  // A game is required, but the prompt and output objects are not: they
  // allow us to override how the interaction takes place, to drive the
  // system from a test.
  var CommandLineRuntimeInterface = function(game, consoleObj, promptObj) {
    this.game = game;
    this.console = consoleObj || console;
    this.prompt = promptObj || prompt;

    this.gameState = new runtime.GameState(this, game);
  };

  // ------------------------------------------------------------------------
  // Interface fulfilment.
  CommandLineRuntimeInterface.prototype.displayContent = function(content) {
    this.console.log(content);
  };

  CommandLineRuntimeInterface.prototype.displayChoices = function(choices) {
    for (var i = 0; i < choices.length; ++i) {
      var choice = choices[i];
      this.console.log("    "+(i+1)+". "+choice.title);
    }
  };

  CommandLineRuntimeInterface.prototype.newPage = function() {
    this._line("=");
  };

  // ------------------------------------------------------------------------
  // Main entry point.

  CommandLineRuntimeInterface.prototype.run = function(callback) {
    this._line();
    this.console.log(this.game.title.bold + " by ".grey +
                     this.game.author.white.bold);
    this.console.log("(Ctrl+D stops the game)".grey);
    this._line();
    this.gameState.beginGame();
    return this._doChoice(callback);
  };

  // ------------------------------------------------------------------------
  // Internal helpers.

  CommandLineRuntimeInterface.prototype._line = function(symbol, num) {
    symbol = symbol || "-";
    num = num || 78;
    var line = _.times(num, _.constant(symbol)).join("").grey;
    this.console.log(line);
  };

  CommandLineRuntimeInterface.prototype._doChoice = function(callback) {
    var that = this;

    if (this.gameState.isGameOver()) return callback();
    var maxv = this.gameState.getCurrentChoices().length;

    this.prompt.message = "Dendry".grey;
    this.prompt.start();
    this.prompt.get([{
      name: "choice",
      required: true,
      conform: function(value) {
        var choice = parseInt(value);
        return !isNaN(choice) && choice > 0 && choice <= maxv;
      }
    }], function(err, result) {
      if (err) return callback(err);
      var choice = parseInt(result.choice);
      that.console.log('');
      that.gameState.choose(choice-1);
      async.nextTick(function() {
        that._doChoice(callback);
      });
    });
  };

  module.exports = {
    CommandLineRuntimeInterface: CommandLineRuntimeInterface
  };

}());
