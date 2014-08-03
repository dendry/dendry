/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  // The parser and tokenizer in this file are based on the Spark
  // parsing system for the Python programming language, Copyright (c)
  // 1998-2002 John Aycock, which is released under the MIT license
  // and is available from:
  // http://pages.cpsc.ucalgary.ca/~aycock/spark/

  // ----------------------------------------------------------------------
  // TOKENIZER

  /* An error thrown when the tokenizer fails.
   */
  var TokenizerError = function(message) {
    this.message = message;
  };
  TokenizerError.prototype.toString = function() {
    return this.message;
  };

  /* Splits the whole content into tokens. This is a general tokenizer
   * routine, that needs to be given tokenization rules.
   *
   * The generateNullToken property controls whether a null match
   * is added to the token stream when no rules match. If this is
   * false, then an error will be raised if some content doesn't
   * match.
   */
  var tokenize = function(content, tokenRules, generateNullToken) {
    var result = [];
    var pos = 0;
    var len = content.length;

    if (generateNullToken === undefined) generateNullToken = true;

    var j = 0;
    while (pos < len) {
      // Find the nearest / largest match.
      var matchPos = len;
      var matchLength = 0;
      var matchRule = null;
      for (var i = 0; i < tokenRules.length; i += 1) {
        var tokenRule = tokenRules[i];

        var match = content.substring(pos).match(tokenRule.regex);
        if (match === null) continue;

        // Check if this is the most important match.
        var thisPos = match.index + pos;
        var thisLength = match[0].length;
        if (thisPos < matchPos ||
            (thisPos === matchPos && thisLength > matchLength)) {
          matchPos = thisPos;
          matchLength = thisLength;
          matchRule = tokenRule;
        }
      }

      // Check if we have a match
      if (matchRule === null) {
        if (!generateNullToken) {
          throw new TokenizerError("Unrecognized content at "+pos);
        } else {
          // We're done. Add the end text and exit.
          result.push({
            token:null,
            position:pos,
            length:len-pos,
            text:content.substr(pos, len-pos)
          });
        }
        break;
      } else {
        // If we've moved on, then deal with the text we skipped.
        if (matchPos > pos) {
          if (!generateNullToken) {
            throw new TokenizerError(
              "Unrecognized content at "+pos
            );
          } else {
            // Add the intermediate text under a null token.
            result.push(
              {token:null, position:pos, length:matchPos-pos}
            );
          }
        }

        // Add the token.
        if (matchRule.token !== undefined) {
          result.push({
            token:matchRule.token,
            position:matchPos,
            length:matchLength,
            text:content.substr(matchPos, matchLength)
          });
        }

        // Continue from the end of this match
        pos = matchPos + matchLength;
      }

      j += 1;
      if (j > 100) {
        throw new TokenizerError("Runaway tokenizing.");
      }
    }

    return result;
  };

  // ----------------------------------------------------------------------
  // PARSER

  var ParserError = function(message) {
    this.message = message;
  };
  ParserError.prototype.toString = function() {
    return this.message;
  };

  /* A Simple Early parser (J. Earley, "An Efficient Context-Free
   * Parsing Algorithm", CACM 13(2), pp. 94-102.) */
  var Parser = function(grammar) {
    this.grammar = grammar;
    this._checkGrammar();
  };

  // Constants
  Parser.NON_TERMINAL = 'non-terminal';
  Parser.TERMINAL = 'terminal';

  /* Runs the parser on the given tokens, expecting the given root
   * non-terminal to be found. If the parse is successful, a state
   * data structure corresponding to that root will be returned. If
   * the parse can generate the root in multiple ways, then all
   * valid parses will be returned. */
  Parser.prototype.run = function(tokens, root) {
    var i;

    this.tokens = tokens;

    this.states = {};
    this.states[0] = [];

    // Go through the rules in the grammar, and add any root rules.
    for (i = 0; i < this.grammar.length; i += 1) {
      var rule = this.grammar[i];
      if (rule.name === root) {
        this._addState(0, {rule:rule, index:0, from:0, to:0});
      }
    }
    if (this.states[0].length === 0) {
      throw new ParserError(
        "I couldn't parse this. [Error G101]"
      );
    }

    for (i = 0; i < tokens.length+1; i += 1) {
      // Do we have any states to consider?
      var currentStates = this.states[i];
      if (currentStates.length <= 0) break;

      // Track what we've predicted already for this token, so
      // we don't loop.
      var predictionsMade = {};

      // Go through each state and see if we can move it onwards.
      for (var j = 0; j < currentStates.length; j += 1) {
        var currentState = currentStates[j];
        if (this._isComplete(currentState)) {
          // This rule is done, so update any states waiting
          // on its output.
          this._complete(currentState, i);
        } else {
          // We need to progress this state - either by
          // adding a requirement to find another
          // non-terminal, or by confirming we have a
          // matching terminal.
          if (this._isNextNonterminal(currentState)) {
            this._predict(currentState, i, predictionsMade);
          } else {
            this._scan(currentState, i);
          }
        }
      }

    }

    // Extract the valid parse or parses. They are any parses in
    // the latest state that have completed, and have the root
    // rule name.
    var parses = [];
    var finalStates = this.states[tokens.length];
    if (finalStates !== undefined) {
      for (i = 0; i < finalStates.length; i += 1) {
        var state = finalStates[i];
        if (state.rule.name === root &&
            state.index === state.rule.children.length) {
          parses.push(state);
        }
      }
    }
    if (parses.length > 0) {
      // Build the parse trees.
      var that = this;
      return $.map(parses, function(parse) {
        that._buildParseTree(tokens, parse);
      });
    }

    // We had a problem.
    throw new ParserError("I couldn't parse this. [Error P101]");
  };

  // Internal functions.
  Parser.prototype._checkGrammar = function() {
    var rule;

    // Build a list of rule names.
    var ruleNames = {};
    for (var i = 0; i < grammar.length; i += 1) {
      rule = grammar[i];
      ruleNames[rule.name] = true;
    }

    var nonTerminalNames = {};

    // Check that non-terminals in the rules refer to one of the
    // known rule names.
    for (i = 0; i < grammar.length; i += 1) {
      rule = grammar[i];
      for (var j = 0; j < rule.children.length; j += 1) {
        var child = rule.children[j];
        if (child.type === Parser.NON_TERMINAL) {
          nonTerminalNames[child.name] = true;
          if (!ruleNames[child.name]) {
            throw new ParserError(
              "Non-terminal "+child.name+
                " has no rule to can generate it."
            );
          }
        }
      }
    }

    // And check the reverse, any rule should have some way of
    // being fired.
    $.each(ruleNames, function(name) {
      if (name !== "root" && !nonTerminalNames[name]) {
        throw new ParserError("Rule "+name+" is never referenced.");
      }
    });
  };
  Parser.prototype._addState = function(index, state) {
    var states = this.states[index];
    if (states === undefined) {
      states = [];
      this.states[index] = states;
    }
    for (var i = 0; i < states.length; i += 1) {
      var otherState = states[i];
      if (otherState.from === state.from &&
          otherState.to === state.to &&
          otherState.index === state.index &&
          otherState.rule === state.rule) {
        return;
      }
    }
    states.push(state);
  };
  Parser.prototype._buildParseTree = function(tokens, state) {
    // Get tokens in range.
    var rawTokens = function(from, to) {
      var toks = [];
      for (var i = from; i < to; i += 1) {
        toks.push(tokens[i]);
      }
      return toks;
    };

    // Recursively move the contents of a state onto the stack.
    var processState = function(state, complete, stack) {
      if (state.parent) {
        // Pre-recursion.
        processState(state.parent, state.complete, stack);
      }
      if (complete) {
        // Find our immediate children.
        var children = [];
        while (stack.length > 0 &&
               stack[stack.length-1].from >= state.from &&
               stack[stack.length-1].to <= state.to) {
          var next = stack.pop();
          children.unshift(next);
        }

        // Now go through the list and add raw tokens.
        var start = state.from;
        var allChildren = [];
        for (var i = 0; i < children.length; i += 1) {
          var child = children[i];
          if (start < child.from) {
            [].push.apply(
              allChildren, rawTokens(start, child.from)
            );
          }
          allChildren.push(child);
          start = child.to;
        }
        if (start < state.to) {
          [].push.apply(allChildren, rawTokens(start, state.to));
        }
        state.children = allChildren;

        // Finally feed the sequence into the rule creator
        // to replace the state object with something more
        // useful.
        if (state.rule.creatorFunction) {
          var objs = $.map(allChildren, function(state) {
            return state.token ? state : state.object;
          });
          state.object = state.rule.creatorFunction(objs, state);
        }
        // Push ourself on the stack
        stack.push(state);
      }
    };

    // Begin the recursion at the root.
    var stack = [];
    processState(state, true, stack);
    if (stack.length === 1) {
      return stack[0].object;
    } else {
      // We had a problem and couldn't resolve to a single parse root.
      throw new ParserError("I could't parse this. [Error P102]");
    }
  };
  Parser.prototype._isComplete = function(currentState) {
    return currentState.index >= currentState.rule.children.length;
  };
  Parser.prototype._isNextNonterminal = function(currentState) {
    return currentState.rule.children[currentState.index].type ===
      Parser.NON_TERMINAL;
  };
  Parser.prototype._isMatchingTerminal = function(currentState, token) {
    var terminal = currentState.rule.children[currentState.index];
    return token.token === terminal.name;
  };
  Parser.prototype._predict =
    function(currentState, tokenPos, predictionsMade)
  {
    // What we're looking for.
    var nonTerminal = currentState.rule.children[currentState.index];

    // Find rules that will generate our required nonterminal.
    for (var i = 0; i < this.grammar.length; i += 1) {
      if (predictionsMade[i]) continue;

      var rule = this.grammar[i];
      if (rule.name === nonTerminal.name) {
        // Add to the predictions made.
        predictionsMade[i] = true;

        // This rule produces what we predict is needed, so
        // add it to the chart.
        var newState = {
          rule:rule,
          from:tokenPos,
          to:tokenPos,
          index:0,
          parent:currentState
        };
        this._addState(tokenPos, newState);
      }
    }
  };
  Parser.prototype._scan = function(currentState, tokenPos) {
    // Check we have what we're looking for.
    var token = this.tokens[tokenPos];
    if (token === undefined) return;

    if (this._isMatchingTerminal(currentState, token)) {
      // Move this state on.
      var newState = {
        rule:currentState.rule,
        from:currentState.from,
        to:tokenPos+1,
        index:currentState.index+1,
        parent:currentState
      };
      this._addState(tokenPos+1, newState);
    }
  };
  Parser.prototype._complete = function(currentState, tokenPos) {
    var from = currentState.from;

    // Find all states back where this one started that might be
    // waiting on this to finish, and move them to the current
    // position.
    var states = this.states[from];
    for (var i = 0; i < states.length; i += 1) {
      var state = states[i];
      var nonTerminal = state.rule.children[state.index];
      if (nonTerminal.type === Parser.NON_TERMINAL &&
          currentState.rule.name === nonTerminal.name)
      {
        var newState = {
          rule:state.rule,
          from:state.from,
          to:tokenPos,
          index:state.index+1,
          parent:currentState,
          complete:true
        };
        this._addState(tokenPos, newState);
      }
    }
  };

  /* Generates a parser ready rule structure from a text rule of the
   * form ".name ::= .foo bar .cube" where . precedes non-terminals. */
  Parser.makeRule = function(text, creatorFunction) {
    var match = /^\s*\.?(.*?)\s*::=\s*(.*?)\s*$/.exec(text);
    var children = match[2].split(/\s+/);
    var rule = {
      name:match[1],
      children: [],
      text:text,
      creatorFunction:creatorFunction
    };
    for (var i = 0; i < children.length; i += 1) {
      var child = children[i];
      if (child.substr(0, 1) === '.') {
        rule.children.push({
          type:Parser.NON_TERMINAL,
          name:child.substr(1)
        });
      } else {
        rule.children.push({type:Parser.TERMINAL, name:child});
      }
    }
    return rule;
  };

  module.exports = {
    TokenizerError: TokenizerError,
    tokenize: tokenize,
    ParserError: ParserError,
    Parser: Parser
  };

}());
