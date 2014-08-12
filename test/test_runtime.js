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

    it("should allow game to be terminated", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:{options:[{id:'@foo', title:'Foo'}]}},
            "foo": {id: "foo"}
        }
      };
      var runtimeInterface = new runtime.NullRuntimeInterface();
      var gameState = new runtime.GameState(runtimeInterface, game);
      gameState.beginGame().gameOver();
      gameState.isGameOver().should.be.true;
    });

    // ---------------------------------------------------------------------

    describe("scene", function() {

      it("should start at the root scene", function() {
        var game = {
          scenes: {
            "root": {id: "root", content:"Root content",
                    options:{options:[{id:"@foo", title:"Foo"}]}},
            "foo": {id: "foo", content:"Foo content"}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        gameState.getCurrentScene().id.should.equal('root');
        gameState.isGameOver().should.be.false;
      });

      it("should explicitly allow game to be terminated", function() {
        var game = {
          scenes: {
            "root": {id: "root", options:{options:[{id:'@foo', title:'Foo'}]}},
            "foo": {id: "foo", gameOver:true}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame().choose(0);
        gameState.isGameOver().should.be.true;
      });

      it("terminates if the root has no choices", function() {
        var game = {
          scenes: {
            "root": {id: "root"}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        gameState.isGameOver().should.be.true;
      });

      it("should start at an explicit scene, if given", function() {
        var game = {
          firstScene: "foo",
          scenes: {
            "root": {id: "root", content:"Root content"},
            "foo": {id: "foo", content:"Foo content",
                    options:{options:[{id:"@root", title:"Root"}]}}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        gameState.getCurrentScene().id.should.equal('foo');
      });

      it("should honor goto, if given", function() {
        var game = {
          scenes: {
            "root": {id: "root", content:"Root content", goTo:"foo"},
            "foo": {id: "foo", content:"Foo content"}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        gameState.getCurrentScene().id.should.equal('foo');
      });
    });

    // ---------------------------------------------------------------------

    describe("choices", function() {
      it("should give a default choice if none is available", function() {
        var game = {
          scenes: {
            "root": {id: "root"},
            "foo": {id: "foo"}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame().goToScene('foo');
        var choices = gameState.getCurrentChoices();
        choices.length.should.equal(1);
        choices[0].id.should.equal('root');
        choices[0].title.should.equal('Scene Complete');
      });

      it("should not give a default choice if we're at the root", function() {
        var game = {
          scenes: {
            "root": {id: "root"},
            "foo": {id: "foo"}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        var choices = gameState.getCurrentChoices();
        (choices === null).should.be.true;
      });

      it("can choose an choice and have it change scene", function() {
        var game = {
          scenes: {
            "root": {
              id: "root",
              options: { options:[
                {id:"@foo", title:"To the Foo"}
              ]}
            },
            "foo": {id: "foo"}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        gameState.getCurrentScene().id.should.equal('root');
        var choices = gameState.getCurrentChoices();
        choices.length.should.equal(1);
        gameState.choose(0);
        gameState.getCurrentScene().id.should.equal('foo');
      });

      it("should use the scene title if no option title is given", function() {
        var game = {
          scenes: {
            "root": {
              id: "root",
              options: { options:[ {id:"@foo"} ]}
            },
            "foo": {id: "foo", title: "The Foo"}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        var choices = gameState.getCurrentChoices();
        choices.length.should.equal(1);
        choices[0].title.should.equal("The Foo");
      });

      it("can generate choices from tags", function() {
        var game = {
          scenes: {
            "root": {
              id: "root",
              options: { options:[ {id:"#alpha"} ]}
            },
            "foo": {id: "foo", title: "The Foo"},
            "bar": {id: "bar", title: "The Bar"}
          },
          tagLookup: {
            alpha: {foo:true, bar:true}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        var choices = gameState.getCurrentChoices();
        choices.length.should.equal(2);
      });

      it("doesn't override explicit choices from a tag", function() {
        var game = {
          scenes: {
            "root": {
              id: "root",
              options: { options:[
                {id:"@foo", title:"Foo Link"},
                {id:"#alpha"}
              ]}
            },
            "foo": {id: "foo", title: "The Foo"},
            "bar": {id: "bar", title: "The Bar"}
          },
          tagLookup: {
            alpha: {foo:true, bar:true}
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        var choices = gameState.getCurrentChoices();
        choices.length.should.equal(2);
        var which = (choices[0].id === 'foo') ? 0 : 1;
        choices[which].title.should.equal("Foo Link");
      });

      it("can't choose an invalid choice", function() {
        var game = {
          scenes: {
            "root": {
              id: "root",
              options: { options:[
                {id:"@foo", title:"To the Foo"}
              ]}
            },
            "foo": {
              id: "foo",
              options: { options:[
                {id:"@root", title:"Back to the Root"}
              ]}
            }
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        (function() { gameState.choose(1); }).should.throw(
          "No choice at index 1, only 1 choices are available."
        );
      });

      it("removes a choice visited too much", function() {
        var game = {
          scenes: {
            "root": {
              id: "root",
              options: { options:[
                {id:"@foo", title:"To the Foo"},
                {id:"@bar", title:"To the Bar"}
              ]}
            },
            "foo": {
              id: "foo",
              maxVisits: 1,
              options: { options:[
                {id:"@root", title:"Back to the Root"}
              ]}
            },
            "bar": {
              id: "bar",
              options: { options:[
                {id:"@root", title:"Back to the Root"}
              ]}
            }
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        gameState.getCurrentScene().id.should.equal('root');
        gameState.getCurrentChoices().length.should.equal(2);
        gameState.choose(0).choose(0);
        gameState.getCurrentScene().id.should.equal('root');
        gameState.getCurrentChoices().length.should.equal(1);
      });

      it("ends the game when no valid choices remain", function() {
        var game = {
          scenes: {
            "root": {
              id: "root",
              options: { options:[
                {id:"@foo", title:"To the Foo"}
              ]}
            },
            "foo": {
              id: "foo",
              maxVisits: 1,
              options: { options:[
                {id:"@root", title:"Back to the Root"}
              ]}
            }
          }
        };
        var runtimeInterface = new runtime.NullRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        gameState.getCurrentChoices().length.should.equal(1);
        gameState.choose(0).choose(0);
        gameState.isGameOver().should.be.true;
      });
    });

    describe("display", function() {
      var TestRuntimeInterface = function() {
        this.content = [];
        this.choices = [];
      };
      TestRuntimeInterface.prototype.displayContent = function(content) {
        this.content.push(content);
      };
      TestRuntimeInterface.prototype.displayChoices = function(choices) {
        this.choices.push(choices);
      };

      it("displays the initial scene content when first begun", function() {
        var game = {
          scenes: {
            "root": {
              id: "root",
              content: "This is the root content.",
              options: { options:[
                {id:"@foo", title:"To the Foo"}
              ]},
            },
            "foo": {id:"foo"}
          }
        };
        var runtimeInterface = new TestRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        runtimeInterface.content.length.should.equal(1);
        runtimeInterface.content[0].should.equal("This is the root content.");
        runtimeInterface.choices.length.should.equal(1);
        runtimeInterface.choices[0].should.eql(
          [{id:"foo", title:"To the Foo"}]
        );
      });

      it("displays no content if a scene has no content", function() {
        var game = {
          scenes: {
            "root": {id: "root", options:{options:[{id:'@foo', title:'Foo'}]}},
            "foo": {id: "foo"}
          }
        };
        var runtimeInterface = new TestRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame();
        runtimeInterface.content.length.should.equal(0);
      });

      it("displays game over if we're done", function() {
        var game = {
          scenes: {
            "root": {id:"root", options:{options:[{id:"@foo", title:"Foo"}]}},
            "foo": {id:"foo", content:"Foo content"}
          }
        };
        var runtimeInterface = new TestRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame().gameOver();
        runtimeInterface.content.length.should.equal(1);
        runtimeInterface.content[0].should.equal("Game Over");
      });

      it("displays game over scene content", function() {
        var game = {
          scenes: {
            "root": {id:"root", options:{options:[{id:"@foo", title:"Foo"}]}},
            "foo": {id:"foo", content:"Foo content", gameOver:true}
          }
        };
        var runtimeInterface = new TestRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame().choose(0);
        runtimeInterface.content.length.should.equal(2);
        runtimeInterface.content[0].should.equal("Foo content");
        runtimeInterface.content[1].should.equal("Game Over");
        gameState.isGameOver().should.be.true;
      });

      it("displays content from scene with go-to", function() {
        var game = {
          scenes: {
            "root": {id:"root", options:{options:[{id:"@foo", title:"Foo"}]}},
            "foo": {id:"foo", content:"Foo content", goTo:"bar"},
            "bar": {id:"bar", content:"Bar content"}
          }
        };
        var runtimeInterface = new TestRuntimeInterface();
        var gameState = new runtime.GameState(runtimeInterface, game);
        gameState.beginGame().choose(0);
        runtimeInterface.content.length.should.equal(2);
        runtimeInterface.content[0].should.equal("Foo content");
        runtimeInterface.content[1].should.equal("Bar content");
      });
    });
  });
}());
