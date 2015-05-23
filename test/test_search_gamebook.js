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

  var gamebook = require('../lib/search/gamebook');

  describe("gamebook", function() {

    it("should have root as first state", function() {
      var game = {
        scenes: {
          "root": {
            id: "root", options:[
              {id:'@sun', chooseIf: function() { return false; }},
              {id:'@foo'},
              {id:'@bar'}
            ], 
            content: "Root Content"
          },
          "foo": {
            id:"foo", title:'Foo', gameOver:true,
            content: "This is the end of the road, I'm afraid."
          },
          "bar": {
            id:"bar", title:'Bar',
            content: "Passing through Bar...", options:[{id:'@sun'}]
          },
          "sun": {
            content: "This is sun content!",
            subtitle:"Go for the sun!",
            unavailableSubtitle:"You can't go for the sun yet!",
            id:"sun", title:'Sun'
          }
        },
        qualities: {
          foo: {initial: 1}
        }
      };
      var book = gamebook.build(game);
      book.length.should.equal(4);
      book[0].content.should.eql([{
        'type':'paragraph',
        'content':'Root Content'
      }]);
    });

  });
}());
