/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  'use strict';

  var async = require('async');
  var assert = require('assert');
  var _ = require('lodash');

  var engine = require('../engine');
  var logic = require('./logic');

  /*
    *some words* - emphasis
    **some words** - strong emphasis
    > paragraph - quotation
    >> paragraph - attribution
    = paragraph - heading
    // + <newline> - manual line break
    <blank line> - paragraph break
    --- - horizontal rule / break
    [some words] - hidable section
    [+ foo : bar +] - insert quality value with optional qdisplay
    [? if condition: text ?] - conditional section
   */

  var featuresRe = /\*+|\/\/\n|^[ \t]*\n|^\s*---\s*\n|^\s*>>?|^\s*=|\[[?+]?|[?+]?\]|\{\!|\!\}/mg;

  // ........................................................................
  // Find features in the text.
  // ........................................................................

  var _findFeatures = function(text) {
    var results = [];
    var match;
    while ((match = featuresRe.exec(text)) !== null) {
      results.push({
        feature: match[0].trim(),
        start: match.index,
        end: match.index + match[0].length
      });
    }
    return results;
  };

  var BoundaryFinder = function(findParagraphs) {
    this.findParagraphs = findParagraphs;
  };
  BoundaryFinder.prototype.init = function() {
    this.result = [];
    this.currentParagraphFeature = 'paragraph';
    this.inEmphasis = [false, false];
    this.inConditional = 0;
    this.inInsert = false;
    this.inMagic = false;
    this.inHidden = false;
  };
  BoundaryFinder.prototype.add = function(featureName, type, start, end) {
    start = (start !== undefined) ? start : this._feature.start;
    end = (end !== undefined) ? end : this._feature.end;
    this.result.push({
      feature: featureName,
      type: type,
      start: start,
      end: end
    });
  };
  BoundaryFinder.prototype.em = function(level) {
    if (this.inEmphasis[level - 1]) {
      this.inEmphasis[level - 1] = false;
      this.add('emphasis-' + level, 'end');
    } else {
      this.inEmphasis[level - 1] = true;
      this.add('emphasis-' + level, 'start');
    }
  };
  BoundaryFinder.prototype.simplePara = function(type, interstitial) {
    assert(this.findParagraphs,
           'Can\'t use a paragraph when not in paragraph mode.');
    assert(this.currentParagraphFeature !== null);
    this.add(this.currentParagraphFeature, 'end');
    if (interstitial !== undefined) {
      this.add(interstitial, 'single');
    }
    this.currentParagraphFeature = type;
    this.add(this.currentParagraphFeature, 'start');
  };
  BoundaryFinder.prototype.continuablePara = function(type) {
    assert(this.findParagraphs,
           'Can\'t use a paragraph when not in paragraph mode.');
    if (this.currentParagraphFeature === type) {
      this.add('skip', 'single');
    } else {
      this.simplePara(type);
    }
  };
  BoundaryFinder.prototype.finishHidden = function(offset) {
    if (!this.inHidden) {
      throw new Error(
        'Can\'t end a hidden block that hasn\'t been started.'
      );
    } else {
      this.add('hidden', 'end', this._feature.start + offset);
      this.inHidden = false;
    }
  };
  BoundaryFinder.prototype.process = function(text, features) {
    this.init();

    // Always wrap in a paragraph, and decompose the paragraph later
    // if we don't need it.
    this.add('paragraph', 'start', 0, 0);

    for (var i = 0; i < features.length; i++) {
      var feature = this._feature = features[i];

      // Magic can only be ended by magic, anything else inside is
      // considered part of the magic.
      if (this.inMagic) {
        if (feature.feature === '!}') {
          // End of magic.
          this.add('magic', 'end');
          this.inMagic = false;
        }
        continue;
      }

      // In all other contexts, features change the current state.
      switch (feature.feature) {
      case '*': // Start or end emphasis.
        this.em(1);
        break;
      case '**':
        this.em(2);
        break;
      case '//': // Manual line break.
        this.add('line-break', 'single');
        break;
      case '[+': // Start of insert.
        if (this.inInsert) {
          throw new Error(
            'Can\'t begin a new insert in the middle of an insert.'
          );
        } else {
          this.add('insert', 'start');
          this.inInsert = true;
        }
        break;
      case '[': // Start of hidden text.
        if (this.inHidden) {
          throw new Error(
            'Can\'t begin a new hidden block in the middle of a hidden block.'
          );
        } else if (this.inInsert) {
          throw new Error(
            'Can\'t nest a hidden block in an insert.'
          );
        } else {
          this.add('hidden', 'start');
          this.inHidden = true;
        }
        break;
      case '+]': // End of insert.
        if (this.inInsert) {
          this.add('insert', 'end');
          this.inInsert = false;
        } else {
          this.finishHidden(1);
        }
        break;
      case ']': // End of hidden text.
        this.finishHidden(0);
        break;
      case '[?':
        this.add('conditional', 'start');
        ++this.inConditional;
        break;
      case '?]': // End of conditional (if one is in progress, else hidden).
        if (this.inConditional > 0) {
          this.add('conditional', 'end');
          --this.inConditional;
        } else {
          // Treat this as ending the hidden.
          this.finishHidden(1);
        }
        break;
      case '{!':
        // Start of magic (end is handled in a separate clause above).
        this.add('magic', 'start');
        this.inMagic = true;
        break;

      default:
        if (!this.findParagraphs) {
          break;
        }

        // Handle paragraphs separately, if we're in paragraph mode.
        switch (feature.feature) {

        case '': // Blank line, new paragraph.
          this.simplePara('paragraph');
          break;
        case '---': // Horizontal rule, also forces a new paragraph.
          this.simplePara('paragraph', 'hrule');
          break;
        case '>': // This paragraph is a quote.
          this.continuablePara('quotation');
          break;
        case '>>': // This paragraph is a quote attribution.
          this.continuablePara('attribution');
          break;
        case '=': // This paragraph is a heading (level one or two).
          this.continuablePara('heading');
          break;
        }
        break;
      }
    }

    this.add(this.currentParagraphFeature, 'end', text.length, text.length);
  };

  var _createFeatureBoundaries = function(text, features, findParagraphs) {
    var boundaries = new BoundaryFinder(findParagraphs);
    boundaries.process(text, features);
    return boundaries.result;
  };

  // ........................................................................
  // Turn starts & ends into ranges.
  // ........................................................................

  var _buildRanges = function(text, features) {
    var add = function(range) {
      _.last(stack).content.push(range);
    };
    var addText = function() {
      if (lastPosition < feature.start) {
        addToAdd();
        var t = text.substring(lastPosition, feature.start);
        // Any whitespace is a space
        t = t.replace(/\s/g, ' ');
        // Spaces at the start are retained, those inside are collapsed.
        t = t.replace(/^ ( +)| +/g, ' $1');
        add(t);
      }
    };
    var addToAdd = function() {
      for (var j = 0; j < toAdd.length; ++j) {
        stack.push({
          type: toAdd[j],
          content: []
        });
      }
      toAdd = [];
    };

    var stack = [{content:[]}];
    var toAdd = [];
    var lastPosition = 0;
    for (var i = 0; i < features.length; ++i) {
      var feature = features[i];
      addText();

      switch (feature.type) {
      case 'start':
        stack.push({
          type: feature.feature,
          content: []
        });
        addToAdd();
        break;
      case 'single':
        if (feature.feature !== 'skip') {
          add({type:feature.feature});
        }
        break;
      case 'end':
        while (stack.length > 1) {
          var lastFeature = stack.pop();
          add(lastFeature);
          if (lastFeature.type === feature.feature) {
            break;
          } else {
            toAdd.unshift(lastFeature.type);
          }
        }
        break;
      }
      lastPosition = feature.end;
    }
    assert(stack.length === 1, 'Stack should be empty, except for content.');
    return _tidy(stack[0].content);
  };

  var _typesToTrimWhitespace = {
    paragraph: true,
    quotation: true,
    attribution: true,
    heading: true
  };

  var _removeLeadingWhitespace = function(range) {
    if (range.type === undefined) {
      range = range.replace(/^\s+/, '');
    } else {
      assert (range.content !== undefined);
      range.content[0] = _removeLeadingWhitespace(range.content[0]);
    }
    return range;
  };

  var _removeTrailingWhitespace = function(range) {
    if (range.type === undefined) {
      range = range.replace(/\s+$/, '');
    } else {
      assert (range.content !== undefined);
      var pos = range.content.length - 1;
      range.content[pos] = _removeTrailingWhitespace(range.content[pos]);
    }
    return range;
  };

  var _tidy = function(ranges) {
    var result = [];
    var i;
    var range;

    // Recursively merge neighbouring text.
    for (i = 0; i < ranges.length; ++i) {
      range = ranges[i];
      if (range.content === undefined) {
        var addContent = true;
        var lastPos = result.length - 1;
        if (lastPos >= 0) {
          var lastType = result[lastPos].type;

          // If the current and last item are both raw text, join them.
          if (range.type === undefined && lastType === undefined) {
            var text = result[lastPos] + ' ' + range;
            result[lastPos] = text.replace(/\s+/g, ' ');
            addContent = false; // We've merged, so don't add.
          }

          // If the current is a new-line, trim the end of the previous.
          if (range.type === 'line-break' && lastType === undefined) {
            result[lastPos] = result[lastPos].replace(/\s+$/, '');
          }
        }

        if (addContent) {
          result.push(range);
        }
      } else {
        range.content = _tidy(range.content);
        if (range.content.length > 0) {
          if (_typesToTrimWhitespace[range.type]) {
            // Remove leading and trailing spaces from the whole paragraph.
            range = _removeLeadingWhitespace(_removeTrailingWhitespace(range));
          }
          result.push(range);
        }
      }
    }
    return result;
  };

  // ........................................................................
  // Turn particular ranges into state dependency data structures.
  // ........................................................................

  var _removeBlankRanges = function(range) {
    var content = [];
    _.each(range.content, function(element) {
      if (element.type === undefined) {
        element = element.trim();
        if (element.length > 0) {
          content.push(element);
        }
      } else {
        content.push(element);
      }
    });
    return content;
  };

  var _extractPredicate = function(range, output) {
    var predicate;

    // Valid conditionals should either have 'if ... :' in their
    // first content, or 'if' in their first content, Magic in
    // their second, and ':' to start their third.
    assert(range.content[0].type === undefined);
    var match = /^\s*if\s*([^:]+)\s*:\s*(.*)$/.exec(range.content[0]);
    if (match) {
      range.content[0] = match[2];

      var logic = match[1];
      predicate = {type:'predicate', language:'logic', source:logic};
    } else {
      assert(range.content[1].type === 'magic');
      assert(range.content[2].type === undefined);
      assert(range.content[2].trim().substr(0, 1) === ':');

      var magic = range.content[1].content.join('; ');
      range.content.splice(0, 3, range.content[2].substr(1).trim());

      predicate = {type:'predicate', language:'magic', source:magic};
    }
    range.predicate = output.length;
    output.push(predicate);
  };

  var _extractInsert = function(range, output) {
    var expression;

    var illegalFormat = function() {
      throw new Error('Insert content doesn\'t look like logic or magic.');
    };

    var source;
    var content = _removeBlankRanges(range);
    var qdisplay;
    if (content.length === 1) {
      // Either logic + optional qdisplay, or pure magic.
      if (content[0].type === 'magic') {
        // Pure magic.
        source = content[0].content.join('; ');
        expression = {type:'insert', language:'magic', source: source};
      } else {
        if (content[0].type !== undefined) {
          illegalFormat();
        }

        // Check for qdisplay
        var match = /^([^:]+)\s*:\s*(.*)$/.exec(content[0]);
        if (match) {
          // Extract the qdisplay.
          source = match[1];
          qdisplay = match[2];
          expression = {type:'insert', language:'logic',
                        source: source, qdisplay: qdisplay};
        } else {
          // Pure logic.
          expression = {type:'insert', language:'logic', source: content[0]};
        }
      }
    } else {
      // Magic and qdisplay.
      if (content.length !== 2) {
        illegalFormat();
      }
      if (content[0].type !== 'magic') {
        illegalFormat();
      }
      if (content[1].type !== undefined) {
        illegalFormat();
      }
      if (content[1].substr(0, 1) !== ':') {
        illegalFormat();
      }

      source = content[0].content.join('; ');
      qdisplay = content[1].substring(1).trim();
      expression = {
        type: 'insert',
        language: 'magic',
        source: source,
        qdisplay: qdisplay
      };
    }

    delete range.content;
    range.insert = output.length;
    output.push(expression);
  };

  // Recursively walk through the content data structure, extracting
  // any data that requires data from the current state.
  var _extractStateDependencies = function(ranges, output) {
    _.each(ranges, function(range) {

      if (range.content !== undefined) {
        switch (range.type) {
        case 'conditional':
          // Extract the predicate.
          _extractPredicate(range, output);
          break;

        case 'insert':
          // Extract the value insertion.
          _extractInsert(range, output);
          break;
        }

        // Recurse
        _extractStateDependencies(range.content, output);
      }
    });
  };

  // ........................................................................
  // Compiling the code in state dependencies into functions.
  // ........................................................................

  var _makeCompileCodeStateDependency = function(type, method) {
    return function(dependency, callback) {
      assert(dependency.type === type);

      if (dependency.language === 'magic') {
        var fn;
        try {
          fn = engine.makeFunctionFromSource(dependency.source);
        } catch (err) {
          return callback(err);
        }
        return callback(null, {type:type, fn:fn});
      } else {
        assert(dependency.language === 'logic');
        method(dependency.source, function(err, fn) {
          if (err) {
            return callback(err);
          }
          return callback(null, {type:type, fn:fn});
        });
      }
    };
  };

  var _compilePredicateStateDependency =
    _makeCompileCodeStateDependency('predicate', logic.compilePredicate);

  var __compileInsertBase =
    _makeCompileCodeStateDependency('insert', logic.compileExpression);
  var _compileInsertStateDependency = function(dependency, callback) {
    __compileInsertBase(dependency, function(err, result) {
      if (err) {
        return callback(err);
      }
      var name = dependency.qdisplay;
      if (name) {
        // Make sure the name is valid.
        if (!/^[a-zA-Z][\-a-zA-Z0-9_]*$/.test(name)) {
          return callback(
            new Error('"' + name + '" is not a valid qdisplay name.')
          );
        } else {
          result.qdisplay = name;
        }
      }
      return callback(null, result);
    });
  };

  var _compileStateDependency = function(dependency, callback) {
    // Currently we don't have any dependencies other than predicates,
    // but this may change.
    switch (dependency.type) {
    case 'predicate':
      return _compilePredicateStateDependency(dependency, callback);

    case 'insert':
      return _compileInsertStateDependency(dependency, callback);
    }
  };

  // Go through each extracted dependency that might need an
  // asynchronous compilation step, and compile it.
  var _compileStateDependencies = function(dependencies, callback) {
    async.map(dependencies, _compileStateDependency, callback);
  };

  // ........................................................................
  // Top level content compilation.
  // ........................................................................

  var compile = function(text, findParagraphs, callback) {
    var sendResult = function(content) {
      content = normaliseContent(content);
      return callback(null, content);
    };

    var dependencies = [];
    var features = _findFeatures(text);
    if (features.length === 0) {
      // If we have no markup, just text, normalise it and return.
      text = text.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
      if (findParagraphs) {
        return sendResult({content:text, type:'paragraph'});
      } else {
        return sendResult(text);
      }
    }

    var boundaries;
    var ranges;
    try {
      boundaries = _createFeatureBoundaries(text, features, findParagraphs);
      ranges = _buildRanges(text, boundaries);
      _extractStateDependencies(ranges, dependencies);
    } catch (err) {
      return callback(err);
    }
    _compileStateDependencies(dependencies, function(err, compiledDeps) {
      if (err) {
        return callback(err);
      } else {
        var result;
        if (findParagraphs) {
          result = {content:ranges};
        } else {
          assert(ranges.length === 1,
                 'Non-paragraph content should be wrapped in a paragraph.');
          assert(ranges[0].type === 'paragraph',
                 'Non-paragraph content should be wrapped in a paragraph.');
          // Unwrap the content.
          result = {content:ranges[0].content};
        }
        if (compiledDeps.length) {
          result.stateDependencies = compiledDeps;
        }
        return sendResult(result);
      }
    });
  };

  var normaliseContent = function(content) {
    if (content.content !== undefined) {
      // Normalise sub-content.
      content.content = normaliseContent(content.content);

      // If we have subcontent, but no other data, then use the subcontent
      if (content.type === undefined &&
          content.stateDependencies === undefined) {
        content = content.content;
      }
    }

    if (Array.isArray(content)) {
      if (content.length === 1) {
        // Unwrap single item arrays.
        content = normaliseContent(content[0]);
      } else {
        // Normalise nested items.
        for (var i = 0; i < content.length; ++i) {
          content[i] = normaliseContent(content[i]);
        }
      }
    }

    return content;
  };

  module.exports = {
    compile: compile,
    normaliseContent: normaliseContent
  };

}());
