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

  BrowserUserInterface.prototype.displayContent = function(content, predicates){
    var html = this._contentToHTML(content, predicates);
    this.$content.append(html);
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

  BrowserUserInterface.prototype._contentToHTML = function(chunks, predicates){
    var result = [];
    for (var i = 0; i < chunks.length; ++i) {
      var chunk = chunks[i];
      if (chunk.type === undefined) {
        result.push(chunk);
      } else {
        switch(chunk.type) {
        case 'heading':
          result.push('<h1>');
          result.push(this._contentToHTML(chunk.content, predicates));
          result.push('</h1>');
          break;
        case 'paragraph':
          result.push('<p>');
          result.push(this._contentToHTML(chunk.content, predicates));
          result.push('</p>');
          break;
        case 'quotation':
          result.push('<blockquote>');
          result.push(this._contentToHTML(chunk.content, predicates));
          result.push('</blockquote>');
          break;
        case 'attribution':
          result.push('<blockquote class="attribution">');
          result.push(this._contentToHTML(chunk.content, predicates));
          result.push('</blockquote>');
          break;
        case 'emphasis-1':
          result.push(' <em>');
          result.push(this._contentToHTML(chunk.content, predicates));
          result.push('</em> ');
          break;
        case 'emphasis-2':
          result.push(' <strong>');
          result.push(this._contentToHTML(chunk.content, predicates));
          result.push('</strong> ');
          break;
        case 'hidden':
          result.push(' <span class="hidden">');
          result.push(this._contentToHTML(chunk.content, predicates));
          result.push('</span> ');
          break;
        case 'conditional':
          if (predicates[chunk.predicate]) {
            result.push(' ');
            result.push(this._contentToHTML(chunk.content, predicates));
            result.push(' ');
          }
          break;
        case 'magic':
          result.push(' {! ');
          result.push(this._contentToHTML(chunk.content, predicates));
          result.push(' !} ');
          break;
        case 'line-break':
          result.push('<br>');
          break;
        case 'hrule':
          result.push('<hr>');
          break;
        }
      }
    }
    return result.join('');
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
