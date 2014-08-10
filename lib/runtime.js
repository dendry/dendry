/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var assert = require('assert');

  // Objects with this interface are passed to a game state to have it
  // display content.
  var RuntimeInterface = function() {};
  RuntimeInterface.prototype.displayContent = function(content) {};
  RuntimeInterface.prototype.displayOptions = function(options) {};
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
      var scene = this.getCurrentScene();
      var options = this.getSceneOptions(scene);
      this.displayScene(scene, options);
    }
    return this;
  };
  GameState.prototype.displayGameOver = function() {
    this.runtime.displayContent("Game Over");
    return this;
  };
  GameState.prototype.displayScene = function(scene, options) {
    assert.ok(scene);
    assert.ok(options);
    if (scene.content) this.runtime.displayContent(scene.content);
    this.runtime.displayOptions(options);
    return this;
  };
  GameState.prototype.choose = function(optionIndex) {
    var scene = this.getCurrentScene();
    var options = this.getSceneOptions(scene);
    assert.ok(scene);
    assert.ok(scene.options !== undefined);
    if (scene.options.length <= optionIndex) {
      throw new Error("No option at index "+optionIndex+", only "+
                      scene.options.length+" options are available.");
    }
    var option = scene.options[optionIndex];
    this.goToScene(option.id);
    return this;
  };
  GameState.prototype.goToScene = function(id) {
    // TODO: Error checking on id.
    this.state.sceneId = id;
  };
  GameState.prototype.getRootSceneId = function() {
    return this.game.firstScene || 'root';
  };
  GameState.prototype.beginGame = function() {
    this.state = {};

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
  GameState.prototype.getCurrentOptions = function() {
    var scene  = this.getCurrentScene();
    assert.ok(scene !== null);
    return this.getSceneOptions(scene);
  };
  GameState.prototype.getSceneOptions = function(scene) {
    assert.ok(scene);
    var options = scene.options;
    if (options !== undefined) {
      return options;
    } else {
      var id = this.getRootSceneId();
      if (id === this.state.sceneId) {
        return [];
      } else {
        return [{id:this.getRootSceneId(), title:'Scene Complete'}];
      }
    }
  };

  module.exports = {
    GameState: GameState,
    NullRuntimeInterface: NullRuntimeInterface
  };
}());
