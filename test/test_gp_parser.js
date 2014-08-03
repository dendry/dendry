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

  describe("gp-parser", function() {
    describe("tokenizer", function() {
      it("should tokenize expression", function() {
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
        tokenizer.run("and andy", function(err, tokens) {
          (!!err).should.be.false;
          tokens.length.should.equal(2);
          tokens[0].token.should.equal('conjunction');
          tokens[1].token.should.equal('name');
        });
      });

    });
  });

}());
