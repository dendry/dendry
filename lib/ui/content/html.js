/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _contentToHTML = function(content) {
    var result = [];
    for (var i = 0; i < content.length; ++i) {
      var range = content[i];
      if (range.type === undefined) {
        result.push(range);
      } else {
        switch(range.type) {
        case 'emphasis-1':
          result.push('<em>'+
                      _contentToHTML(range.content)+
                      '</em>');
          break;
        case 'emphasis-2':
          result.push('<strong>'+
                      _contentToHTML(range.content)+
                      '</strong>');
          break;
        case 'hidden':
          result.push('<span class="hidden">'+
                      _contentToHTML(range.content)+
                      '</span>');
          break;
        case 'line-break':
          result.push('<br>');
          break;

        // We can't handle elements that require state-dependency.
        case 'insert':
          /* falls through */
        case 'conditional':
          throw new Error(range.type+" should have been evaluated by now.");
        }
      }
    }
    return result.join('');
  };

  var _paragraphsToHTML = function(paragraphs) {
    var result = [];
    for (var i = 0; i < paragraphs.length; ++i) {
      var paragraph = paragraphs[i];
      switch(paragraph.type) {
      case 'heading':
        result.push('<h1>');
        result.push(_contentToHTML(paragraph.content));
        result.push('</h1>');
        break;
      case 'paragraph':
        result.push('<p>');
        result.push(_contentToHTML(paragraph.content));
        result.push('</p>');
        break;
      case 'quotation':
        result.push('<blockquote>');
        result.push(_contentToHTML(paragraph.content));
        result.push('</blockquote>');
        break;
      case 'attribution':
        result.push('<blockquote class="attribution">');
        result.push(_contentToHTML(paragraph.content));
        result.push('</blockquote>');
        break;
      case 'hrule':
        result.push('<hr>');
        break;
      }
    }
    return result.join('');
  };

  module.exports = {
    convert: _paragraphsToHTML,
    convertLine: _contentToHTML
  };
}());
