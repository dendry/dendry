/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');
  var hash = require('./hash');
  var engine = require('../engine');

  var countStates = function(game, limit, goalSceneId, rndSeeds) {
    rndSeeds = (rndSeeds !== undefined) ? rndSeeds : [0];

    var count = 0;
    var gameOvers = 0;
    var goals = 0;

    var seen = {};
    var choiceStateStack = [];
    var choiceOptionStack = [];

    var ui = new engine.NullUserInterface();
    var de = new engine.DendryEngine(ui, game);
    de.beginGame(rndSeeds);

    var seeState = function() {
      var state = de.state;
      var stateHash = hash.hashState(state);
      if (!seen[stateHash]) {
        // This is a new state
        ++count;
        seen[stateHash] = true;

        if (state.sceneId === goalSceneId) {
          ++goals;
        }
        if (state.gameOver) {
          ++gameOvers;
        } else {
          // We have choices.
          choiceStateStack.push(state);
          choiceOptionStack.push(0);
        }
      }
    };

    var processNext = function() {
      var beforeState = _.cloneDeep(_.last(choiceStateStack));
      var option = choiceOptionStack.pop();

      // Get the resulting state from making this choice.
      de.setState(beforeState);
      var numChoices = de.getCurrentChoices().length;
      de.choose(option);

      // Pop this state from the stack if we're done.
      ++option;
      if (option >= numChoices) {
        // We've already popped from the option stack.
        choiceStateStack.pop();
      } else {
        // We've popped from the option stack, add it back.
        choiceOptionStack.push(option);
      }

      // Process this resulting state.
      seeState();
    };

    seeState();
    while(choiceStateStack.length > 0 && count < limit) {
      processNext();
    }
    return {
      states: count,
      goalStates: goals,
      gameOverStates: gameOvers,
      hasReachedSearchLimit: (count >= limit)
    };
  };

  module.exports = {
    countStates: countStates
  };

}());
