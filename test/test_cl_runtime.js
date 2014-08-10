/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

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
        if (!inputs()) return callback(new Error("Function failed."));
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
        {choice:'1'}, {choice:'2'}, {choice:'1'}, {choice:'1'}
      ]);
      var clint =  new clruntime.CommandLineRuntimeInterface(game, out, pin);
      clint.run(function(err) {
        (!!err).should.be.false;
        clint.gameState.isGameOver().should.be.true;
        pin.currentIndex.should.equal(4);
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
