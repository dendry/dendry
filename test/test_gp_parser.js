/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var parse = require('../lib/gp_parser');

  var get_sample_token_rules = function() {
    var TOKEN_CONJUNCTION = "conjunction";
    var TOKEN_DISJUNCTION = "disjunction";
    var TOKEN_NEGATION = "negation";
    var TOKEN_BOOLEAN = "boolean";
    var TOKEN_EQUALS = "equals";
    var TOKEN_COMPARISON = "comparator";
    var TOKEN_MODIFICATION_OPERATOR = "modification-operator";
    var TOKEN_ADDITIVE_OPERATOR = "additive-operator";
    var TOKEN_MULTIPLICATIVE_OPERATOR = "mult-operator";
    var TOKEN_NUMBER = "number";
    var TOKEN_NAME = "name";
    var TOKEN_OPEN_PAREN = "open-paren";
    var TOKEN_CLOSE_PAREN = "close-paren";
    var TOKEN_COMMA = "comma";
    var TOKEN_DOT = "dot";
    return [
        {regex:/and|AND/, token:TOKEN_CONJUNCTION},
        {regex:/or|OR/, token:TOKEN_DISJUNCTION},
        {regex:/not|NOT/, token:TOKEN_NEGATION},
        {regex:/true|TRUE/, token:TOKEN_BOOLEAN},
        {regex:/false|FALSE/, token:TOKEN_BOOLEAN},
        {regex:/\=/, token:TOKEN_EQUALS},
        {regex:/<=|>=|<|>|!=/, token:TOKEN_COMPARISON},
        {regex:/\+=|-=|\*=|\/=|:=/, token:TOKEN_MODIFICATION_OPERATOR},
        {regex:/\+|-/, token:TOKEN_ADDITIVE_OPERATOR},
        {regex:/\/|\*|%/, token:TOKEN_MULTIPLICATIVE_OPERATOR},
        {regex:/(-)?([0-9]+(\.([0-9]+)?)?|\.[0-9]+)/, token:TOKEN_NUMBER},
        {regex:/[a-zA-Z][\-a-zA-Z0-9_]*/, token:TOKEN_NAME},
        {regex:/\(/, token:TOKEN_OPEN_PAREN},
        {regex:/\)/, token:TOKEN_CLOSE_PAREN},
        {regex:/,/, token:TOKEN_COMMA},
        {regex:/\./, token:TOKEN_DOT},
        {regex:/\s+/, token:undefined} // Skipped - doesn't appear in tokens
    ];
  };
  
  var get_sample_parser_rules = function() {
    var TYPE_BOOLEAN = 'true/false value';
    var TYPE_NUMBER = 'number';
    var TYPE_COMMAND = 'command';
    var TYPE_FUNCTION = 'function';
    var _pass = function(index) {
        return function(sequence, state) {
            return sequence[index];
        };
    };
    var _pass0 = _pass(0);
    var _pass1 = _pass(1);
    var _seq = function(sequence, state) { return sequence; };
    var _valid_fn = function(sequence, state) {
        return TYPE_FUNCTION;
    };
    var _bool = function(sequence, state) {
        return TYPE_BOOLEAN;
    };
    var _number = function(sequence, state) {
        return TYPE_NUMBER;
    };
    var _cmd = function(sequence, state) {
        return TYPE_COMMAND;
    };

    var _rule = parse.Parser.makeRule; // Convenience alias.
    return [
        _rule(".root ::= .expression", _pass0),
        _rule(".root ::= .command", _pass0),
        _rule(".expression ::= .function-call", _pass0),
        _rule(".expression ::= .bool-exp", _pass0),
        _rule(".expression ::= name", _number),
        _rule(".bool-exp ::= .bool-exp conjunction .bool-exp", _bool),
        _rule(".bool-exp ::= .bool-exp disjunction .bool-exp", _bool),
        _rule(".bool-exp ::= negation .neg-bool-exp", _bool),
        _rule(".bool-exp ::= .neg-bool-exp", _pass0),
        _rule(".neg-bool-exp ::= open-paren .bool-exp close-paren", _pass1),
        _rule(".neg-bool-exp ::= .comparison", _pass0),
        _rule(".comparison ::= .arithmetic comparator .arithmetic", _bool),
        _rule(".comparison ::= .arithmetic equals .arithmetic", _bool),
        _rule(".comparison ::= boolean", _bool),
        _rule(".arithmetic ::= .arithmetic additive-operator .arith-term",
              _number),
        _rule(".arithmetic ::= .arith-term", _pass0),
        _rule(".arith-term ::= .arith-term mult-operator .arith-factor",
              _number),
        _rule(".arith-term ::= .arith-factor", _pass0),
        _rule(".arith-factor ::= .quality", _pass0),
        _rule(".arith-factor ::= number", _number),
        _rule(".arith-factor ::= open-paren .arithmetic close-paren", _pass1),
        _rule(".arith-factor ::= .function-call", _pass0),
        _rule(".command ::= .quality modification-operator .arithmetic",
              _cmd),
        _rule(".command ::= .quality equals .arithmetic", _cmd),
        _rule(".quality ::= quality dot name", _number),
        _rule(".quality ::= name", _number),
        _rule(".function-call ::= name open-paren close-paren", _valid_fn),
        _rule(".function-call ::= name open-paren .arguments close-paren",
              _valid_fn),
        _rule(".arguments ::= .argument comma .arguments", function(seq, _) {
            return [seq[0]].concat(seq.slice(2));
        }),
        _rule(".arguments ::= .argument",  _seq),
        _rule(".argument ::= .expression", _pass0),
        _rule(".argument ::= .arithmetic", _pass0)
    ];
  };
  
  describe("gp-parser", function() {
    describe("parser", function() {
      it("should parse a simple expression", function() {
        var trules = get_sample_token_rules();
        var prules = get_sample_parser_rules();
        var tokenizer = new parse.Tokenizer(trules, false);
        var parser = new parse.Parser(prules);
        tokenizer.run("foo < 3", function(err, tokens) {
          (!!err).should.be.false;
          var result = parser.run(tokens, 'root', function(err, tree) {
            (!!err).should.be.false;
          });
        });
      });
    });
          
    // ------------------------------------------------------------------
    
    describe("tokenizer", function() {
      it("should tokenize a simple expression", function() {
        var rules = get_sample_token_rules();
        var tokenizer = new parse.Tokenizer(rules, false);
        tokenizer.run("foo < 2", function(err, tokens) {
          (!!err).should.be.false;
          tokens.length.should.equal(3);
          tokens[0].token.should.equal('name');
          tokens[0].position.should.equal(0);
          tokens[1].token.should.equal('comparator');
          tokens[1].position.should.equal(4);
          tokens[2].token.should.equal('number');
          tokens[2].position.should.equal(6);
        });
      });

      it("should fail for an unknown token in the string", function() {
        var rules = get_sample_token_rules();
        var tokenizer = new parse.Tokenizer(rules, false);
        tokenizer.run("foo $ 2", function(err, tokens) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Unrecognized content at 4.");
          (tokens === undefined).should.be.true;
        });
      });

      it("should fail for an unknown token at the end", function() {
        var rules = get_sample_token_rules();
        var tokenizer = new parse.Tokenizer(rules, false);
        tokenizer.run("foo < 2 $", function(err, tokens) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Unrecognized content at 8.");
          (tokens === undefined).should.be.true;
        });
      });

      it("generates a null token for unknown content inside", function() {
        var rules = get_sample_token_rules();
        var tokenizer = new parse.Tokenizer(rules, true);
        tokenizer.run("foo $ 2", function(err, tokens) {
          (!!err).should.be.false;
          tokens.length.should.equal(3);
          tokens[0].token.should.equal('name');
          tokens[0].position.should.equal(0);
          (tokens[1].token === null).should.be.true;
          tokens[1].text.should.equal('$');
          tokens[1].position.should.equal(4);
          tokens[2].token.should.equal('number');
          tokens[2].position.should.equal(6);
        });
      });

      it("generates a null token for unknown content at the end", function() {
        var rules = get_sample_token_rules();
        var tokenizer = new parse.Tokenizer(rules, true);
        tokenizer.run("foo < 2 $", function(err, tokens) {
          (!!err).should.be.false;
          tokens.length.should.equal(4);
          tokens[0].token.should.equal('name');
          tokens[0].position.should.equal(0);
          tokens[1].token.should.equal('comparator');
          tokens[1].position.should.equal(4);
          tokens[2].token.should.equal('number');
          tokens[2].position.should.equal(6);
          (tokens[3].token === null).should.be.true;
          tokens[3].text.should.equal('$');
          tokens[3].position.should.equal(8);
        });
      });

      it("should match longest possible token", function() {
        var rules = get_sample_token_rules();
        var tokenizer = new parse.Tokenizer(rules, true);
        tokenizer.run("and andy or for", function(err, tokens) {
          (!!err).should.be.false;
          tokens.length.should.equal(4);
          tokens[0].token.should.equal('conjunction');
          tokens[1].token.should.equal('name');
          tokens[2].token.should.equal('disjunction');
          tokens[3].token.should.equal('name');
        });
      });
    });

    // ----------------------------------------------------------------------

    describe("parser", function() {
      // TODO
    });
  });

}());
