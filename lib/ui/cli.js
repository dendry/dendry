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

  var engine = require('../engine');

  // A game is required, but the prompt and output objects are not: they
  // allow us to override how the interaction takes place, to drive the
  // system from a test.
  var CommandLineUserInterface = function(game, consoleObj, promptObj) {
    this.game = game;
    this.console = consoleObj || console;
    this.prompt = promptObj || prompt;

    this.dendryEngine = new engine.DendryEngine(this, game);
  };
  engine.UserInterface.makeParentOf(CommandLineUserInterface);

  // ------------------------------------------------------------------------
  // Interface fulfilment.
  CommandLineUserInterface.prototype.displayContent = function(content) {
    this.console.log(content);
  };

  CommandLineUserInterface.prototype.displayChoices = function(choices) {
    for (var i = 0; i < choices.length; ++i) {
      var choice = choices[i];
      this.console.log("    "+(i+1)+". "+choice.title);
    }
  };

  CommandLineUserInterface.prototype.newPage = function() {
    this._line("=");
  };

  CommandLineUserInterface.prototype.beginGame = function() {
    this._line();
    this.console.log(this.game.title.bold + " by ".grey +
                     this.game.author.white.bold);
    this.console.log("(Ctrl+D or Q at prompt stops the game)".grey);
    this._line();
  };

  // ------------------------------------------------------------------------
  // Main entry point.

  CommandLineUserInterface.prototype.run = function(callback) {
    this.dendryEngine.beginGame();
    return this._doChoice(callback);
  };

  // ------------------------------------------------------------------------
  // Internal helpers.

  CommandLineUserInterface.prototype._line = function(symbol, num) {
    symbol = symbol || "-";
    num = num || 78;
    var line = _.times(num, _.constant(symbol)).join("").grey;
    this.console.log(line);
  };

  CommandLineUserInterface.prototype._doChoice = function(callback) {
    var that = this;

    if (this.dendryEngine.isGameOver()) return callback();
    var maxv = this.dendryEngine.getCurrentChoices().length;

    var cleanChoice = function(value) {
      value = value.trim().toLowerCase();
      if (value === 'q' || value === 'd') return value;
      value = parseInt(value);
      if (!isNaN(value)) return value;
      return undefined;
    };

    this.prompt.message = "Dendry".grey;
    this.prompt.start();
    this.prompt.get([{
      name: "choice",
      required: true,
      conform: function(value) {
        var opt = cleanChoice(value);
        if (opt === 'q' || opt === 'd') {
          return true;
        } else {
          return opt > 0 && opt <= maxv;
        }
      }
    }], function(err, result) {
      if (err) return callback(err);
      that.console.log('');
      var opt = cleanChoice(result.choice);
      switch(opt) {
      case 'q':
        // Don't do anything else, just finish.
        return callback();
      case 'd':
        that.console.log(that.dendryEngine.dumpState());
        async.nextTick(function() {
          that._doChoice(callback);
        });
        break;
      default:
        that.dendryEngine.choose(opt-1);
        async.nextTick(function() {
          that._doChoice(callback);
        });
        break;
      }
    });
  };

  module.exports = {
    CommandLineUserInterface: CommandLineUserInterface
  };

}());
