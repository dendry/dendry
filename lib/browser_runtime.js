/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function($) {
  "use strict";

  var runtime = require('./runtime');

  var BrowserRuntimeInterface = function() {};
  runtime.RuntimeInterface.isParentOf(BrowserRuntimeInterface);

  // ------------------------------------------------------------------------
  // Main API

  BrowserRuntimeInterface.prototype.displayContent = function(content) {
    this.$content.append($("<p>").text(content));
  };
  BrowserRuntimeInterface.prototype.displayChoices = function(choices) {
    var $ul = $("<ul>").addClass("choices");
    for (var i = 0; i < choices.length; ++i) {
      var choice = choices[i];
      var $li = $("<li>");
      var $a = $("<a>").text(choice.title).attr({
        href: "#",
        "data-choice": i
      });
      $li.html($a);
      $ul.append($li);
    }
    this.$content.append($ul);
  };
  BrowserRuntimeInterface.prototype.newPage = function() {
    this.$content.empty();
  };
  BrowserRuntimeInterface.prototype.removeChoices = function() {
    $(".choices", this.$content).remove();
  };

  // ------------------------------------------------------------------------
  // Additional methods

  BrowserRuntimeInterface.prototype.setGameState = function(gameState) {
    this.gameState = gameState;
  };

  BrowserRuntimeInterface.prototype.setContent = function($content) {
    this.$content = $content;
    this._registerHandlers();
  };

  BrowserRuntimeInterface.prototype._registerHandlers = function() {
    var that = this;
    this.$content.on("click", "ul.choices li a", function(event) {
      event.preventDefault();
      event.stopPropagation();
      var choice = parseInt($(this).attr('data-choice'));
      that.gameState.choose(choice);
      return false;
    });
  };

  // ------------------------------------------------------------------------
  // Run when loaded.

  var main = function() {
    var runtimeInterface = new BrowserRuntimeInterface();
    var game = window.game;
    var gameState = new runtime.GameState(runtimeInterface, game);
    runtimeInterface.setGameState(gameState);
    runtimeInterface.setContent($("#content"));
    gameState.beginGame();
  };
  $(main);

}(jQuery));
