/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  'use strict';

  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var engine = require('../lib/engine');
  var enumerate = require('../lib/search/enumerate');

  describe('search enumeration', function() {

    it('should return the number of scenes if no updates are used', function() {
      var game = {
        scenes: {
          'root': {id: 'root', options:[{id:'@foo'}]},
          'foo': {id: 'foo', title:'Foo'}
        },
        qualities: {
          foo: {initial: 1}
        }
      };
      var count = enumerate.countStates(game);
      count.numStatesFound.should.equal(2);
      count.hasReachedSearchLimit.should.be.false;
    });

    it('should not double count scenes reachable in two ways', function() {
      var game = {
        scenes: {
          'root': {id: 'root', options:[{id:'@foo'}, {id:'@bar'}]},
          'foo': {id: 'foo', options:[{id:'@sun'}], title:'Foo'},
          'bar': {id: 'bar', options:[{id:'@sun'}], title:'Bar'},
          'sun': {id: 'sun', title:'Sun', gameOver:true}
        }
      };
      var count = enumerate.countStates(game);
      count.numStatesFound.should.equal(4);
      count.hasReachedSearchLimit.should.be.false;
    });

    it('should double count scenes with intermediate go to', function() {
      var game = {
        scenes: {
          'root': {id: 'root', options:[{id:'@foo'}, {id:'@bar'}]},
          'foo': {id: 'foo', goTo:[{id:'sun'}], title:'Foo'},
          'bar': {id: 'bar', options:[{id:'@sun'}], title:'Bar'},
          'sun': {id: 'sun', title:'Sun', gameOver:true}
        }
      };
      var count = enumerate.countStates(game);
      count.numStatesFound.should.equal(4);
      count.hasReachedSearchLimit.should.be.false;
    });

    it('should allow options to be not choosable', function() {
      var game = {
        scenes: {
          'root': {id: 'root', options:[
            {id:'@foo', chooseIf: function() { return false; }},
            {id:'@bar'}
          ]},
          'foo': {id: 'foo', options:[{id:'@sun'}], title:'Foo'},
          'bar': {id: 'bar', options:[{id:'@sun'}], title:'Bar'},
          'sun': {id: 'sun', title:'Sun', gameOver:true}
        }
      };
      var count = enumerate.countStates(game);
      count.numStatesFound.should.equal(3);
      count.hasReachedSearchLimit.should.be.false;
    });

    it('should use seed for random choices', function() {
      var game = {
        scenes: {
          'root': {id: 'root', goTo:[{id:'foo'}, {id:'bar'}]},
          'foo': {id: 'foo', gameOver:true, title:'Foo'},
          'bar': {id: 'bar', options:[{id:'@sun'}], title:'Bar'},
          'sun': {id: 'sun', gameOver:true, title:'Sun'}
        }
      };
      var count;
      // By experiment we know that these seeds make different random choices
      // in root's go-to. If the PRNG changes, this would have to change.
      count = enumerate.countStates(game, 10, undefined, [0]);
      count.numStatesFound.should.equal(2);

      count = enumerate.countStates(game, 10, undefined, [2]);
      count.numStatesFound.should.equal(1);
    });

    it('should count game over states', function() {
      var game = {
        scenes: {
          'root': {id: 'root', options:[{id:'@foo'}, {id:'@bar'}]},
          'foo': {id: 'foo', options:[{id:'@dock'}], title:'Foo'},
          'bar': {id: 'bar', options:[{id:'@trog'}], title:'Bar'},
          'dock': {id: 'dock', title:'Dock', gameOver:true},
          'trog': {id: 'trog', title:'Trog', gameOver:true}
        }
      };
      var count = enumerate.countStates(game);
      count.numStatesFound.should.equal(5);
      count.numGameOverStatesFound.should.equal(2);
    });

    it('should count no goal states if goal is undefined', function() {
      var game = {
        scenes: {
          'root': {id: 'root', options:[{id:'@foo'}, {id:'@bar'}]},
          'foo': {id: 'foo', options:[{id:'@dock'}], title:'Foo'},
          'bar': {id: 'bar', options:[{id:'@trog'}], title:'Bar'},
          'dock': {id: 'dock', title:'Dock', gameOver:true},
          'trog': {id: 'trog', title:'Trog', gameOver:true}
        }
      };
      var count = enumerate.countStates(game);
      count.numGoalStatesFound.should.equal(0);
    });

    it('should find goal states', function() {
      var game = {
        scenes: {
          'root': {id: 'root', options:[{id:'@foo'}, {id:'@bar'}]},
          'foo': {id: 'foo', options:[{id:'@trog'}, {id:'@dock'}], title:'Foo'},
          'bar': {
            id: 'bar', options:[{id:'@trog'}], title:'Bar',
            countVisitsMax:1 // Tracking this means trog has two possible states
          },
          'dock': {id: 'dock', title:'Dock', gameOver:true},
          'trog': {id: 'trog', title:'Trog', gameOver:true}
        }
      };
      var count = enumerate.countStates(game, 1000, 'trog');
      count.numStatesFound.should.equal(6);
      count.numGameOverStatesFound.should.equal(3);
      count.numGoalStatesFound.should.equal(2);
    });

    it('should count one state per visit up to max-visits', function() {
      var game = {
        scenes: {
          'root': {id: 'root', options:[{id:'@foo'}]},
          'foo': {id: 'foo', title:'Foo', maxVisits:10, countVisitsMax:10}
        },
        qualities: {
          foo: {initial: 1}
        }
      };
      var count = enumerate.countStates(game, 1000);
      count.hasReachedSearchLimit.should.be.false;
      count.numStatesFound.should.equal(21);
    });

    it('should count one state per visit up to count-visits-max', function() {
      var game = {
        scenes: {
          'root': {id: 'root', options:[{id:'@foo'}]},
          'foo': {id: 'foo', title:'Foo', countVisitsMax:10}
        },
        qualities: {
          foo: {initial: 1}
        }
      };
      var count = enumerate.countStates(game, 1000);
      count.hasReachedSearchLimit.should.be.false;
      count.numStatesFound.should.equal(21);
    });

    it('should count one state per quality value up to max', function() {
      var game = {
        scenes: {
          'root': {id: 'root', options:[{id:'@foo'}]},
          'foo': {id: 'foo', title:'Foo', onArrival:[
            function(state, Q) { Q.foo += 1; }
          ]}
        },
        qualities: {
          foo: {initial: 1, max: 10}
        }
      };
      var count = enumerate.countStates(game, 1000);
      count.hasReachedSearchLimit.should.be.false;
      count.numStatesFound.should.equal(19);
    });

    it('should return one state per quality value up to max', function() {
      var game = {
        scenes: {
          'root': {id: 'root', options:[{id:'@foo'}]},
          'foo': {id: 'foo', title:'Foo', onArrival:[
            function(state, Q) { Q.foo += 1; }
          ]}
        },
        qualities: {
          foo: {initial: 1, max: 4}
        }
      };
      var result = enumerate.getStates(game);
      result.hasReachedSearchLimit.should.be.false;
      result.numStatesFound.should.equal(7);
      var numStatesWithFoo = [0, 0, 0, 0, 0, 0];
      for (var i = 0; i < result.searchStates.length; ++i) {
        var state = result.searchStates[i].engineState;
        numStatesWithFoo[state.qualities.foo]++;
      }
      numStatesWithFoo.should.eql([0, 1, 2, 2, 2, 0]);
    });

    it('should keep track of where options lead to', function() {
      var game = {
        scenes: {
          'root': {
            id: 'root', title: 'Root',
            options:[{id:'@foo'}, {id:'@bar'}]
          },
          'foo': {
            id: 'foo', title: 'Foo',
            options:[{id:'@bar'}, {id:'@root'}, {id:'@end'}]
          },
          'bar': {
            id: 'bar', title: 'Bar',
            options:[{id:'@end'}]
          },
          'end': {
            id: 'end', title: 'End',
            gameOver:true
          }
        }
      };
      var result = enumerate.getStates(game);
      result.searchStates.length.should.equal(4);

      result.searchStates[0].engineState.sceneId.should.equal('root');
      result.searchStates[0].validChoiceDestinations.should.eql([1, 2]);

      result.searchStates[1].engineState.sceneId.should.equal('foo');
      result.searchStates[1].validChoiceDestinations.should.eql([2, 0, 3]);

      result.searchStates[2].engineState.sceneId.should.equal('bar');
      result.searchStates[2].validChoiceDestinations.should.eql([3]);

      result.searchStates[3].engineState.sceneId.should.equal('end');
      result.searchStates[3].validChoiceDestinations.should.eql([]);
      result.searchStates[3].engineState.gameOver.should.be.true;
    });

    it('should keep track of where options lead to with visits', function() {
      var game = {
        scenes: {
          'root': {
            id: 'root', title: 'Root',
            options:[{id:'@foo'}, {id:'@bar'}]
          },
          'foo': {
            id: 'foo', title: 'Foo',
            options:[{id:'@bar'}, {id:'@root'}, {id:'@end'}],
            countVisitsMax:2
          },
          'bar': {
            id: 'bar', title: 'Bar',
            options:[{id:'@end'}]
          },
          'end': {
            id: 'end', title: 'End',
            gameOver:true
          }
        }
      };
      var result = enumerate.getStates(game);
      result.searchStates.length.should.equal(11);
      var sceneCounts = {'root':0, 'foo':0, 'bar':0, 'end':0};
      for (var i = 0; i < result.searchStates.length; ++i) {
        sceneCounts[result.searchStates[i].engineState.sceneId]++;
      }
      sceneCounts.should.eql({'root':3, 'foo':2, 'bar':3, 'end':3});
    });

    it('should count the limit if the state is unbounded', function() {
      var game = {
        scenes: {
          'root': {id: 'root', options:[{id:'@foo'}]},
          'foo': {id: 'foo', title:'Foo', countVisitsMax:500}
        },
        qualities: {
          foo: {initial: 1}
        }
      };
      var count = enumerate.countStates(game, 500);
      count.hasReachedSearchLimit.should.be.true;
      count.numStatesFound.should.equal(500);
    });

  });
}());
