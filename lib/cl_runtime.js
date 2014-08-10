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

  var CommandLineRuntimeInterface = function(game) {
    this.game = game;
    this.interaction = new runtime.Interaction(this, game);
    this.interaction.beginGame();
  };
  // Interface fulfilment.
  CommandLineRuntimeInterface.prototype.displayContent = function(content) {
    console.log(content);
  };
  CommandLineRuntimeInterface.prototype.displayOptions = function(options) {
    for (var i = 0; i < options.length; ++i) {
      var option = options[i];
      console.log("    "+(i+1)+". "+option.title);
    }
  };
  // Other methods.
  CommandLineRuntimeInterface.prototype.run = function(callback) {
    var that = this;
    console.log('');
    this.interaction.display();
    if (this.interaction.isGameOver()) return callback();
    var options = this.interaction.getCurrentOptions();
    async.nextTick(function() {
      that.doChoice(options.length, callback);
    });
  };
  CommandLineRuntimeInterface.prototype.doChoice = function(maxv, callback) {
    var that = this;
    prompt.message = "Dendry".grey;
    prompt.start();
    prompt.get([{
      name: "choice",
      required: true,
      conform: function(value) {
        var choice = parseInt(value);
        return !isNaN(choice) && choice > 0 && choice <= maxv;
      }
    }], function(err, result) {
      if (err) throw err;
      var choice = parseInt(result.choice);
      that.interaction.choose(choice-1);
      async.nextTick(function() {
        that.run(callback);
      });
    });
  };

  module.exports = {
    CommandLineRuntimeInterface: CommandLineRuntimeInterface
  };

  // DEBUG: Simple testing
  var main = function() {
    var game = {
      scenes: {
        "root": {
          id: "root",
          content: "This is the root content.",
          options: [{id:"foo", title:"The Foo"}]
          },
        "foo": {
          id: "foo",
          content: "This is the foo content.",
          options: [{id:null, title:"Quit"},
                    {id:"root", title:"Return"}]
        }
      }
    };
    var clint = new CommandLineRuntimeInterface(game);
    clint.run();
  };

  if (require.main === module) {
    main();
  }

}());
