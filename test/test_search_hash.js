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

  });
}());
