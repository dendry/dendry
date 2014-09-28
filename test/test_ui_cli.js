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
  var fs = require('fs');
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
            order: 10,
            onArrival: [function(state, Q) { Q.foo = 1; }],
            content: "This is the foo content.",
            options:[{id:"@root", title:"Return"}]
          },
          "bar": {
            id: "bar",
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

    // ---------------------------------------------------------------------

    describe("content output", function() {
      it("should wrap text output", function() {
        var game = getTestGame();
        var out = new OutputAccumulator();
        var clint =  new CLUserInterface(game, out);
        clint.defaultWidth = 60;

        clint.displayContent([
          {type:'paragraph',
           content:["Two households, both alike in dignity, "+
                    "in fair Verona where we lay our scene."]
           }], []);
        var text = out.output[0];
        text.should.equal(
          "Two households, both alike in dignity, "+
          "in fair Verona where\nwe lay our scene.\n"
        );
      });

      it("should bolden titles", function() {
        var game = getTestGame();
        var out = new OutputAccumulator();
        var clint =  new CLUserInterface(game, out);
        clint.defaultWidth = 60;

        clint.displayContent([
          {type:'heading',
           content:["The title."]
           }], []);
        var text = out.output[0];
        text.should.equal("The title.".bold + "\n");
      });

      it("should bolden strong emphasis", function() {
        var game = getTestGame();
        var out = new OutputAccumulator();
        var clint =  new CLUserInterface(game, out);
        clint.defaultWidth = 60;

        clint.displayContent([
          {type:"paragraph",
           content:[
             {type:'emphasis-1',
              content:["First."]},
             {type:'emphasis-2',
              content:["Second."]}
           ]}
        ], []);
        var text = out.output[0];
        text.should.equal("First. "+"Second.".bold + "\n");
      });

      it("should grey hidden text", function() {
        var game = getTestGame();
        var out = new OutputAccumulator();
        var clint =  new CLUserInterface(game, out);
        clint.defaultWidth = 60;

        clint.displayContent([
          {type:"paragraph",
           content:[
             {type:'hidden',
              content:["Hide me."]}
           ]}
        ], []);
        var text = out.output[0];
        text.should.equal("Hide me.".grey + "\n");
      });

      it("should include conditionals with passing predicates", function() {
        var game = getTestGame();
        var out = new OutputAccumulator();
        var clint =  new CLUserInterface(game, out);
        clint.defaultWidth = 60;

        clint.displayContent([
          {type:"paragraph",
           content:[
             {type:'conditional',
              predicate: 0,
              content:["Show me."]}
           ]}
        ], [true]);
        var text = out.output[0];
        text.should.equal("Show me." + "\n");
      });

      it("should elide conditionals with failing predicates", function() {
        var game = getTestGame();
        var out = new OutputAccumulator();
        var clint =  new CLUserInterface(game, out);
        clint.defaultWidth = 60;

        clint.displayContent([
          {type:"paragraph",
           content:[
             {type:'conditional',
              predicate: 0,
              content:["Hide me."]}
           ]}
        ], [false]);
        var text = out.output[0];
        text.should.equal("\n");
      });

      it("should separate paragraphs of different types", function() {
        var game = getTestGame();
        var out = new OutputAccumulator();
        var clint =  new CLUserInterface(game, out);
        clint.defaultWidth = 60;

        clint.displayContent([
          {type:'heading',
           content:["One."]},
          {type:'paragraph',
           content:["Two."]},
          {type:'quotation',
           content:["Three."]},
          {type:'paragraph',
           content:["Four."]},
          {type:'attribution',
           content:["Five."]},
          {type:'paragraph',
           content:["Six."]}
        ], []);
        var text = out.output[0];
        text.should.equal("One.".bold+"\n\nTwo.\n\n    Three.\n\n"+
                          "Four.\n\n        Five.\n\nSix.\n");
      });

      it("should not separate quote and attribution", function() {
        var game = getTestGame();
        var out = new OutputAccumulator();
        var clint =  new CLUserInterface(game, out);
        clint.defaultWidth = 60;

        clint.displayContent([
          {type:'quotation',
           content:["Quote."]},
          {type:'attribution',
           content:["Byline."]}
        ], []);
        var text = out.output[0];
        text.should.equal("    Quote.\n        Byline.\n");
      });

      it("should separate hrule from both sides", function() {
        var game = getTestGame();
        var out = new OutputAccumulator();
        var clint =  new CLUserInterface(game, out);
        clint.defaultWidth = 60;

        clint.displayContent([
          {type:'paragraph', content:["One."]},
          {type:'hrule'},
          {type:'paragraph', content:["Two."]}
        ], []);
        var text = out.output[0];
        text.should.equal("One.\n\n---\n\nTwo.\n");
      });


      it("should break lines where needed", function() {
        var game = getTestGame();
        var out = new OutputAccumulator();
        var clint =  new CLUserInterface(game, out);
        clint.defaultWidth = 60;

        clint.displayContent([
          {type:'paragraph', content:[
            "One.",
            {type:'line-break'},
            "Two."
          ]}
        ], []);
        var text = out.output[0];
        text.should.equal("One.\nTwo.\n");
      });

      it("runs predicates to determine conditional visibility", function() {
        var game = {
          title: "Game Title",
          author: "Game Author",
          scenes: {
            "root": {
              id:"root",
              content:{paragraphs:[
                {type:'paragraph', content:[
                  {type:'conditional', predicate:0, content:["Show me."]},
                  {type:'conditional', predicate:1, content:["Hide me."]}
                ]}
              ], stateDependencies:[
                function(state, Q) { return true; },
                function(state, Q) { return false; }
              ]}
            }
          }
        };
        var out = new OutputAccumulator();
        var clint =  new CLUserInterface(game, out);
        clint.dendryEngine.beginGame();
        out.output[4].should.eql("Show me.\n");
      });

    }); // end describe

  });
}());
