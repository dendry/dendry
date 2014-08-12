/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var assert = require('assert');
  var _ = require('lodash');

  // Objects with this interface are passed to a game state to have it
  // display content.
  var RuntimeInterface = function() {};
  RuntimeInterface.prototype.displayContent = function(content) {};
  RuntimeInterface.prototype.displayChoices = function(choices) {};
  var NullRuntimeInterface = RuntimeInterface;

  // A game state is given a runtime interface, the game and the
  // current game state (can be omitted). GameState from the user
  // is given to the object to move the story on.
  var GameState = function(runtime, game, state) {
    this.runtime = runtime;
    this.game = game;
    this.state = state;
  };
  GameState.prototype.display = function() {
    assert.ok(this.state !== undefined);
    this.displayCurrentScene();
    return this;
  };
  GameState.prototype.displayCurrentScene = function() {
    if (this.isGameOver()) {
      this.displayGameOver();
    } else {
      this.displayScene();
    }
    return this;
  };
  GameState.prototype.displayGameOver = function() {
    this.runtime.displayContent("Game Over");
    return this;
  };
  GameState.prototype.displayScene = function() {
    var scene = this.getCurrentScene();
    assert.ok(scene);
    if (scene.content) this.runtime.displayContent(scene.content);

    var choices = this.getCurrentChoices();
    assert.ok(choices);
    this.runtime.displayChoices(choices);

    return this;
  };
  GameState.prototype.choose = function(choiceIndex) {
    var choices = this.state.choices;
    assert.ok(choices);
    if (choices.length <= choiceIndex) {
      throw new Error("No choice at index "+choiceIndex+", only "+
                      choices.length+" choices are available.");
    }
    var choice = choices[choiceIndex];
    var id = choice.id;

    // Commit the choice
    delete this.state.choices;
    this.state.turn++;
    this.goToScene(choice.id);

    return this;
  };
  GameState.prototype.goToScene = function(id) {
    var scene = this.game.scenes[id];
    assert.ok(scene);

    if (this.state.visits[id] === undefined) this.state.visits[id] = 1;
    else this.state.visits[id]++;

    this.state.sceneId = id;
    this.state.choices = this._compileChoices(scene);

    // Check if we're done.
    if (scene.gameOver || this.state.choices === null) this.gameOver();
  };
  GameState.prototype.getRootSceneId = function() {
    return this.game.firstScene || 'root';
  };
  GameState.prototype.beginGame = function() {
    this.state = {
      sceneId: null,
      turn: 0,
      visits: {}
    };

    var id = this.getRootSceneId();
    this.goToScene(id);

    return this;
  };
  GameState.prototype.gameOver = function() {
    this.state.sceneId = null;
    return this;
  };
  GameState.prototype.isGameOver = function() {
    return this.getCurrentScene() === null;
  };
  GameState.prototype.getCurrentScene = function() {
    var scene = this.game.scenes[this.state.sceneId];
    if (scene === undefined) return null;
    else return scene;
  };
  // Returns the choices for the current scene. Choices are objects
  // with an id and a title property, not to be confused with the
  // option objects in a scene (though options are used to generate
  // choices). Choices are compiled from the options belonging to the
  // current scene.
  GameState.prototype.getCurrentChoices = function() {
    return this.state.choices;
  };
  GameState.prototype._compileChoices = function(scene) {
    var that = this;
    var id;

    assert.ok(scene);

    var options = scene.options;
    if (options !== undefined && options.options !== undefined) {
      // We have options, turn them into choices.
      options = options.options;

      // First build a mapping form id to title.
      var choices = {};
      _.each(options, function(option) {
        if (option.id.substr(0, 1) === '@') {
          // This is an id, use it.
          choices[option.id.substring(1)] = option.title || null;
        } else {
          assert.ok(option.id.substr(0, 1) === '#');
          // This is a tag, add all matching ids.
          var ids = that.game.tagLookup[option.id.substring(1)];
          _.map(ids, function(_, id) {
            if (choices[id] === undefined) choices[id] = null;
          });
        }
      });

      // Remove ids that have had their maximum number of visits.
      var validChoices = {};
      for (id in choices) {
        var maxVisits = this.game.scenes[id].maxVisits;
        var visits = this.state.visits[id] || 0;
        if (maxVisits !== undefined && visits >= maxVisits) continue;

        validChoices[id] = choices[id];
      }

      // Then make sure we have titles for all the ids we do have.
      var result = [];
      for (id in validChoices) {
        var title = validChoices[id];
        if (title === null) {
          title = this.game.scenes[id].title;
        }
        assert.ok(title);
        result.push({id:id, title:title});
      }

      if (result.length > 0) {
        return result;
      }
    }

    // We have no options, see if we need to use the default option.
    var root = this.getRootSceneId();
    if (root !== this.state.sceneId) {
      return [{id:root, title:'Scene Complete'}];
    } else {
      // There are no possible options.
      return null;
    }
  };

  module.exports = {
    GameState: GameState,
    NullRuntimeInterface: NullRuntimeInterface
  };
}());
