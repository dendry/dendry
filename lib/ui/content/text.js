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
        result.push(range);
      } else {
        switch(range.type) {
        case 'emphasis-1':
          result.push(_contentToText(range.content, data));
          break;
        case 'emphasis-2':
          result.push(_contentToText(range.content, data).bold);
          break;
        case 'hidden':
          result.push(_contentToText(range.content, data).grey);
          break;
        case 'conditional':
          if (data[range.predicate]) {
            result.push(_contentToText(range.content, data));
          }
          break;
        case 'insert':
          result.push(data[range.insert]);
          break;
        case 'line-break':
          result.push('\n');
          break;
        }
      }
    }
    return result.join('').replace(/ +/g, ' ').replace(/ *\n */g, '\n');
  };

  var _paragraphsToText = function(paragraphs, data, width) {
      var text;
      var result = [];
      for (var i = 0; i < paragraphs.length; ++i) {
        var paragraph = paragraphs[i];
        switch(paragraph.type) {
        case 'heading':
          text = _contentToText(paragraph.content, data).bold;
          result.push(wordwrap(width)(text.trim()) + '\n');
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
