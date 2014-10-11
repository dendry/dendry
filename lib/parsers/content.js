/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

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
    [+ foo +] - insert quality value
    [? if condition: text ?] - conditional section
   */

  var featuresRe =
  /\*+|\/\/\n|^[ \t]*\n|^\s*---\s*\n|^\s*>>?|^\s*=|\[[?+]?|[?+]?\]|\{\!|\!\}/mg;

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

  var _createFeatureBoundaries = function(text, features) {
    var result = [];
    var inEmphasis = [false, false];

    var add = function(featureName, type, start, end) {
      start = (start !== undefined) ? start : feature.start;
      end = (end !== undefined) ? end : feature.end;
      var newFeature = {feature:featureName, type:type};
      newFeature.start = start;
      newFeature.end = end;
      result.push(newFeature);
    };

    var em = function(level) {
      if (inEmphasis[level-1]) {
        inEmphasis[level-1] = false;
        add('emphasis-'+level, 'end');
      } else {
        inEmphasis[level-1] = true;
        add('emphasis-'+level, 'start');
      }
    };

    var simplePara = function(type, interstitial) {
      assert (currentParagraphFeature !== null);
      add(currentParagraphFeature, 'end');
      if (interstitial !== undefined) {
        add(interstitial, 'single');
      }
      currentParagraphFeature = type;
      add(currentParagraphFeature, 'start');
    };

    var continuablePara = function(type) {
      if (currentParagraphFeature === type) {
        add('skip', 'single');
      } else {
        simplePara(type);
      }
    };

    var finishHidden = function(offset) {
      if (!inHidden) {
        throw new Error(
          "Can't end a hidden block that hasn't been started."
        );
      } else {
        add('hidden', 'end', feature.start+offset);
        inHidden = false;
      }
    };

    add('paragraph', 'start', 0, 0);
    var currentParagraphFeature = 'paragraph';

    var inConditional = 0;
    var inInsert = false;
    var inMagic = false;
    var inHidden = false;

    var processedUpTo = 0;
    for (var i = 0; i < features.length; i++) {
      var feature = features[i];

      // Magic can only be ended by magic, anything else inside is
      // considered part of the magic.
      if (inMagic) {
        if (feature.feature === '!}') {
          // End of magic.
          add('magic', 'end');
          inMagic = false;
        }
        continue;
      }

      // In all other contexts, features change the current state.
      var level;
      switch(feature.feature) {
      case '*': // Start or end emphasis.
        em(1);
        break;
      case '**':
        em(2);
        break;
      case '//': // Manual line break.
        add('line-break', 'single');
        break;
      case '[+': // Start of insert.
        if (inInsert) {
          throw new Error(
            "Can't begin a new insert in the middle of an insert."
          );
        } else {
          add('insert', 'start');
          inInsert = true;
        }
        break;
      case '[': // Start of hidden text.
        if (inHidden) {
          throw new Error(
            "Can't begin a new hidden block in the middle of a hidden block."
          );
        } else if (inInsert) {
          throw new Error(
            "Can't nest a hidden block in an insert."
          );
        } else {
          add('hidden' ,'start');
          inHidden = true;
        }
        break;
      case '+]': // End of insert.
        if (inInsert) {
          add('insert', 'end');
          inInsert = false;
        } else {
          finishHidden(1);
        }
        break;
      case ']': // End of hidden text.
        finishHidden(0);
        break;
      case '[?':
        add('conditional', 'start');
        ++inConditional;
        break;
      case '?]': // End of conditional (if one is in progress, else hidden).
        if (inConditional > 0) {
          add('conditional', 'end');
          --inConditional;
        } else {
          // Treat this as ending the hidden.
          finishHidden(1);
        }
        break;
      case '{!':
        // Start of magic (end is handled in a separate clause above).
        add('magic', 'start');
        inMagic = true;
        break;

      // New paragraph creation...
      case '': // Blank line, new paragraph.
        simplePara('paragraph');
        break;
      case '---': // Horizontal rule, also forces a new paragraph.
        simplePara('paragraph', 'hrule');
        break;
      case '>': // This paragraph is a quote.
        continuablePara('quotation');
        break;
      case '>>': // This paragraph is a quote attribution.
        continuablePara('attribution');
        break;
      case '=': // This paragraph is a heading (level one or two).
        continuablePara('heading');
        break;
      }
    }
    add(currentParagraphFeature, 'end', text.length, text.length);
    return result;
  };

  var _buildRanges = function(text, features) {
    var add = function(range) {
      _.last(stack).content.push(range);
    };
    var addText = function() {
      if (lastPosition < feature.start) {
        addToAdd();
        var t = text.substring(lastPosition, feature.start);
        t = t.replace(/\s+/g, ' ');
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

      switch(feature.type) {
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
        while(stack.length > 1)
        {
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
    assert(stack.length === 1);
    return _tidy(stack[0].content);
  };

  var _paragraphTypes = {
    paragraph: true, quotation: true, attribution: true, heading: true
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
    var i, range;
    // Recursively merge neighbouring text.
    for (i = 0; i < ranges.length; ++i) {
      range = ranges[i];
      if (range.content === undefined) {
        // Try to merge raw text.
        var lastPos = result.length - 1;
        if (lastPos >= 0 &&
            range.type === undefined &&
            result[lastPos].type === undefined) {
          var text = result[lastPos] + ' ' + range;
          result[lastPos] = text.replace(/\s+/g, ' ');
        } else {
          result.push(range);
        }
      } else {
        range.content = _tidy(range.content);
        if (range.content.length > 0) {
          if (_paragraphTypes[range.type]) {
            range = _removeLeadingWhitespace(_removeTrailingWhitespace(range));
          }
          result.push(range);
        }
      }
    }
    return result;
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
      assert(range.content[2].trim().substr(0,1) === ':');

      var magic = range.content[1].content.join('; ');
      range.content.splice(0,3, range.content[2].substr(1).trim());

      predicate = {type:'predicate', language:'magic', source:magic};
    }
    range.predicate = output.length;
    output.push(predicate);
  };

  var _extractInsert = function(range, output) {
    var expression;

    var content;
    var type;
    // If we have magic, we can have empty blocks of normal content
    // before and after it.
    if (range.content.length > 1) {
      content = [];
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
      if (content.length !== 1) {
        throw new Error("Insert content doesn't look like logic or magic.");
      } else {
        content = content[0];
      }
    } else {
      content = range.content[0];
    }

    // Valid content must be a single block of content.
    if (content.type === 'magic') {
      var magic = content.content.join('; ');
      expression = {type:'insert', language:'magic', source: magic};
    } else {
      expression = {type:'insert', language:'logic', source: content};
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
        switch(range.type) {
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


  var _makeCompileCodeStateDependency = function(type, method) {
    return function(dependency, callback) {
      assert(dependency.type === type);

      if (dependency.language === 'magic') {
        var fn;
        try {
          fn = engine.makeFunctionFromSource(dependency.source);
        } catch(err) {
          return callback(err);
        }
        return callback(null, {type:type, fn:fn});
      } else {
        assert(dependency.language === 'logic');
        method(dependency.source, function(err, fn) {
          if (err) return callback(err);
          return callback(null, {type:type, fn:fn});
        });
      }
    };
  };

  var _compilePredicateStateDependency =
    _makeCompileCodeStateDependency('predicate', logic.compilePredicate);

  var _compileInsertStateDependency =
    _makeCompileCodeStateDependency('insert', logic.compileExpression);

  var _compileStateDependency = function(dependency, callback) {
    // Currently we don't have any dependencies other than predicates,
    // but this may change.
    switch(dependency.type) {
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

  var compile = function(text, callback) {
    var dependencies = [];
    try {
      var features = _findFeatures(text);
      if (features.length === 0) return callback(null, text);

      var boundaries = _createFeatureBoundaries(text, features);
      var ranges = _buildRanges(text, boundaries);
      _extractStateDependencies(ranges, dependencies);
    } catch(err) {
      return callback(err);
    }
    _compileStateDependencies(dependencies, function(err, compiledDeps) {
      if (err) return callback(err);
      else {
        var result = {paragraphs:ranges};
        if (compiledDeps.length) result.stateDependencies = compiledDeps;
        return callback(null, result);
      }
    });
  };

  module.exports = {
    compile: compile
  };

}());
