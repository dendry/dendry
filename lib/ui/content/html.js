/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _contentToHTML = function(content, data) {
    var result = [];
    for (var i = 0; i < content.length; ++i) {
      var range = content[i];
      if (range.type === undefined) {
        result.push(range);
      } else {
        switch(range.type) {
        case 'emphasis-1':
          result.push('<em>'+
                      _contentToHTML(range.content, data)+
                      '</em>');
          break;
        case 'emphasis-2':
          result.push('<strong>'+
                      _contentToHTML(range.content, data)+
                      '</strong>');
          break;
        case 'hidden':
          result.push('<span class="hidden">'+
                      _contentToHTML(range.content, data)+
                      '</span>');
          break;
        case 'conditional':
          if (data[range.predicate]) {
            result.push(_contentToHTML(range.content, data));
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

  var _paragraphsToHTML = function(paragraphs, data) {
    var result = [];
    for (var i = 0; i < paragraphs.length; ++i) {
      var paragraph = paragraphs[i];
      switch(paragraph.type) {
      case 'heading':
        result.push('<h1>');
        result.push(_contentToHTML(paragraph.content, data));
        result.push('</h1>');
        break;
      case 'paragraph':
        result.push('<p>');
        result.push(_contentToHTML(paragraph.content, data));
        result.push('</p>');
        break;
      case 'quotation':
        result.push('<blockquote>');
        result.push(_contentToHTML(paragraph.content, data));
        result.push('</blockquote>');
        break;
      case 'attribution':
        result.push('<blockquote class="attribution">');
        result.push(_contentToHTML(paragraph.content, data));
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
    convert: _paragraphsToHTML
  };
}());
