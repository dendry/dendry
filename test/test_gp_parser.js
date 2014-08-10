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

  var getSampleTokenRules = function() {
    return [
        {regex:/and|AND/, token:"conjunction"},
        {regex:/or|OR/, token:"disjunction"},
        {regex:/not|NOT/, token:"negation"},
        {regex:/true|TRUE/, token:"boolean"},
        {regex:/false|FALSE/, token:"boolean"},
        {regex:/\=/, token:"equals"},
        {regex:/<=|>=|<|>|!=/, token:"comparator"},
        {regex:/\+=|-=|\*=|\/=|:=/, token:"modification-operator"},
        {regex:/\+|-/, token:"additive-operator"},
        {regex:/\/|\*|%/, token:"mult-operator"},
        {regex:/(-)?([0-9]+(\.([0-9]+)?)?|\.[0-9]+)/, token:"number"},
        {regex:/[a-zA-Z][\-a-zA-Z0-9_]*/, token:"name"},
        {regex:/\(/, token:"open-paren"},
        {regex:/\)/, token:"close-paren"},
        {regex:/,/, token:"comma"},
        {regex:/\./, token:"dot"},
        {regex:/\s+/, token:undefined} // Skipped - doesn't appear in tokens
    ];
  };

  var getSampleParserRules = function() {
    var _rule = function(rule) {
      return parse.Parser.makeRule(rule, function(sequence, _) {
        return sequence[0];
      });
    };
    return [
        _rule(".root ::= .expression"),
        _rule(".root ::= .command"),
        _rule(".expression ::= .function-call"),
        _rule(".expression ::= .bool-exp"),
        _rule(".expression ::= name"),
        _rule(".bool-exp ::= .bool-exp conjunction .bool-exp"),
        _rule(".bool-exp ::= .bool-exp disjunction .bool-exp"),
        _rule(".bool-exp ::= negation .neg-bool-exp"),
        _rule(".bool-exp ::= .neg-bool-exp"),
        _rule(".neg-bool-exp ::= open-paren .bool-exp close-paren"),
        _rule(".neg-bool-exp ::= .comparison"),
        _rule(".comparison ::= .arithmetic comparator .arithmetic"),
        _rule(".comparison ::= .arithmetic equals .arithmetic"),
        _rule(".comparison ::= boolean"),
        _rule(".arithmetic ::= .arithmetic additive-operator .arith-term"),
        _rule(".arithmetic ::= .arith-term"),
        _rule(".arith-term ::= .arith-term mult-operator .arith-factor"),
        _rule(".arith-term ::= .arith-factor"),
        _rule(".arith-factor ::= .quality"),
        _rule(".arith-factor ::= number"),
        _rule(".arith-factor ::= open-paren .arithmetic close-paren"),
        _rule(".arith-factor ::= .function-call"),
        _rule(".command ::= .quality modification-operator .arithmetic"),
        _rule(".command ::= .quality equals .arithmetic"),
        _rule(".quality ::= quality dot name"),
        _rule(".quality ::= name"),
        _rule(".function-call ::= name open-paren close-paren"),
        _rule(".function-call ::= name open-paren .arguments close-paren"),
        _rule(".arguments ::= .argument comma .arguments"),
        _rule(".arguments ::= .argument"),
        _rule(".argument ::= .expression"),
        _rule(".argument ::= .arithmetic")
    ];
  };

  describe("gp-parser", function() {

    // ----------------------------------------------------------------------

    describe("tokenizer", function() {
      it("should tokenize a simple expression", function(done) {
        var rules = getSampleTokenRules();
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
          done();
        });
      });

      it("should fail for an unknown token in the string", function(done) {
        var rules = getSampleTokenRules();
        var tokenizer = new parse.Tokenizer(rules, false);
        tokenizer.run("foo $ 2", function(err, tokens) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Unrecognized content at 4.");
          (tokens === undefined).should.be.true;
          done();
        });
      });

      it("should fail for an unknown token at the end", function(done) {
        var rules = getSampleTokenRules();
        var tokenizer = new parse.Tokenizer(rules, false);
        tokenizer.run("foo < 2 $", function(err, tokens) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Unrecognized content at 8.");
          (tokens === undefined).should.be.true;
          done();
        });
      });

      it("generates a null token for unknown content inside", function(done) {
        var rules = getSampleTokenRules();
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
          done();
        });
      });

      it("generates a null token for unknown trailing content", function(done){
        var rules = getSampleTokenRules();
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
          done();
        });
      });

      it("should match longest possible token", function(done) {
        var rules = getSampleTokenRules();
        var tokenizer = new parse.Tokenizer(rules, true);
        tokenizer.run("and andy or for", function(err, tokens) {
          (!!err).should.be.false;
          tokens.length.should.equal(4);
          tokens[0].token.should.equal('conjunction');
          tokens[1].token.should.equal('name');
          tokens[2].token.should.equal('disjunction');
          tokens[3].token.should.equal('name');
          done();
        });
      });
    });

    // ----------------------------------------------------------------------

    describe("parser", function() {
      it("should parse a simple expression", function(done) {
        var trules = getSampleTokenRules();
        var prules = getSampleParserRules();
        var tokenizer = new parse.Tokenizer(trules, false);
        var parser = new parse.Parser(prules);
        tokenizer.run("foo < 3", function(err, tokens) {
          (!!err).should.be.false;
          var result = parser.run(tokens, 'root', function(err, tree) {
            (!!err).should.be.false;
            done();
          });
        });
      });

      it("assumes a root of 'root'", function(done) {
        var trules = getSampleTokenRules();
        var prules = getSampleParserRules();
        var tokenizer = new parse.Tokenizer(trules, false);
        var parser = new parse.Parser(prules);
        tokenizer.run("foo < 3", function(err, tokens) {
          (!!err).should.be.false;
          var result = parser.run(tokens, function(err, tree) {
            (!!err).should.be.false;
            tree.rule.name.should.equal('root');
            done();
          });
        });
      });

      it("can't parse from an unknown root", function(done) {
        var trules = getSampleTokenRules();
        var prules = getSampleParserRules();
        var tokenizer = new parse.Tokenizer(trules, false);
        var parser = new parse.Parser(prules);
        tokenizer.run("foo < 3", function(err, tokens) {
          (!!err).should.be.false;
          var result = parser.run(tokens, 'unknown-root', function(err, tree) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: No matching rules for that root.");
            (tree === undefined).should.be.true;
            done();
          });
        });
      });

      it("fails when given unreachable rules", function() {
        var prules = getSampleParserRules();
        prules.splice(7, 2);
        (function() {
          new parse.Parser(prules);
        }).should.throw("Rule neg-bool-exp is never referenced.");
      });

      it("fails when undefined rules are referenced", function() {
        var prules = getSampleParserRules();
        prules.splice(9, 2);
        (function() {
          new parse.Parser(prules);
        }).should.throw(
          "Non-terminal neg-bool-exp has no rule that can generate it.");
      });

      it("fails when a parse is ambiguous", function(done) {
        var _rule = function(rule) {
          return parse.Parser.makeRule(rule, function(sequence, _) {
            return sequence[0];
          });
        };
        var prules = [
          _rule(".root ::= .expression name"),
          _rule(".root ::= name name"),
          _rule(".expression ::= name"),
        ];
        var trules = getSampleTokenRules();
        var tokenizer = new parse.Tokenizer(trules, false);
        var parser = new parse.Parser(prules);
        tokenizer.run("foo bar", function(err, tokens) {
          (!!err).should.be.false;
          var result = parser.run(tokens, 'root', function(err, tree) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: Content is ambiguous, 2 ways to parse it.");
            (tree === undefined).should.be.true;
            done();
          });
        });
      });

      it("handles redundant rules", function(done) {
        var _rule = function(rule) {
          return parse.Parser.makeRule(rule, function(sequence, _) {
            return sequence[0];
          });
        };
        var prules = [
          _rule(".root ::= .expression"),
          _rule(".expression ::= .value"),
          _rule(".expression ::= name"),
          _rule(".value ::= name"),
        ];
        var trules = getSampleTokenRules();
        var tokenizer = new parse.Tokenizer(trules, false);
        var parser = new parse.Parser(prules);
        tokenizer.run("foo", function(err, tokens) {
          (!!err).should.be.false;
          var result = parser.run(tokens, 'root', function(err, tree) {
            (!!err).should.be.false;
            var twoDown = tree.children[0].rule.children[0];
            twoDown.type.should.equal('terminal');
            twoDown.name.should.equal('name');
            done();
          });
        });
      });

      it("fails when no parse is possible", function(done) {
        var _rule = function(rule) {
          return parse.Parser.makeRule(rule, function(sequence, _) {
            return sequence[0];
          });
        };
        var prules = [
          _rule(".root ::= .expression name"),
          _rule(".expression ::= name"),
        ];
        var trules = getSampleTokenRules();
        var tokenizer = new parse.Tokenizer(trules, false);
        var parser = new parse.Parser(prules);
        tokenizer.run("foo and", function(err, tokens) {
          (!!err).should.be.false;
          var result = parser.run(tokens, 'root', function(err, tree) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: No valid way to parse this content.");
            (tree === undefined).should.be.true;
            done();
          });
        });
      });

    });
  });

}());
