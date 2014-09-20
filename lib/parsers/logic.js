/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');
  var assert = require('assert');

  var gp = require('./gp');
  var engine = require('../engine');

  var tokenRules = [
    {regex:/and|AND/, token:"conjunction"},
    {regex:/or|OR/, token:"disjunction"},
    {regex:/not|NOT/, token:"negation"},
    {regex:/true|TRUE/, token:"boolean"},
    {regex:/false|FALSE/, token:"boolean"},
    {regex:/\=/, token:"equals"},
    {regex:/<=|>=|<|>|!=/, token:"comparator"},
    {regex:/\+=|-=|\*=|\/=/, token:"modification-operator"},
    {regex:/\+|-/, token:"additive-operator"},
    {regex:/\/|\*|%/, token:"mult-operator"},
    {regex:/(-)?([0-9]+(\.([0-9]+)?)?|\.[0-9]+)/, token:"number"},
    {regex:/[a-zA-Z][\-a-zA-Z0-9_]*/, token:"name"},
    {regex:/\(/, token:"open-paren"},
    {regex:/\)/, token:"close-paren"},
    {regex:/,/, token:"comma"},
    {regex:/;/, token:"semi-colon"},
    {regex:/\./, token:"dot"},
    {regex:/\s+/, token:undefined} // Skipped - doesn't appear in tokens
  ];

  var _rule = gp.Parser.makeRule;

  // Create a parsing function that passes through its content.
  var _select = function(index) {
    return function(sequence, _) {
      return sequence[index];
    };
  };

  // Parsing function to infix a terminal symbol between two arguments
  // with parens.
  var _infix = function(sequence, _) {
    return _sequence(['('], sequence[0], [' ', sequence[1].text, ' '],
                     sequence[2], [')']);
  };

  // Parsing function to build a function, with optional arguments.
  var _fn = function(sequence, _) {
    if (sequence.length == 4) {
      return _sequence(['this.', sequence[0].text, '('],
                       sequence[2], [')']);
    } else {
      return _sequence(['this.', sequence[0].text, '()']);
    }
  };

  // Combine multiple sequences into one.
  var _sequence = function() {
    var result = [];
    for (var i = 0; i < arguments.length; ++i) {
      result.push.apply(result, arguments[i]);
    }
    return result;
  };


  var parserRules = [
    // Root names are .predicate and .command (for actions)
    // Dummy rules to avoid unreferenced rule errors.
    _rule(".root ::= .command", _select(0)),
    _rule(".root ::= .predicate", _select(0)),

    // Content rules.
    _rule(".actions ::= .command semi-colon .actions",
          function(sequence, _) {
            return _sequence(sequence[0], ['\n'], sequence[2]);
          }),
    _rule(".actions ::= .command semi-colon .actions semi-colon",
          function(sequence, _) {
            return _sequence(sequence[0], ['\n'], sequence[2]);
          }),
    _rule(".actions ::= .command", _select(0)),
    _rule(".command ::= .quality modification-operator .arithmetic",
          function(sequence, _) {
            return _sequence(sequence[0], [' = ('], sequence[0],
                             [' || 0) ', sequence[1].text.substr(0, 1), ' '],
                             sequence[2], [';']);
          }),
    _rule(".command ::= .quality equals .arithmetic",
          function(sequence, _) {
            return _sequence(sequence[0], [' = '], sequence[2], [';']);
          }),

    _rule(".predicate ::= .bool-exp",
          function(sequence, _) {
            return _sequence(['return '], sequence[0], [';']);
          }),
    _rule(".bool-exp ::= .bool-exp conjunction .bool-exp",
          function(sequence, _) {
            return _sequence(['('], sequence[0], [' && '], sequence[2], [')']);
          }),
    _rule(".bool-exp ::= .bool-exp disjunction .bool-exp",
          function(sequence, _) {
            return _sequence(['('], sequence[0], [' || '], sequence[2], [')']);
          }),
    _rule(".bool-exp ::= negation .neg-bool-exp",
          function(sequence, _) {
            return _sequence(['(!'], sequence[1], [')']);
          }),
    _rule(".bool-exp ::= .neg-bool-exp", _select(0)),
    _rule(".neg-bool-exp ::= open-paren .bool-exp close-paren",
          function(sequence, _) {
            return _sequence(['('], sequence[1], [')']);
          }),
    _rule(".neg-bool-exp ::= .comparison", _select(0)),
    _rule(".comparison ::= .arithmetic comparator .arithmetic", _infix),
    _rule(".comparison ::= .arithmetic equals .arithmetic",
          function(sequence, _) {
            return _sequence(['('], sequence[0], ['==='], sequence[2], [')']);
          }),
    _rule(".comparison ::= boolean", function(sequence, _) {
      return [sequence[0].text.toLowerCase()];
    }),
    _rule(".arithmetic ::= .arithmetic additive-operator .arith-term", _infix),
    _rule(".arithmetic ::= .arith-term", _select(0)),
    _rule(".arith-term ::= .arith-term mult-operator .arith-factor", _infix),
    _rule(".arith-term ::= .arith-factor", _select(0)),
    _rule(".arith-factor ::= .quality-safe", _select(0)),
    _rule(".arith-factor ::= number", function(sequence, _) {
      return [parseFloat(sequence[0].text)];
    }),
    _rule(".arith-factor ::= open-paren .arithmetic close-paren", _select(1)),
    _rule(".arith-factor ::= .function-call", _select(0)),
    _rule(".quality-safe ::= .quality", function(sequence, _) {
      return _sequence(["("], sequence[0], [" || 0)"]);
    }),
    _rule(".quality ::= name", function(sequence, _) {
      return ["Q['", sequence[0].text, "']"];
    }),
    _rule(".function-call ::= name open-paren close-paren", _fn),
    _rule(".function-call ::= name open-paren .arguments close-paren", _fn),
    _rule(".arguments ::= .argument comma .arguments",
          function(sequence, _) {
            return _sequence(sequence[0], [', '], sequence[2]);
          }),
    _rule(".arguments ::= .argument", _select(0)),
    _rule(".argument ::= .quality-safe", _select(0)),
    _rule(".argument ::= .arithmetic", _select(0)),
    _rule(".argument ::= .bool-exp", _select(0))
  ];

  var tokenizer = new gp.Tokenizer(tokenRules);
  var parser = new gp.Parser(parserRules);

  var getMagic = function(logicSource, root, callback) {
    tokenizer.run(logicSource, function(err, tokens) {
      if (err) return callback(err);
      parser.run(tokens, root, function(err, parse) {
        if (err) return callback(err);
        else callback(null, parse.object.join(''));
      });
    });
  };

  var compile = function(logicSource, root, callback) {
    getMagic(logicSource, root, function(err, magic) {
      if (err) return callback(err);
      var fn = engine.makeFunctionFromSource(magic);
      return callback(null, fn);
    });
  };

  var compilePredicate = function(source, callback) {
    compile(source, 'predicate', callback);
  };

  var compileActions = function(source, callback) {
    compile(source, 'actions', callback);
  };

  module.exports = {
    getMagic: getMagic,
    compilePredicate: compilePredicate,
    compileActions: compileActions
  };

}());
