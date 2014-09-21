/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function($) {
  "use strict";

  var engine = require('../engine');

  var BrowserUserInterface = function(game, $content) {
    this.game = game;
    this.$content = $content;
    this._registerEvents();

    this.dendryEngine = new engine.DendryEngine(this, game);
  };
  engine.UserInterface.makeParentOf(BrowserUserInterface);

  // ------------------------------------------------------------------------
  // Main API

  BrowserUserInterface.prototype.displayContent = function(content) {
    this.$content.append($("<p>").text(content));
  };
  BrowserUserInterface.prototype.displayGameOver = function() {
    var $p = $("<p>").text(this._getGameOverMsg()).addClass('game-over');
    this.$content.append($p);
  };
  BrowserUserInterface.prototype.displayChoices = function(choices) {
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
  BrowserUserInterface.prototype.newPage = function() {
    this.$content.empty();
  };
  BrowserUserInterface.prototype.removeChoices = function() {
    $(".choices", this.$content).remove();
  };

  // ------------------------------------------------------------------------
  // Additional methods

  BrowserUserInterface.prototype._getGameOverMsg = function() {
    return "Game Over (reload to read again)";
  };

  BrowserUserInterface.prototype._registerEvents = function() {
    var that = this;
    this.$content.on("click", "ul.choices li a", function(event) {
      event.preventDefault();
      event.stopPropagation();
      var choice = parseInt($(this).attr('data-choice'));
      that.dendryEngine.choose(choice);
      return false;
    });
    this.$content.on("click", "ul.choices li", function(event) {
      event.preventDefault();
      event.stopPropagation();
      $("a", this).click();
      return false;
    });
  };

  // ------------------------------------------------------------------------
  // Run when loaded.

  var main = function() {
    engine.convertJSONToGame(window.game.compiled, function(err, game) {
      if (err) throw err;

      var ui = new BrowserUserInterface(game, $("#content"));
      window.dendryUI = ui;
      // Allow the ui system to be customized before use.
      if (window.dendryModifyUI !== undefined) {
        window.dendryModifyUI(ui);
      }
      ui.dendryEngine.beginGame();
    });
  };
  $(main);

}(jQuery));
