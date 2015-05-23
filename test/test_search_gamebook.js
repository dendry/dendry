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
  var _ = require('lodash');
  var colors = require('colors');

  var enumerate = require("../lib/search/enumerate");
  var engine = require("../lib/engine");
  var gamebook = require('../lib/search/gamebook');
  var hash = require("../lib/search/hash");
  var text = require("../lib/ui/content/text");

      var TestUserInterface = function() {
        this.content = [];
        this.choices = [];
        this.page = 0;
      };
      engine.UserInterface.makeParentOf(TestUserInterface);
      TestUserInterface.prototype.displayContent = function(paragraphs) {
        this.content.push(paragraphs);
      };
      TestUserInterface.prototype.displayChoices = function(choices) {
        this.choices = choices;
      };
      TestUserInterface.prototype.newPage = function() {
        this.content = [];
        this.page++;
      };

  function shuffle(array) {
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
  }

  describe("gamebook", function() {

    it("should return a known value with a known state", function() {
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

      var result = enumerate.getStates(game);

      // Create the mapping of state indices too paragraph numbers.
      var stateIndexToOutputIndex = [];
      for (var i = 1; i < result.searchStates.length; ++i) {
        stateIndexToOutputIndex.push(i);
      }
      shuffle(stateIndexToOutputIndex);
      stateIndexToOutputIndex.unshift(0);

      // Compile the reverse lookup.
      var outputIndexToStateIndex = [];
      for (var i = 0; i < stateIndexToOutputIndex.length; ++i) {
        outputIndexToStateIndex[stateIndexToOutputIndex[i]] = i;
      }

      // Display in output order.
      for (var outputIndex = 0;
           outputIndex < outputIndexToStateIndex.length;
           ++outputIndex)
      {
        var stateIndex = outputIndexToStateIndex[outputIndex];
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        console.log(outputIndex+1);
        console.log("");

        var state = result.searchStates[stateIndex];
        var ui = new TestUserInterface()
        var de = new engine.DendryEngine(ui, game);
        if (state.parents.length == 0) {
          de.beginGame([0]);
        } else {
          // Go back a step and apply a choice to get us here.
          var parent = state.parents[0];
          var parentState = result.searchStates[parent.stateIndex];
          de.setState(_.cloneDeep(parentState.engineState));

          ui.content = [];
          ui.choices = [];
          de.choose(parent.optionIndex);
        }
        // Check the state is the one expected.
        hash.hashState(de.state).should.eql(hash.hashState(state.engineState));

        // Display the content
        for (var j = 0; j < ui.content.length; ++j) {
          console.log(text.convert(ui.content[j], 76));
        }
        
        // Display the choices
        var k = 0;
        for (var j = 0; j < ui.choices.length; ++j) {
          var choice_j = ui.choices[j];
          var str = text.convertLine(choice_j.title);
          if (choice_j.canChoose) {
            var choiceDestinationIndex = state.validChoiceDestinations[k++];
            var choiceDestination =
              stateIndexToOutputIndex[choiceDestinationIndex] + 1;
            console.log("-- "+str+" (turn to "+choiceDestination+")");
          } else {
            console.log("-- "+str+" [unavailable]".dim);
          }
          if (choice_j.subtitle) {
            console.log("   "+text.convertLine(choice_j.subtitle).dim);
          }
        }
        console.log("");
      }
    });

  });
}());
