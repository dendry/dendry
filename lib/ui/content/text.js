/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var wordwrap = require('wordwrap');

  var _contentToText = function(content, data) {
    var text;
    var result = [];
    for (var i = 0; i < content.length; ++i) {
      var range = content[i];
      if (range.type === undefined) {
        result.push(' ');
        result.push(range);
        result.push(' ');
      } else {
        switch(range.type) {
        case 'emphasis-1':
          result.push(' ');
          result.push(_contentToText(range.content, data));
          result.push(' ');
          break;
        case 'emphasis-2':
          result.push(' ');
          result.push(_contentToText(range.content, data).bold);
          result.push(' ');
          break;
        case 'hidden':
          result.push(' ');
          result.push(_contentToText(range.content, data).grey);
          result.push(' ');
          break;
        case 'conditional':
          if (data[range.predicate]) {
            result.push(' ');
            result.push(_contentToText(range.content, data));
            result.push(' ');
          }
          break;
        case 'line-break':
          result.push('\n');
          break;
        }
      }
    }
    return result.join('').trim().replace(/ +/g, ' ').replace(/ *\n */g, '\n');
  };

  var _paragraphsToText = function(paragraphs, data, width) {
      var text;
      var result = [];
      for (var i = 0; i < paragraphs.length; ++i) {
        var paragraph = paragraphs[i];
        switch(paragraph.type) {
        case 'heading':
          result.push(_contentToText(paragraph.content, data).bold + '\n');
          break;
        case 'paragraph':
          text = _contentToText(paragraph.content, data);
          result.push(wordwrap(width)(text.trim()) + '\n');
          break;
        case 'quotation':
          text = _contentToText(paragraph.content, data);
          result.push(
            wordwrap(4, width)(text.trim()) +
            ((i === paragraphs.length - 1 ||
             paragraphs[i+1].type !== 'attribution') ? '\n' : '')
          );
          break;
        case 'attribution':
          text = _contentToText(paragraph.content, data);
          result.push(wordwrap(8, width)(text.trim()) + '\n');
          break;
        case 'hrule':
          result.push('---\n');
          break;
        }
      }
      return result.join('\n');
    };


  module.exports = {
    convert: _paragraphsToText
  };
}());
