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

  BrowserUserInterface.prototype.displayContent = function(paragraphs, data) {
    var html = this._paragraphsToHTML(paragraphs, data);
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

  BrowserUserInterface.prototype._contentToHTML = function(content, data) {
    var result = [];
    for (var i = 0; i < content.length; ++i) {
      var range = content[i];
      if (range.type === undefined) {
        result.push(range);
      } else {
        switch(range.type) {
        case 'emphasis-1':
          result.push('<em>');
          result.push(this._contentToHTML(range.content, data));
          result.push('</em>');
          break;
        case 'emphasis-2':
          result.push('<strong>');
          result.push(this._contentToHTML(range.content, data));
          result.push('</strong>');
          break;
        case 'hidden':
          result.push('<span class="hidden">');
          result.push(this._contentToHTML(range.content, data));
          result.push('</span>');
          break;
        case 'conditional':
          if (data[range.predicate]) {
            result.push(this._contentToHTML(range.content, data));
          }
          break;
        case 'line-break':
          result.push('<br>');
          break;
        }
      }
    }
    return result.join(' ');
  };

  BrowserUserInterface.prototype._paragraphsToHTML = function(paragraphs, data){
    var result = [];
    for (var i = 0; i < paragraphs.length; ++i) {
      var paragraph = paragraphs[i];
      switch(paragraph.type) {
      case 'heading':
        result.push('<h1>');
        result.push(this._contentToHTML(paragraph.content, data));
        result.push('</h1>');
        break;
      case 'paragraph':
        result.push('<p>');
        result.push(this._contentToHTML(paragraph.content, data));
        result.push('</p>');
        break;
      case 'quotation':
        result.push('<blockquote>');
        result.push(this._contentToHTML(paragraph.content, data));
        result.push('</blockquote>');
        break;
      case 'attribution':
        result.push('<blockquote class="attribution">');
        result.push(this._contentToHTML(paragraph.content, data));
        result.push('</blockquote>');
        break;
      case 'hrule':
        result.push('<hr>');
        break;
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
