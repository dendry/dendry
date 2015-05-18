/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');
  var assert = require('assert');
  var hash = require('./hash');
  var engine = require('../engine');

  var StateEnumerator = function(game, ui) {
    this.game = game;
    this.limit = 10000;
    this.rndSeeds = [0];
    this.storeStates = false;

    this.ui = ui || new engine.NullUserInterface();
  };

  StateEnumerator.prototype.enumerate = function() {
    var numStatesFound = 0;
    var numGameOverStatesFound = 0;
    var numGoalStatesFound = 0;
    var searchStates = [];

    var statesSeen = {};
    var choiceStateStack = [];
    var choiceParentStack = [];
    var choiceOptionStack = [];

    var de = new engine.DendryEngine(this.ui, this.game);
    de.beginGame(this.rndSeeds);

    var that = this;

    var seeState = function(parentIndex, optionIndex) {
      var engineState = de.state;
      var stateHash = hash.hashState(engineState);
      var stateIndex = statesSeen[stateHash];
      if (stateIndex === undefined) {
        // This is a new state
        stateIndex = numStatesFound;
        statesSeen[stateHash] = stateIndex;
        ++numStatesFound;

        if (engineState.sceneId === that.goalSceneId) {
          ++numGoalStatesFound;
        }
        if (engineState.gameOver) {
          ++numGameOverStatesFound;
        } else {
          // We have choices.
          choiceStateStack.push(engineState);
          choiceParentStack.push(numStatesFound);
          choiceOptionStack.push(0);
        }

        // Store it if we're tracking searchStates
        // We needs to store the engine state, the state number,
        // and we need to notify the parent that this option
        // leads to this state.
        if (that.storeStates) {
          searchStates.push({
            stateIndex: stateIndex,
            parents: [],
            options: [],
            engineState: engineState
          });
        }
      } 

      if (that.storeStates && parentIndex !== undefined) {
        assert(
          searchStates[parentIndex].options.length === optionIndex,
          "New option index doesn't match number of options already found"
        );
        searchStates[parentIndex].options.push(stateIndex);
        searchStates[stateIndex].parents.push({
          stateIndex:parentIndex, 
          optionIndex:optionIndex
        });
      }
    };

    var processNext = function() {
      var beforeState = _.cloneDeep(_.last(choiceStateStack));

      var parentNumber = choiceParentStack[choiceParentStack.length-1];
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
        choiceParentStack.pop();
      } else {
        // We've popped from the option stack, add it back.
        choiceOptionStack.push(option);
      }

      // Process this resulting state.
      seeState(parentNumber-1, option-1);
    };

    seeState();
    while(choiceStateStack.length > 0 && numStatesFound < this.limit) {
      processNext();
    }
    var result = {
      numStatesFound: numStatesFound,
      numGoalStatesFound: numGoalStatesFound,
      numGameOverStatesFound: numGameOverStatesFound,
      hasReachedSearchLimit: (numStatesFound >= this.limit)
    };
    if (this.storeStates) result.searchStates = searchStates;
    return result;
  };

  var _makeEnumerator = function(game, limit, goalSceneId, rndSeeds) {
    var enumerator = new StateEnumerator(game);
    if (limit !== undefined) enumerator.limit = limit;
    if (goalSceneId !== undefined) enumerator.goalSceneId = goalSceneId;
    if (rndSeeds !== undefined) enumerator.rndSeeds = rndSeeds;
    return enumerator;
  };

  var countStates = function(game, limit, goalSceneId, rndSeeds) {
    var enumerator = _makeEnumerator(game, limit, goalSceneId, rndSeeds);
    enumerator.storeStates = false;
    return enumerator.enumerate();
  };

  var getStates = function(game, limit, goalSceneId, rndSeeds) {
    var enumerator = _makeEnumerator(game, limit, goalSceneId, rndSeeds);
    enumerator.storeStates = true;
    return enumerator.enumerate();
  };

  module.exports = {
    StateEnumerator: StateEnumerator,
    countStates: countStates,
    getStates: getStates
  };

}());
