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
        parse.makeEnsureIntegerInRange(0,10)("4", function(err, val) {
          val.should.equal(4);
          done();
        });
      });

      it("should reject non-integers with range", function(done) {
        parse.makeEnsureIntegerInRange(0, 60)("bob", function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: Not a valid whole number.");
          (val === undefined).should.be.true;
          done();
        });
      });

      it("should reject numbers outside range", function(done) {
        parse.makeEnsureIntegerInRange(0, 32)("45", function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: 45 is not in range 0-32.");
          (val === undefined).should.be.true;
          done();
        });
      });

      it("supports half open range with minimum", function(done) {
        parse.makeEnsureIntegerInRange(0, undefined)("-45", function(err, val){
          (!!err).should.be.true;
          err.toString().should.equal("Error: -45 is not in range 0+.");
          (val === undefined).should.be.true;
          done();
        });
      });
      it("supports half open range with maximum", function(done) {
        parse.makeEnsureIntegerInRange(undefined, 32)("45", function(err, val){
          (!!err).should.be.true;
          err.toString().should.equal("Error: 45 is not in range -32.");
          (val === undefined).should.be.true;
          done();
        });
      });

    });

    // ----------------------------------------------------------------------

    describe("equality enforcing", function() {
      it("allows matches to pass", function(done) {
        parse.makeEnsureEqualTo("foo")("foo", function(err, val) {
          (!!err).should.be.false;
          val.should.equal('foo');
          done();
        });
      });

      it("trims whitespace before match", function(done) {
        parse.makeEnsureEqualTo("foo  ")("  foo", function(err, val) {
          (!!err).should.be.false;
          val.should.equal('foo');
          done();
        });
      });

      it("should reject mismatches", function(done) {
        parse.makeEnsureEqualTo("foo")("bar", function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Property must equal 'foo', 'bar' found instead.");
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

    // ----------------------------------------------------------------------

    describe("schema parsing", function() {
      it("validates matching content", function(done) {
        var schema = {
          foo: {required:true, clean:null},
          bar: {required:true, clean:parse.makeEnsureEqualTo('bar')},
          sun: {required:false, clean:null}
        };
        var content = {
          foo: 'foo',
          bar: 'bar'
        };
        var ensureMatches = parse.makeEnsureObjectMatchesSchema(schema);
        ensureMatches(content, function(err, result) {
          (!!err).should.be.false;
          result.should.eql(content);
          done();
        });
      });

      it("enforces required properties", function(done) {
        var schema = {
          foo: {required:true, clean:null},
          bar: {required:true, clean:parse.makeEnsureEqualTo('bar')}
        };
        var content = {
          bar: 'bar'
        };
        var ensureMatches = parse.makeEnsureObjectMatchesSchema(schema);
        ensureMatches(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Required property 'foo' missing.");
          (result === undefined).should.be.true;
          done();
        });
      });

      it("complains at additional properties", function(done) {
        var schema = {
          foo: {required:true, clean:null},
        };
        var content = {
          foo: 'foo',
          bar: 'bar'
        };
        var ensureMatches = parse.makeEnsureObjectMatchesSchema(schema);
        ensureMatches(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Unknown properties: 'bar'.");
          (result === undefined).should.be.true;
          done();
        });
      });

      it("validates data using clean functions", function(done) {
        var schema = {
          foo: {required:true, clean:null},
          bar: {required:true, clean:parse.makeEnsureEqualTo('bar')}
        };
        var content = {
          foo: 'foo',
          bar: 'sun'
        };
        var ensureMatches = parse.makeEnsureObjectMatchesSchema(schema);
        ensureMatches(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Property must equal 'bar', 'sun' found instead.");
          (result === undefined).should.be.true;
          done();
        });
      });

    });

    // ----------------------------------------------------------------------

    describe("list schema parsing", function() {
      it("validates matching content", function(done) {
        var schema = {
          foo: {required:true, clean:null},
          bar: {required:false, clean:parse.makeEnsureEqualTo('bar')},
        };
        var content = [
          {foo: 'foo', bar: 'bar'},
          {foo: 'sun'},
          {foo: 'dock', bar: 'bar'}
        ];
        var ensureMatches = parse.makeEnsureListItemsMatchSchema(schema);
        ensureMatches(content, function(err, result) {
          (!!err).should.be.false;
          result.should.eql(content);
          done();
        });
      });

      it("raises an error if any element is invalid", function(done) {
        var schema = {
          foo: {required:true, clean:null},
          bar: {required:false, clean:parse.makeEnsureEqualTo('bar')},
        };
        var content = [
          {foo: 'foo', bar: 'bar'},
          {foo: 'sun'},
          {foo: 'dock', bar: 'trog'}
        ];
        var ensureMatches = parse.makeEnsureListItemsMatchSchema(schema);
        ensureMatches(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Property must equal 'bar', 'trog' found instead.");
          (result === undefined).should.be.true;
          done();
        });
      });
    });

    // ----------------------------------------------------------------------

    describe("id schema parsing", function() {
      it("validates matching content", function(done) {
        var schemae = {
          'foo': {
            id: {required:true, clean:null},
            bar: {required:false, clean:parse.makeEnsureEqualTo('bar')},
          },
          'sun': {
            id: {required:true, clean:null},
            bar: {required:false, clean:parse.makeEnsureEqualTo('bar')},
          },
          'dock': {
            id: {required:true, clean:null},
            bar: {required:false, clean:parse.makeEnsureEqualTo('trog')},
          }
        };
        var content = [
          {id: 'foo', bar: 'bar'},
          {id: 'sun'},
          {id: 'dock', bar: 'trog'}
        ];
        var ensureMatches = parse.makeEnsureListItemsMatchSchemaById(schemae);
        ensureMatches(content, function(err, result) {
          (!!err).should.be.false;
          result.should.eql(content);
          done();
        });
      });

      it("validates unknown id against default schema", function(done) {
        var schemae = {
          'foo': {
            id: {required:true, clean:null},
            bar: {required:false, clean:parse.makeEnsureEqualTo('bar')},
          },
          '$default': {
            id: {required:true, clean:null},
            bar: {required:false, clean:parse.makeEnsureEqualTo('trog')},
          }
        };
        var content = [
          {id: 'foo', bar: 'bar'},
          {id: 'sun'},
          {id: 'dock', bar: 'trog'}
        ];
        var ensureMatches = parse.makeEnsureListItemsMatchSchemaById(schemae);
        ensureMatches(content, function(err, result) {
          (!!err).should.be.false;
          result.should.eql(content);
          done();
        });
      });

      it("fails with an unknown id", function(done) {
        var schemae = {
          'foo': {
            id: {required:true, clean:null},
            bar: {required:false, clean:parse.makeEnsureEqualTo('bar')},
          },
          'dock': {
            id: {required:true, clean:null},
            bar: {required:false, clean:parse.makeEnsureEqualTo('trog')},
          }
        };
        var content = [
          {id: 'foo', bar: 'bar'},
          {id: 'sun'},
          {id: 'dock', bar: 'trog'}
        ];
        var ensureMatches = parse.makeEnsureListItemsMatchSchemaById(schemae);
        ensureMatches(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Found an item with an unknown id 'sun'.");
          (result === undefined).should.be.true;
          done();
        });
      });

      it("raises an error if any element is invalid", function(done) {
        var schemae = {
          'foo': {
            id: {required:true, clean:null},
            bar: {required:false, clean:parse.makeEnsureEqualTo('bar')},
          },
          '$default': {
            id: {required:true, clean:null},
            bar: {required:false, clean:parse.makeEnsureEqualTo('trog')},
          }
        };
        var content = [
          {id: 'foo', bar: 'bar'},
          {id: 'sun'},
          {id: 'dock', bar: 'foo'}
        ];
        var ensureMatches = parse.makeEnsureListItemsMatchSchemaById(schemae);
        ensureMatches(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Property must equal 'trog', 'foo' found instead.");
          (result === undefined).should.be.true;
          done();
        });
      });


    });
  });
}());
