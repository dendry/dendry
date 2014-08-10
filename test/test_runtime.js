/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var runtime = require('../lib/runtime');

  describe("runtime", function() {

    // ---------------------------------------------------------------------

    describe("scene", function() {

      it("should start at the root scene", function() {
        var game = {
          scenes: {
            "root": {id: "root"}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        gameState.getCurrentScene().id.should.equal('root');
        gameState.isGameOver().should.be.false;
      });

      it("should allow game to be terminated", function() {
        var game = {
          scenes: {
            "root": {id: "root"}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame().gameOver();
        gameState.isGameOver().should.be.true;
        (gameState.getCurrentScene() === null).should.be.true;
      });

      it("should start at an explicit scene, if given", function() {
        var game = {
          firstScene: "foo",
          scenes: {
            "root": {id: "root", content:"Root content"},
            "foo": {id: "foo", content:"Foo content"}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame().display();
        gameState.getCurrentScene().id.should.equal('foo');
      });
    });

    // ---------------------------------------------------------------------

    describe("options", function() {
      it("should give a default option if none is available", function() {
        var game = {
          scenes: {
            "root": {id: "root"},
            "foo": {id: "foo"}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame().goToScene('foo');
        var opts = gameState.getCurrentOptions();
        opts.length.should.equal(1);
        opts[0].id.should.equal('root');
        opts[0].title.should.equal('Scene Complete');
      });

      it("should not give a default option if we're at the root", function() {
        var game = {
          scenes: {
            "root": {id: "root"},
            "foo": {id: "foo"}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        var opts = gameState.getCurrentOptions();
        opts.length.should.equal(0);
      });

      it("can choose an option and have it change scene", function() {
        var game = {
          scenes: {
            "root": {
              id: "root",
              options: { options:[
                {id:"foo", title:"To the Foo"}
              ]}
            },
            "foo": {id: "foo"}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        gameState.getCurrentScene().id.should.equal('root');
        var opts = gameState.getCurrentOptions();
        opts.length.should.equal(1);
        gameState.choose(0);
        gameState.getCurrentScene().id.should.equal('foo');
      });

      it("can't choose an invalid option", function() {
        var game = {
          scenes: {
            "root": {
              id: "root",
              options: { options:[
                {id:"foo", title:"To the Foo"}
              ]}
            }
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        var opts = gameState.getCurrentOptions();
        (function() { gameState.choose(1); }).should.throw(
          "No option at index 1, only 1 options are available."
        );
      });
    });

    describe("display", function() {
      var TestRuntimeInterface = function() {
        this.content = [];
        this.options = [];
      };
      TestRuntimeInterface.prototype.displayContent = function(content) {
        this.content.push(content);
      };
      TestRuntimeInterface.prototype.displayOptions = function(options) {
        this.options.push(options);
      };

      it("displays the initial scene content when first run", function() {
        var game = {
          scenes: {
            "root": {
              id: "root",
              content: "This is the root content.",
              options: { options:[
                {id:"foo", title:"To the Foo"}
              ]}
            }
          }
        };
        var runtimeInterface = new TestRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame().display();
        runtimeInterface.content.length.should.equal(1);
        runtimeInterface.content[0].should.equal("This is the root content.");
        runtimeInterface.options.length.should.equal(1);
        runtimeInterface.options[0].should.eql(
          [{id:"foo", title:"To the Foo"}]
        );
      });

      it("displays no content if a scene has no content", function() {
        var game = {
          scenes: {
            "root": {id: "root"}
          }
        };
        var runtimeInterface = new TestRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame().display();
        runtimeInterface.content.length.should.equal(0);
      });

      it("displays game over if we're done", function() {
        var game = {
          scenes: {
            "root": {id: "root"}
          }
        };
        var runtimeInterface = new TestRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame().gameOver().display();
        runtimeInterface.content.length.should.equal(1);
        runtimeInterface.content[0].should.equal("Game Over");
      });
    });
  });
}());
