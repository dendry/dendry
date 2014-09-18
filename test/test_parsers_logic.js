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

  var noerr = function(err) {
    if (err) console.trace(err);
    (!!err).should.be.false;
  };

  var logic = require('../lib/parsers/logic');

  describe("logic-compiler", function() {

    // ----------------------------------------------------------------------

    describe('predicate', function() {
      it("should compile a trivial predicate", function(done) {
        logic.compilePredicate('true', function(err, fn) {
          noerr(err);
          var engine = {};
          var state = {};
          var Q = {};
          fn(engine, state, Q).should.be.true;
          done();
        });
      });

      it("should default to 0 on unknown quality access", function(done) {
        logic.compilePredicate('foo = 0', function(err, fn) {
          noerr(err);
          var engine = {};
          var state = {};
          var Q = {};
          fn(engine, state, Q).should.be.true;
          done();
        });
      });

      it("should support complex boolean queries", function(done) {
        logic.compilePredicate(
          'foo = 1 and (foo < bar or not foo > sun)',
          function(err, fn) {
            noerr(err);
            var engine = {};
            var state = {};
            var Q = {
              foo: 1,
              bar: 1,
              sun: 1
            };
            fn(engine, state, Q).should.be.true;
            done();
          });
      });

      it("should support function calls", function(done) {
        logic.compilePredicate(
          'foo() = 2 and bar(3, 2) = 6',
          function(err, fn) {
            noerr(err);
            var engine = {};
            var state = {
              functions: {
                foo: function() { return 2; },
                bar: function(a, b) { return a*b; }
              }
            };
            var Q = {};
            fn(engine, state, Q).should.be.true;
            done();
          });
      });

      it("should pass on tokenizer errors", function(done) {
        logic.compilePredicate('$foo', function(err, fn) {
          (!!err).should.be.true;
          err.toString().should.equal(
            'Error: Unrecognized content at position 0.'
          );
          done();
        });
      });

      it("should pass on compiler errors", function(done) {
        logic.compilePredicate('true foo', function(err, fn) {
          (!!err).should.be.true;
          err.toString().should.equal(
            'Error: No valid way to parse this content.'
          );
          done();
        });
      });
    });

    // ----------------------------------------------------------------------

    describe('actions', function() {
      it("should set qualities", function(done) {
        logic.compileActions('foo = 1', function(err, fn) {
          noerr(err);
          var engine = {};
          var state = {};
          var Q = {};
          fn(engine, state, Q);
          Q.foo.should.equal(1);
          done();
        });
      });

      it("should allow multiple statements", function(done) {
        logic.compileActions('foo = 1; foo += 1;', function(err, fn) {
          noerr(err);
          var engine = {};
          var state = {};
          var Q = {};
          fn(engine, state, Q);
          Q.foo.should.equal(2);
          done();
        });
      });

      it("doesn't require terminal semicolon", function(done) {
        logic.compileActions('foo = 1; foo += 1', function(err, fn) {
          noerr(err);
          var engine = {};
          var state = {};
          var Q = {};
          fn(engine, state, Q);
          Q.foo.should.equal(2);
          done();
        });
      });

      it("should default to 0 on unknown quality modification", function(done) {
        logic.compileActions('bar *= 2; foo += 1;', function(err, fn) {
          noerr(err);
          var engine = {};
          var state = {};
          var Q = {};
          fn(engine, state, Q);
          Q.bar.should.equal(0);
          Q.foo.should.equal(1);
          done();
        });
      });
    });

    // ----------------------------------------------------------------------

  });

}());
