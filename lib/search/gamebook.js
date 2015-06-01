/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');
  var engine = require('../engine');
  var enumerate = require('./enumerate');
  var hash = require("./hash");

  var GamebookUserInterface = function() {
    this.content = [];
    this.choices = [];
    this.page = 0;
  };
  engine.UserInterface.makeParentOf(GamebookUserInterface);
  GamebookUserInterface.prototype.displayContent = function(paragraphs) {
    this.content.push(paragraphs);
  };
  GamebookUserInterface.prototype.displayChoices = function(choices) {
    this.choices = choices;
  };

  var shuffle = function(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  };

  var build = function(game, limit) {
  	var i;
    var enumeratedStates = enumerate.getStates(game, limit);

    if (enumeratedStates.hasReachedSearchLimit) {
      throw new Error(
        "Reached search limit of "+enumeratedStates.numStatesFound+" sections."
        );
    }

    // Create the mapping of state indices too paragraph numbers.
    var stateIndexToOutputIndex = [];
    for (i = 1; i < enumeratedStates.searchStates.length; ++i) {
      stateIndexToOutputIndex.push(i);
    }
    shuffle(stateIndexToOutputIndex);
    stateIndexToOutputIndex.unshift(0);

    // Compile the reverse lookup.
    var outputIndexToStateIndex = [];
    for (i = 0; i < stateIndexToOutputIndex.length; ++i) {
      outputIndexToStateIndex[stateIndexToOutputIndex[i]] = i;
    }

    // Compile in output order.
    var gamebook = [];
    for (var outputIndex = 0;
         outputIndex < outputIndexToStateIndex.length;
         ++outputIndex)
    {
      var stateIndex = outputIndexToStateIndex[outputIndex];

      var state = enumeratedStates.searchStates[stateIndex];
      var ui = new GamebookUserInterface();
      var de = new engine.DendryEngine(ui, game);
      if (state.parents.length === 0) {
        de.beginGame([0]);
      } else {
        // Go back a step and apply a choice to get us here.
        var parent = state.parents[0];
        var parentState = enumeratedStates.searchStates[parent.stateIndex];
        de.setState(_.cloneDeep(parentState.engineState));

        ui.content = [];
        ui.choices = [];
        de.choose(parent.optionIndex);
      }

      // State object
      var gamebookParagraph = {
        content: [].concat.apply([], ui.content),
        choices: []
      };

      // Compile the choices
      var k = 0;
      for (var j = 0; j < ui.choices.length; ++j) {
        var choice_j = ui.choices[j];
        if (choice_j.canChoose) {
          var choiceDestinationIndex = state.validChoiceDestinations[k++];
          gamebookParagraph.choices.push({
            choice:choice_j,
            turnTo:stateIndexToOutputIndex[choiceDestinationIndex]
          });
        } else {
          gamebookParagraph.choices.push({
            choice:choice_j
          });
        }
      }

      gamebook.push(gamebookParagraph);
    }
    return gamebook;
	};

  module.exports = {
  	build: build
  };

}());
