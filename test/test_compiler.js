/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');
  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var compiler = require('../lib/compiler');

  describe("game compiler", function() {

    it("should compile a simple two-scene game", function(done) {
      var info = {
        title: "My Game",
        author: "Jo Doe"
      };
      var listOfScenes = [
        {id: "root", title:"Back to root", content: "Root content", options: {
          options:[{id:"@foo", title:"Foo link"}]
        }},
        {id: "foo", title:"The Foo", content:"Foo content", options: {
          options:[{id:"@foo", title:"Foo link"}]
        }}
      ];
      compiler.compile(info, listOfScenes, function(err, game) {
        (!!err).should.be.false;
        game.scenes.foo.title.should.equal('The Foo');
        done();
      });
    });

    it("should index scene tags", function(done) {
      var info = {
        title: "My Game",
        author: "Jo Doe"
      };
      var listOfScenes = [
        {id: "root", title:"Back to root", content: "Root content",
         tags: ["alpha", "bravo"],
         options: {
          options:[{id:"@foo", title:"Foo link"}]
        }},
        {id: "foo", title:"The Foo", content:"Foo content",
         tags: ["alpha", "charlie"],
         options: {
          options:[{id:"@foo", title:"Foo link"}]
        }}
      ];
      compiler.compile(info, listOfScenes, function(err, game) {
        (!!err).should.be.false;
        game.tagLookup.alpha.should.eql({root: true, foo: true});
        game.tagLookup.bravo.should.eql({root: true});
        game.tagLookup.charlie.should.eql({foo: true});
        done();
      });
    });

  });
}());
