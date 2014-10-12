/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');
  var fs = require('fs');
  var prompt = require('prompt'); // To check if default prompt is this one.
  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var CLUserInterface = require('../lib/ui/cli').CommandLineUserInterface;

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
            options:[{id:"@foo", title:"The Foo"},
                     {id:"@bar", title:"The Bar"}]
          },
          "foo": {
            id: "foo",
            subtitle: "Description of Foo",
            order: 10,
            onArrival: [function(state, Q) { Q.foo = 1; }],
            content: "This is the foo content.",
            options:[{id:"@root", title:"Return"}]
          },
          "bar": {
            id: "bar",
            subtitle: "Description of Bar",
            chooseIf: function(state, Q) { return Q.foo > 0; },
            order: 20,
            content: "This is the bar content.",
            gameOver: true
          }
        }
      };
    };

    // ---------------------------------------------------------------------

    it("should default to command line output/input", function() {
      var game = getTestGame();
      var clint =  new CLUserInterface(game);
      clint.console.should.equal(console);
      clint.prompt.should.equal(prompt);
    });

    it("should run a simple game", function(done) {
      var game = getTestGame();
      var out = new OutputAccumulator();
      var pin = new PredeterminedInput([
        {choice:'1'},
        function() {
          clint.dendryEngine.getCurrentScene().id.should.equal('foo');
        },
        {choice:'1'},
        function() {
          clint.dendryEngine.getCurrentScene().id.should.equal('root');
        },
        {choice:'2'}
      ]);
      var clint =  new CLUserInterface(game, out, pin);
      clint.run(function(err) {
        (!!err).should.be.false;
        clint.dendryEngine.isGameOver().should.be.true;
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
      var clint =  new CLUserInterface(game, out, pin);
      clint.run(function(err) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Value 'x' for 'choice' doesn't conform.");
        done();
      });
    });

    it("should fail if prompt is out of range", function(done) {
      var game = getTestGame();
      var out = new OutputAccumulator();
      var pin = new PredeterminedInput([
        {choice:'1'}, {choice:'3'}
      ]);
      var clint =  new CLUserInterface(game, out, pin);
      clint.run(function(err) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Value '3' for 'choice' doesn't conform.");
        done();
      });
    });

    it("should quit on 'q'", function(done) {
      var game = getTestGame();
      var out = new OutputAccumulator();
      var pin = new PredeterminedInput([
        {choice:'1'}, {choice:'q'}
      ]);
      var clint =  new CLUserInterface(game, out, pin);
      clint.run(function(err) {
        (!!err).should.be.false;
        clint.dendryEngine.isGameOver().should.be.false;
        done();
      });
    });

    it("should dump state on 'd'", function(done) {
      var game = getTestGame();
      var out = new OutputAccumulator();
      var pin = new PredeterminedInput([
        {choice:'1'}, {choice:'d'}, {filename:''}, {choice:'q'}
      ]);
      var clint =  new CLUserInterface(game, out, pin);
      clint.run(function(err) {
        (!!err).should.be.false;
        var json = out.output[out.output.length-2];
        var state = JSON.parse(json);
        state.qualities.foo.should.equal(1);
        done();
      });
    });

    it("should run from dumped state", function(done) {
      var game = getTestGame();
      var out = new OutputAccumulator();
      var pin = new PredeterminedInput([
        {choice:'1'}, {choice:'d'}, {filename:''}, {choice:'q'}
      ]);
      var clint = new CLUserInterface(game, out, pin);
      clint.run(function(err) {
        (!!err).should.be.false;
        var json = out.output[out.output.length-2];
        var state = JSON.parse(json);

        pin = new PredeterminedInput([{choice:'q'}]);
        clint = new CLUserInterface(game, out, pin);
        clint.run(state, function(err) {
          (!!err).should.be.false;
          clint.dendryEngine.state.qualities.foo.should.equal(1);
          done();
        });
      });
    });

    it("should dump state to file", function(done) {
      var tmp = '/tmp/test-dendry.state';
      var game = getTestGame();
      var out = new OutputAccumulator();
      var pin = new PredeterminedInput([
        {choice:'1'}, {choice:'d'},
        {filename:tmp},
        {choice:'q'}
      ]);
      var clint =  new CLUserInterface(game, out, pin);
      clint.run(function(err) {
        (!!err).should.be.false;
        fs.readFile(tmp, function(err, json) {
          (!!err).should.be.false;
          var state = JSON.parse(json);
          state.qualities.foo.should.equal(1);
          done();
        });
      });
    });

    it("should report file errors", function(done) {
      var tmp = '/';
      var game = getTestGame();
      var out = new OutputAccumulator();
      var pin = new PredeterminedInput([
        {choice:'1'}, {choice:'d'},
        {filename:tmp}, {choice:'q'}
      ]);
      var clint =  new CLUserInterface(game, out, pin);
      clint.run(function(err) {
        (!!err).should.be.false;
        out.output[out.output.length-3].should.match(/'\/'/);
        out.output[out.output.length-2].should.match(
          /State not dumped, continuing\./
        );
        done();
      });
    });

    it("honors default output width", function() {
      var game = getTestGame();
      var out = new OutputAccumulator();
      var clint =  new CLUserInterface(game, out);
      clint.defaultWidth = 60;

      clint.displayContent([
        {type:'paragraph',
         content:["Two households, both alike in dignity, "+
                  "in fair Verona where we lay our scene."]
        }]);
      var text = out.output[0];
      text.should.equal(
        "Two households, both alike in dignity, "+
        "in fair Verona where\nwe lay our scene.\n"
      );
    });

  });
}());
