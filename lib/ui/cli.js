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
  var fs = require('fs');
  var assert = require('assert');

  var engine = require('../engine');
  var toText = require('./content/text');

  // A game is required, but the prompt and output objects are not: they
  // allow us to override how the interaction takes place, to drive the
  // system from a test.
  var CommandLineUserInterface = function(game, consoleObj, promptObj, width) {
    this.game = game;
    this.console = consoleObj || console;
    this.prompt = promptObj || prompt;
    this.defaultWidth = width;

    this.dendryEngine = new engine.DendryEngine(this, game);
  };
  engine.UserInterface.makeParentOf(CommandLineUserInterface);

  // ------------------------------------------------------------------------
  // Interface fulfilment.
  CommandLineUserInterface.prototype.displayContent =
    function(paragraphs, data) {
      var width = this._getWidth();
      var text = toText.convert(paragraphs, data, width);
      this.console.log(text);
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

  CommandLineUserInterface.prototype.run = function(state, callback) {
    if (callback === undefined) {
      callback = state;
      state = undefined;
    }
    if (state) {
      this.beginGame();
      this.dendryEngine.setState(state);
    } else {
      this.dendryEngine.beginGame();
    }
    return this._doChoice(callback);
  };

  // ------------------------------------------------------------------------
  // Internal helpers.

  CommandLineUserInterface.prototype._getWidth = function() {
    return this.defaultWidth || (process.stdout.getWindowSize()[0] - 2);
  };

  CommandLineUserInterface.prototype._line = function(symbol, num) {
    symbol = symbol || "-";
    num = num || this._getWidth();
    var line = _.times(num, _.constant(symbol)).join("").grey;
    this.console.log(line);
  };

  CommandLineUserInterface.prototype._dumpStateAndContinue = function(callback){
    var that = this;

    var cont = function() {
      async.nextTick(function() {
        that._doChoice(callback);
      });
    };

    var error = function(msg) {
      that.console.log(msg.red);
      that.console.log("State not dumped, continuing.".red);
      cont();
    };

    this.console.log(
      'Enter filename to dump state to, or leave blank to dump to console.'.grey
    );
    this.prompt.get([{
      name: "filename",
      required: false
    }], function(err, filename) {
      // No conformance check, so no error should be possible.
      assert(!err);

      var json = JSON.stringify(that.dendryEngine.getExportableState());

      filename = filename.filename.trim();
      if (filename && filename.length > 0) {
        fs.writeFile(filename, json, function(err) {
          if (err) error(err.toString());
          else {
            that.console.log('Dumped to '+filename+'\n');
            cont();
          }
        });
      } else {
        that.console.log(json);
        cont();
      }
    });
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
        that._dumpStateAndContinue(callback);
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
