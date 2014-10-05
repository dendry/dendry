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

  var engine = require('../lib/engine');
  var hash = require('../lib/search/hash');

  describe("search hash", function() {

    it("should return a known value with a known state", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:[{id:'@foo'}]},
          "foo": {id: "foo", title:'Foo'}
        },
        qualities: {
          foo: {initial: 1}
        }
      };
      var ui = new engine.NullUserInterface();
      var dendryEngine = new engine.DendryEngine(ui, game);
      dendryEngine.beginGame();
      var state = dendryEngine.state;
      state.currentSceneSeed = (new engine.Random(0)).getSeed();

      var hashValue = hash.hashState(dendryEngine.state);
      hashValue.should.equal("1269a0333c03f0b1795acf6c5f820100ba0ce229");
    });

    it("should depend on quality value", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:[{id:'@foo'}]},
          "foo": {id: "foo", title:'Foo'}
        },
        qualities: {
          foo: {initial: 1}
        }
      };
      var ui = new engine.NullUserInterface();
      var dendryEngine = new engine.DendryEngine(ui, game);
      dendryEngine.beginGame();

      var initialValue = hash.hashState(dendryEngine.state);
      dendryEngine.state.qualities.foo += 1;
      var finalValue = hash.hashState(dendryEngine.state);
      initialValue.should.not.equal(finalValue);
    });

    it("should change when engine updates qualities", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:[{id:'@foo'}]},
          "foo": {id: "foo", title:'Foo', onArrival: [
            function(state, Q) { Q.foo += 1; }
          ]}
        },
        qualities: {
          foo: {initial: 1}
        }
      };
      var ui = new engine.NullUserInterface();
      var dendryEngine = new engine.DendryEngine(ui, game);
      dendryEngine.beginGame();

      var initialValue = hash.hashState(dendryEngine.state);
      var initialSceneId = dendryEngine.state.sceneId;
      dendryEngine.choose(0);
      dendryEngine.choose(0);
      var finalValue = hash.hashState(dendryEngine.state);
      var finalSceneId = dendryEngine.state.sceneId;
      initialSceneId.should.equal(finalSceneId);
      initialValue.should.not.equal(finalValue);
    });

    it("should depend on visit counts", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:[{id:'@foo'}]},
          "foo": {id: "foo", title:'Foo', countVisitsMax:2}
        }
      };
      var ui = new engine.NullUserInterface();
      var dendryEngine = new engine.DendryEngine(ui, game);
      dendryEngine.beginGame();

      var initialValue = hash.hashState(dendryEngine.state);
      var initialSceneId = dendryEngine.state.sceneId;
      dendryEngine.choose(0);
      dendryEngine.choose(0);
      var finalValue = hash.hashState(dendryEngine.state);
      var finalSceneId = dendryEngine.state.sceneId;
      initialSceneId.should.equal(finalSceneId);
      initialValue.should.not.equal(finalValue);
    });

    it("should depend on current scene", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:[{id:'@foo'}]},
          "foo": {id: "foo", title:'Foo'}
        }
      };
      var ui = new engine.NullUserInterface();
      var dendryEngine = new engine.DendryEngine(ui, game);
      dendryEngine.beginGame();

      var initialValue = hash.hashState(dendryEngine.state);
      dendryEngine.choose(0);
      var finalValue = hash.hashState(dendryEngine.state);
      initialValue.should.not.equal(finalValue);
    });

  });
}());
