/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  'use strict';

  var _contentObjectToLaTeX = function(contentObj) {
    if (contentObj.type === undefined) {
      return contentObj.replace('$', '\\$').
                        replace('{', '\\{').replace('}', '\\}');
    } else {
      switch (contentObj.type) {
      case 'emphasis-1':
        return '\\textit{' + _contentToLaTeX(contentObj.content) + '}';
      case 'emphasis-2':
        return '\\textbf{' + _contentToLaTeX(contentObj.content) + '}';
      case 'hidden':
        return _contentToLaTeX(contentObj.content);
      case 'line-break':
        return '\\\\\n';

      // We can't handle elements that require state-dependency.
      case 'insert':
        /* falls through */
      case 'conditional':
        throw new Error(
          contentObj.type + ' should have been evaluated by now.'
          );
      }
    }
  };

  var _contentToLaTeX = function(content) {
    var result;
    if (Array.isArray(content)) {
      result = [];
      for (var i = 0; i < content.length; ++i) {
        var contentObj = content[i];
        result.push(_contentObjectToLaTeX(contentObj));
      }
      result = result.join('');
    } else {
      result = _contentObjectToLaTeX(content);
    }
    return result;
  };

  var _paragraphsToLaTeX = function(paragraphs) {
    var result = [];
    for (var i = 0; i < paragraphs.length; ++i) {
      var paragraph = paragraphs[i];
      switch (paragraph.type) {
      case 'heading':
        result.push('\\subsection*{');
        result.push(_contentToLaTeX(paragraph.content));
        result.push('}\n\n');
        break;
      case 'paragraph':
        result.push(_contentToLaTeX(paragraph.content));
        result.push('\n\n');
        break;
      case 'quotation':
        result.push('\\begin{quote}');
        result.push(_contentToLaTeX(paragraph.content));
        result.push('\\end{quote}\n\n');
        break;
      case 'attribution':
        result.push('\\begin{quote}');
        result.push(_contentToLaTeX(paragraph.content));
        result.push('\\end{quote}\n\n');
        break;
      case 'hrule':
        result.push('* * *\n\n');
        break;
      }
    }
    return result.join('');
  };

  module.exports = {
    convert: _paragraphsToLaTeX,
    convertLine: _contentToLaTeX
  };
}());
