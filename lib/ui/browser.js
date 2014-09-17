/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function($) {
  "use strict";

  var engine = require('../engine');

  var BrowserUserInterface = function() {};
  engine.UserInterface.makeParentOf(BrowserUserInterface);

  // ------------------------------------------------------------------------
  // Main API

  BrowserUserInterface.prototype.displayContent = function(content) {
    this.$content.append($("<p>").text(content));
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

  BrowserUserInterface.prototype.setDendryEngine = function(dendryEngine) {
    this.dendryEngine = dendryEngine;
  };

  BrowserUserInterface.prototype.setContent = function($content) {
    this.$content = $content;
    this._registerHandlers();
  };

  BrowserUserInterface.prototype._registerHandlers = function() {
    var that = this;
    this.$content.on("click", "ul.choices li a", function(event) {
      event.preventDefault();
      event.stopPropagation();
      var choice = parseInt($(this).attr('data-choice'));
      that.dendryEngine.choose(choice);
      return false;
    });
  };

  // ------------------------------------------------------------------------
  // Run when loaded.

  var main = function() {
    var ui = new BrowserUserInterface();
    engine.convertJSONToGame(window.game.compiled, function(err, game) {
      if (err) throw err;

      var dendryEngine = new engine.DendryEngine(ui, game);
      ui.setDendryEngine(dendryEngine);
      ui.setContent($("#content"));
      dendryEngine.beginGame();
    });
  };
  $(main);

}(jQuery));
