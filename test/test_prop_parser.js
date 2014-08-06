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

  var parse = require('../lib/prop_parser');

  describe("prop-parser", function() {
    
    // ----------------------------------------------------------------------
    
    describe("integer parsing", function() {
      it("should handle positive integers", function(done) {
        parse.parseInteger("45", function(err, val) {
          val.should.equal(45);
          done();
        });
      });

      it("should handle negative integers", function(done) {
        parse.parseInteger("-45", function(err, val) {
          val.should.equal(-45);
          done();
        });
      });

      it("should convert floating point numbers to integers", function(done) {
        parse.parseInteger("45.5", function(err, val) {
          val.should.equal(45);
          done();
        });
      });
      
      it("should reject non-integers", function(done) {
        parse.parseInteger("bob", function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: Not a valid whole number.");
          (val === undefined).should.be.true;
          done();
        });
      });
      
      it("should validate integers in range", function(done) {
        parse.parseIntegerInRange("4", 0, 10, function(err, val) {
          val.should.equal(4);
          done();
        });
      });

      it("should reject non-integers with range", function(done) {
        parse.parseIntegerInRange("bob", 0, 60, function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: Not a valid whole number.");
          (val === undefined).should.be.true;
          done();
        });
      });
      
      it("should reject numbers outside range", function(done) {
        parse.parseIntegerInRange("45", 0, 32, function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: 45 is not in range 0-32.");
          (val === undefined).should.be.true;
          done();
        });
      });
      
      it("supports half open range with minimum", function(done) {
        parse.parseIntegerInRange("-45", 0, undefined, function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: -45 is not in range 0+.");
          (val === undefined).should.be.true;
          done();
        });
      });
      it("supports half open range with maximum", function(done) {
        parse.parseIntegerInRange("45", undefined, 32, function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: 45 is not in range -32.");
          (val === undefined).should.be.true;
          done();
        });
      });

    });

    // ----------------------------------------------------------------------
    
    describe("tag list parsing", function() {
      it("handles hash prefix or no prefix", function(done) {
        parse.parseTagList("alpha, #bravo", function(err, list) {
          (!!err).should.be.false;
          list.length.should.equal(2);
          list[0].should.equal('alpha');
          list[1].should.equal('bravo');
          done();
        });
      });
      it("handles any valid separator", function(done) {
        parse.parseTagList("alpha, bravo; charlie  delta", function(err,list) {
          (!!err).should.be.false;
          list.length.should.equal(4);
          list[0].should.equal('alpha');
          list[1].should.equal('bravo');
          list[2].should.equal('charlie');
          list[3].should.equal('delta');
          done();
        });
      });
      it("supports single tags with trailing whitespace", function(done) {
        parse.parseTagList("#alpha ", function(err, list) {
          (!!err).should.be.false;
          list.length.should.equal(1);
          list[0].should.equal('alpha');
          done();
        });
      });
      it("should reject bad tags", function(done) {
        parse.parseTagList("alpha, bravo, $charlie", function(err, list) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: Tag 3 is not valid.");
          (list === undefined).should.be.true;
          done();
        });
      });

    });
  });
}());

