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

  var validators = require('../lib/validators');

  describe("validators", function() {

    // ----------------------------------------------------------------------

    describe("integer validation", function() {
      it("should handle positive integers", function(done) {
        validators.validateInteger("45", function(err, val) {
          val.should.equal(45);
          done();
        });
      });

      it("should handle negative integers", function(done) {
        validators.validateInteger("-45", function(err, val) {
          val.should.equal(-45);
          done();
        });
      });

      it("should convert floating point numbers to integers", function(done) {
        validators.validateInteger("45.5", function(err, val) {
          val.should.equal(45);
          done();
        });
      });

      it("should reject non-integers", function(done) {
        validators.validateInteger("bob", function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: Not a valid whole number.");
          (val === undefined).should.be.true;
          done();
        });
      });

      it("should include line number in error, if available", function(done) {
        validators.validateInteger({$value:"bob", $line:4}, function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Line 4: Not a valid whole number.");
          (val === undefined).should.be.true;
          done();
        });
      });

      it("should validate integers in range", function(done) {
        validators.makeEnsureIntegerInRange(0,10)("4", function(err, val) {
          val.should.equal(4);
          done();
        });
      });

      it("should reject non-integers with range", function(done) {
        validators.makeEnsureIntegerInRange(0, 60)("bob", function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: Not a valid whole number.");
          (val === undefined).should.be.true;
          done();
        });
      });

      it("should reject numbers outside range", function(done) {
        validators.makeEnsureIntegerInRange(0, 32)("45", function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: 45 is not in range 0-32.");
          (val === undefined).should.be.true;
          done();
        });
      });

      it("supports half open range with minimum", function(done) {
        var ensure = validators.makeEnsureIntegerInRange(0, undefined);
        ensure("-45", function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal("Error: -45 is not in range 0+.");
          (val === undefined).should.be.true;
          done();
        });
      });

      it("supports half open range with maximum", function(done) {
        var ensure = validators.makeEnsureIntegerInRange(undefined, 32);
        ensure("45", function(err, val) {
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
        validators.makeEnsureEqualTo("P", "foo")("foo", function(err, val) {
          (!!err).should.be.false;
          val.should.equal('foo');
          done();
        });
      });

      it("trims whitespace before match", function(done) {
        validators.makeEnsureEqualTo("P", "foo  ")("  foo", function(err, val) {
          (!!err).should.be.false;
          val.should.equal('foo');
          done();
        });
      });

      it("should reject mismatches", function(done) {
        validators.makeEnsureEqualTo("Prop", "foo")("bar", function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Prop must equal 'foo', 'bar' found instead.");
          (val === undefined).should.be.true;
          done();
        });
      });

      it("should include line number in error, if available", function(done) {
        var prop = {
          $value: "bar",
          $line: 4
        };
        validators.makeEnsureEqualTo("Prop", "foo")(prop, function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Line 4: Prop must equal 'foo', 'bar' found instead.");
          (val === undefined).should.be.true;
          done();
        });
      });
    });

    // ----------------------------------------------------------------------

    describe("tag list validation", function() {
      it("handles hash prefix or no prefix", function(done) {
        validators.validateTagList("alpha, #bravo", function(err, list) {
          (!!err).should.be.false;
          list.length.should.equal(2);
          list[0].should.equal('alpha');
          list[1].should.equal('bravo');
          done();
        });
      });

      it("handles any valid separator", function(done) {
        validators.validateTagList(
          "alpha, bravo; charlie  delta",
          function(err,list) {
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
        validators.validateTagList("#alpha ", function(err, list) {
          (!!err).should.be.false;
          list.length.should.equal(1);
          list[0].should.equal('alpha');
          done();
        });
      });

      it("should reject bad tags", function(done) {
        validators.validateTagList(
          "alpha, bravo, $charlie",
          function(err, list) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: Tag 3 '$charlie' is not valid.");
            (list === undefined).should.be.true;
            done();
          });
      });

      it("should include line number in error, if available", function(done) {
        var prop = {
          $value: "alpha, bravo, $charlie",
          $line: 4
        };
        validators.validateTagList(
          prop,
          function(err, list) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: Line 4: Tag 3 '$charlie' is not valid.");
            (list === undefined).should.be.true;
            done();
          });
      });

    });

    // ----------------------------------------------------------------------

    describe("schema validation", function() {
      it("validates matching content", function(done) {
        var schema = {
          foo: {required:true, validate:null},
          bar: {required:true,
                validate:validators.makeEnsureEqualTo('Property', 'bar')},
          sun: {required:false, validate:null}
        };
        var content = {
          foo: 'foo',
          bar: 'bar'
        };
        var ensure = validators.makeEnsureObjectMatchesSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.false;
          result.should.eql(content);
          done();
        });
      });

      it("enforces required properties", function(done) {
        var schema = {
          foo: {required:true, validate:null},
          bar: {required:true,
                validate:validators.makeEnsureEqualTo('Property', 'bar')}
        };
        var content = {
          bar: 'bar'
        };
        var ensure = validators.makeEnsureObjectMatchesSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Required property 'foo' missing.");
          (result === undefined).should.be.true;
          done();
        });
      });

      it("complains at additional properties", function(done) {
        var schema = {
          foo: {required:true, validate:null},
        };
        var content = {
          foo: 'foo',
          bar: 'bar'
        };
        var ensure = validators.makeEnsureObjectMatchesSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Unknown properties: 'bar'.");
          (result === undefined).should.be.true;
          done();
        });
      });

      it("gives line numbers of additional properties", function(done) {
        var schema = {
          foo: {required:true, validate:null},
        };
        var content = {
          foo: {$value:'foo', $line: 1},
          bar: {$value:'bar', $line: 2}
        };
        var ensure = validators.makeEnsureObjectMatchesSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Unknown properties: 'bar' (line 2).");
          (result === undefined).should.be.true;
          done();
        });
      });

      it("validates data using validate functions", function(done) {
        var schema = {
          foo: {required:true, validate:null},
          bar: {required:true,
                validate:validators.makeEnsureEqualTo('Property', 'bar')}
        };
        var content = {
          foo: 'foo',
          bar: 'sun'
        };
        var ensure = validators.makeEnsureObjectMatchesSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Property must equal 'bar', 'sun' found instead.");
          (result === undefined).should.be.true;
          done();
        });
      });

      it("should include line number in error, if available", function(done) {
        var schema = {
          foo: {required:true, validate:null},
          bar: {required:true,
                validate:validators.makeEnsureEqualTo('Property', 'bar')}
        };
        var content = {
          foo: {$value:'foo', $line: 2},
          bar: {$value:'sun', $line: 4}
        };
        var ensure = validators.makeEnsureObjectMatchesSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Line 4: Property must equal 'bar', 'sun' found instead.");
          (result === undefined).should.be.true;
          done();
        });
      });

    });

    // ----------------------------------------------------------------------

    describe("list schema validation", function() {
      it("validates matching content", function(done) {
        var schema = {
          foo: {required:true, validate:null},
          bar: {required:false,
                validate:validators.makeEnsureEqualTo('Property', 'bar')},
        };
        var content = [
          {foo: 'foo', bar: 'bar'},
          {foo: 'sun'},
          {foo: 'dock', bar: 'bar'}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.false;
          result.should.eql(content);
          done();
        });
      });

      it("copes with items in the list having property data", function(done) {
        var schema = {
          foo: {required:true, validate:null},
          bar: {required:false,
                validate:validators.makeEnsureEqualTo('Property', 'bar')},
        };
        var content = [
          {$value: {foo: 'foo', bar: {$value:'bar', $line:2}}, $line: 1},
          {$value: {foo: 'sun'}, $line: 3},
          {$value: {foo: 'dock', bar: 'bar'}, $line: 4}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.false;
          result.should.eql([{foo:'foo', bar:'bar'},
                             {foo:'sun'},
                             {foo:'dock', bar:'bar'}]);
          done();
        });
      });

      it("raises an error if any element is invalid", function(done) {
        var schema = {
          foo: {required:true, validate:null},
          bar: {required:false,
                validate:validators.makeEnsureEqualTo('Property', 'bar')},
        };
        var content = [
          {foo: 'foo', bar: 'bar'},
          {foo: 'sun'},
          {foo: 'dock', bar: 'tro'}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Property must equal 'bar', 'tro' found instead.");
          (result === undefined).should.be.true;
          done();
        });
      });

      it("should include line number in error, if available ", function(done) {
        var schema = {
          foo: {required:true, validate:null},
          bar: {required:false,
                validate:validators.makeEnsureEqualTo('Property', 'bar')},
        };
        var content = [
          {foo: 'foo', bar: 'bar'},
          {foo: 'sun'},
          {foo: 'dock', bar: {$value:'tro', $line: 4}}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Line 4: Property must equal 'bar', 'tro' found instead.");
          (result === undefined).should.be.true;
          done();
        });
      });
    });

    // ----------------------------------------------------------------------

    describe("id schema validation", function() {
      it("validates matching content", function(done) {
        var schemae = {
          'foo': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'bar')},
          },
          'sun': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'bar')},
          },
          'dock': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'tro')},
          }
        };
        var content = [
          {id: 'foo', bar: 'bar'},
          {id: 'sun'},
          {id: 'dock', bar: 'tro'}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchemaById(schemae);
        ensure(content, function(err, result) {
          (!!err).should.be.false;
          result.should.eql(content);
          done();
        });
      });

      it("copes with items in the list having property data", function(done) {
        var schemae = {
          'foo': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'bar')},
          },
          'sun': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'bar')},
          },
          'dock': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'tro')},
          }
        };
        var content = [
          {$value: {id: 'foo', bar: {$value:'bar', $line:2}}, $line: 1},
          {$value: {id: 'sun'}, $line: 3},
          {$value: {id: 'dock', bar: 'tro'}, $line: 4}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchemaById(schemae);
        ensure(content, function(err, result) {
          (!!err).should.be.false;
          result.should.eql([
            {id: 'foo', bar: 'bar'},
            {id: 'sun'},
            {id: 'dock', bar: 'tro'}
          ]);
          done();
        });
      });

      it("validates unknown id against default schema", function(done) {
        var schemae = {
          'foo': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'bar')},
          },
          '$default': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'tro')},
          }
        };
        var content = [
          {id: 'foo', bar: 'bar'},
          {id: 'sun'},
          {id: 'dock', bar: 'tro'}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchemaById(schemae);
        ensure(content, function(err, result) {
          (!!err).should.be.false;
          result.should.eql(content);
          done();
        });
      });

      it("fails with an unknown id", function(done) {
        var schemae = {
          'foo': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'bar')},
          },
          'dock': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'tro')},
          }
        };
        var content = [
          {id: 'foo', bar: 'bar'},
          {id: 'sun'},
          {id: 'dock', bar: 'tro'}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchemaById(schemae);
        ensure(content, function(err, result) {
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
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'bar')},
          },
          '$default': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'tro')},
          }
        };
        var content = [
          {id: 'foo', bar: 'bar'},
          {id: 'sun'},
          {id: 'dock', bar: 'foo'}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchemaById(schemae);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Property must equal 'tro', 'foo' found instead.");
          (result === undefined).should.be.true;
          done();
        });
      });

      it("should include line number in error, if available", function(done) {
        var schemae = {
          'foo': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'bar')},
          },
          '$default': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'tro')},
          }
        };
        var content = [
          {id: 'foo', bar: 'bar'},
          {id: 'sun'},
          {id: 'dock', bar: {$value:'foo', $line:4}}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchemaById(schemae);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Line 4: Property must equal 'tro', 'foo' found instead.");
          (result === undefined).should.be.true;
          done();
        });
      });

      it("finds line number from list definition", function(done) {
        var schemae = {
          'foo': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'bar')},
          },
          'dock': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'tro')},
          }
        };
        var content = {$value: [
          {id: 'foo', bar: 'bar'},
          {id: 'sun'},
          {id: 'dock', bar: 'tro'}
        ], $line:4};
        var ensure = validators.makeEnsureListItemsMatchSchemaById(schemae);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Line 4: Found an item with an unknown id 'sun'.");
          (result === undefined).should.be.true;
          done();
        });
      });

      it("finds line number from item definition", function(done) {
        var schemae = {
          'foo': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'bar')},
          },
          'dock': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'tro')},
          }
        };
        var content = [
          {id: 'foo', bar: 'bar'},
          {$value: {id: 'sun'}, $line:4},
          {id: 'dock', bar: 'tro'}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchemaById(schemae);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Line 4: Found an item with an unknown id 'sun'.");
          (result === undefined).should.be.true;
          done();
        });
      });

      it("finds line number from id definition", function(done) {
        var schemae = {
          'foo': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'bar')},
          },
          'dock': {
            id: {required:true, validate:null},
            bar: {required:false,
                  validate:validators.makeEnsureEqualTo('Property', 'tro')},
          }
        };
        var content = [
          {id: 'foo', bar: 'bar'},
          {id: {$value:'sun', $line:4}},
          {id: 'dock', bar: 'tro'}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchemaById(schemae);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Line 4: Found an item with an unknown id 'sun'.");
          (result === undefined).should.be.true;
          done();
        });
      });

    });
  });
}());
