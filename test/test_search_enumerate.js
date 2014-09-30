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
  var enumerate = require('../lib/search/enumerate');

  describe("search enumeration", function() {

    it("should return the number of scenes if no updates are used", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:[{id:'@foo'}]},
          "foo": {id: "foo", title:'Foo'}
        },
        qualities: {
          foo: {initial: 1}
        }
      };
      var count = enumerate.countStates(game, 1000);
      count.states.should.equal(2);
      count.hasReachedSearchLimit.should.be.false;
    });

    it("should not double count scenes reachable in two ways", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:[{id:'@foo'}, {id:'@bar'}]},
          "foo": {id: "foo", options:[{id:'@sun'}], title:'Foo'},
          "bar": {id: "bar", options:[{id:'@sun'}], title:'Bar'},
          "sun": {id: "sun", title:'Sun', gameOver:true}
        }
      };
      var count = enumerate.countStates(game, 1000);
      count.states.should.equal(4);
      count.hasReachedSearchLimit.should.be.false;
    });

    it("should count game over states", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:[{id:'@foo'}, {id:'@bar'}]},
          "foo": {id: "foo", options:[{id:'@dock'}], title:'Foo'},
          "bar": {id: "bar", options:[{id:'@trog'}], title:'Bar'},
          "dock": {id: "dock", title:'Dock', gameOver:true},
          "trog": {id: "trog", title:'Trog', gameOver:true}
        }
      };
      var count = enumerate.countStates(game, 1000);
      count.states.should.equal(5);
      count.gameOverStates.should.equal(2);
    });

    it("should return no goal states if goal is undefined", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:[{id:'@foo'}, {id:'@bar'}]},
          "foo": {id: "foo", options:[{id:'@dock'}], title:'Foo'},
          "bar": {id: "bar", options:[{id:'@trog'}], title:'Bar'},
          "dock": {id: "dock", title:'Dock', gameOver:true},
          "trog": {id: "trog", title:'Trog', gameOver:true}
        }
      };
      var count = enumerate.countStates(game, 1000);
      count.goalStates.should.equal(0);
    });

    it("should find goal states", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:[{id:'@foo'}, {id:'@bar'}]},
          "foo": {id: "foo", options:[{id:'@trog'}, {id:'@dock'}], title:'Foo'},
          "bar": {
            id: "bar", options:[{id:'@trog'}], title:'Bar',
            countVisits:true // Tracking this means trog has two possible states
          },
          "dock": {id: "dock", title:'Dock', gameOver:true},
          "trog": {id: "trog", title:'Trog', gameOver:true}
        }
      };
      var count = enumerate.countStates(game, 1000, 'trog');
      count.states.should.equal(6);
      count.gameOverStates.should.equal(3);
      count.goalStates.should.equal(2);
    });

    it("should return one state per visit up to max-visits", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:[{id:'@foo'}]},
          "foo": {id: "foo", title:'Foo', maxVisits:10, countVisits:true}
        },
        qualities: {
          foo: {initial: 1}
        }
      };
      var count = enumerate.countStates(game, 1000);
      count.hasReachedSearchLimit.should.be.false;
      count.states.should.equal(21);
    });

    it("should return one state per quality value up to max", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:[{id:'@foo'}]},
          "foo": {id: "foo", title:'Foo', onArrival:[
            function(state, Q) { Q.foo += 1; }
          ]}
        },
        qualities: {
          foo: {initial: 1, max: 10}
        }
      };
      var count = enumerate.countStates(game, 1000);
      count.hasReachedSearchLimit.should.be.false;
      count.states.should.equal(19);
    });

    it("should return the limit if the state is unbounded", function() {
      var game = {
        scenes: {
          "root": {id: "root", options:[{id:'@foo'}]},
          "foo": {id: "foo", title:'Foo', countVisits:true}
        },
        qualities: {
          foo: {initial: 1}
        }
      };
      var count = enumerate.countStates(game, 500);
      count.hasReachedSearchLimit.should.be.true;
      count.states.should.equal(500);
    });

  });
}());
