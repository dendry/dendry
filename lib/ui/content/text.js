/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var wordwrap = require('wordwrap');

  var _contentObjectToText = function(contentObj) {
    if (contentObj.type === undefined) {
      return contentObj;
    } else {
      switch(contentObj.type) {
      case 'emphasis-1':
        return _contentToText(contentObj.content);
      case 'emphasis-2':
        return _contentToText(contentObj.content).bold;
      case 'hidden':
        return _contentToText(contentObj.content).grey;
      case 'line-break':
        return '\n';

      // We can't handle elements that require state-dependency.
      case 'insert':
        /* falls through */
      case 'conditional':
        throw new Error(contentObj.type+" should have been evaluated by now.");
      }
    }
  };

  var _contentToText = function(content) {
    var output;
    if (Array.isArray(content)) {
      var result = [];
      for (var i = 0; i < content.length; ++i) {
        var contentObj = content[i];
        result.push(_contentObjectToText(contentObj));
      }
      output = result.join('');
    } else {
      output = _contentObjectToText(content);
    }
    return output.replace(/ +/g, ' ').replace(/ *\n */g, '\n');
  };

  var _paragraphsToText = function(paragraphs, width) {
      var text;
      var result = [];
      for (var i = 0; i < paragraphs.length; ++i) {
        var paragraph = paragraphs[i];
        switch(paragraph.type) {
        case 'heading':
          text = _contentToText(paragraph.content).bold;
          result.push(wordwrap(width)(text.trim()) + '\n');
          break;
        case 'paragraph':
          text = _contentToText(paragraph.content);
          result.push(wordwrap(width)(text.trim()) + '\n');
          break;
        case 'quotation':
          text = _contentToText(paragraph.content);
          result.push(
            wordwrap(4, width)(text.trim()) +
            ((i === paragraphs.length - 1 ||
             paragraphs[i+1].type !== 'attribution') ? '\n' : '')
          );
          break;
        case 'attribution':
          text = _contentToText(paragraph.content);
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
    convert: _paragraphsToText,
    convertLine: _contentToText
  };
}());
