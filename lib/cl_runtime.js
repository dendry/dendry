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

  var runtime = require('./runtime');

  // A game is required, but the prompt and output objects are not: they
  // allow us to override how the interaction takes place, to drive the
  // system from a test.
  var CommandLineRuntimeInterface = function(game, promptObj, outputObj) {
    this.game = game;
    this.prompt = promptObj || prompt;
    this.output = outputObj || console.log;

    this.gameState = new runtime.GameState(this, game);
  };
  // Interface fulfilment.
  CommandLineRuntimeInterface.prototype.displayContent = function(content) {
    this.output(content);
  };
  CommandLineRuntimeInterface.prototype.displayOptions = function(options) {
    for (var i = 0; i < options.length; ++i) {
      var option = options[i];
      this.output("    "+(i+1)+". "+option.title);
    }
  };
  // Other methods.
  CommandLineRuntimeInterface.prototype.run = function(callback) {
    this.gameState.beginGame();
    return this._display(callback);
  };
  CommandLineRuntimeInterface.prototype._display = function(callback) {
    var that = this;
    this.output('');
    this.gameState.display();
    if (this.gameState.isGameOver()) return callback();
    var options = this.gameState.getCurrentOptions();
    async.nextTick(function() {
      that._doChoice(options.length, callback);
    });
  };
  CommandLineRuntimeInterface.prototype._doChoice = function(maxv, callback) {
    var that = this;
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
      if (err) throw err;
      var choice = parseInt(result.choice);
      that.gameState.choose(choice-1);
      async.nextTick(function() {
        that._display(callback);
      });
    });
  };

  module.exports = {
    CommandLineRuntimeInterface: CommandLineRuntimeInterface
  };

}());
