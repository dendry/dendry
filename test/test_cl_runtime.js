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
  var assert = require('assert');
  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var clruntime = require('../lib/cl_runtime');

  describe("command-line run", function() {

    // We're going to drive the output from dummy objects, create them.
    var OutputAccumulator = function() {
      this.output = [];
    };
    OutputAccumulator.prototype.log = function(content) {
      this.output.push(content);
    };

    var PredeterminedInput = function(inputs) {
      this.inputs = inputs;
      this.currentIndex = 0;
    };
    PredeterminedInput.prototype.start = function() {};
    PredeterminedInput.prototype.get = function(schemae, callback) {
      var inputs = this.inputs[this.currentIndex];
      // Allow functions in the list of inputs to be run (for mid-game testing).
      while(_.isFunction(inputs)) {
        inputs();
        this.currentIndex++;
        inputs = this.inputs[this.currentIndex];
      }
      var result = {};
      for (var i = 0; i < schemae.length; ++i) {
        var schema = schemae[i];
        var val = inputs[schema.name];
        /* istanbul ignore else */
        if (schema.conform && !schema.conform(val)) {
          return callback(new Error("Value '"+val+"' for '"+schema.name+
                                    "' doesn't conform."));
        }
        result[schema.name] = val;
      }
      this.currentIndex++;
      callback(null, result);
    };

    var getTestGame = function() {
      return {
        title: "The Game",
        author: "The Author",
        scenes: {
          "root": {
            id: "root",
            newPage: true,
            content: "This is the root content.",
            options: {options:[{id:"@foo", title:"The Foo"},
                               {id:"@bar", title:"The Bar"}]}
          },
          "foo": {
            id: "foo",
            content: "This is the foo content.",
            options: {options:[{id:"@root", title:"Return"}]}
          },
          "bar": {
            id: "bar",
            content: "This is the bar content.",
            gameOver: true
          }
        }
      };
    };

    // ---------------------------------------------------------------------

    it("should default to command line output/input", function() {
      var game = getTestGame();
      var clint =  new clruntime.CommandLineRuntimeInterface(game);
      clint.console.should.equal(console);
      clint.prompt.should.equal(prompt);
    });

    it("should run a simple game", function(done) {
      var game = getTestGame();
      var out = new OutputAccumulator();
      var pin = new PredeterminedInput([
        {choice:'1'},
        function() {
          clint.gameState.getCurrentScene().id.should.equal('foo');
        },
        {choice:'1'},
        function() {
          clint.gameState.getCurrentScene().id.should.equal('root');
        },
        {choice:'2'}
      ]);
      var clint =  new clruntime.CommandLineRuntimeInterface(game, out, pin);
      clint.run(function(err) {
        (!!err).should.be.false;
        clint.gameState.isGameOver().should.be.true;
        pin.currentIndex.should.equal(5);
        done();
      });
    });

    it("should fail if prompt fails", function(done) {
      var game = getTestGame();
      var out = new OutputAccumulator();
      var pin = new PredeterminedInput([
        {choice:'1'}, {choice:'x'}
      ]);
      var clint =  new clruntime.CommandLineRuntimeInterface(game, out, pin);
      clint.run(function(err) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Value 'x' for 'choice' doesn't conform.");
        done();
      });
    });

  });
}());
