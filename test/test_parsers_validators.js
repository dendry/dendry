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

  var validators = require('../lib/parsers/validators');

  var noerr = function(err) {
    if (err) console.trace(err);
    (!!err).should.be.false;
  };

  describe("validators", function() {

    describe("boolean validation", function() {
      var trues = ['true', 'T', 'YES', 'y', 'OK', '1', '-1'];
      trues.forEach(function(name) {
        it("should handle value "+name+" as true", function(done) {
          validators.validateBoolean(name, function(err, val) {
            noerr(err);
            val.should.be.true;
            done();
          });
        });
      });

      var falses = ['False', 'F', 'no', 'N', '0'];
      falses.forEach(function(name) {
        it("should handle value "+name+" as false", function(done) {
          validators.validateBoolean(name, function(err, val) {
            noerr(err);
            val.should.be.false;
            done();
          });
        });
      });

      it("should fail for other values", function(done) {
        validators.validateBoolean("bob", function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: 'bob' is not a valid yes/no value."
          );
          (val === undefined).should.be.true;
          done();
        });
      });

    });

    // ----------------------------------------------------------------------

    describe("id validation", function() {
      var ok = ['alpha', 'BraVo', 'char-lie', 'delta ', "e_cho",
                "one.two", "one.two.three"];
      ok.forEach(function(name) {
        it("should validate id "+name, function(done) {
          validators.validateId(name, function(err, val) {
            noerr(err);
            val.should.equal(name.trim());
            done();
          });
        });
      });

      it("should strip at-sign", function(done) {
        validators.validateId("@alpha", function(err, val) {
          noerr(err);
          val.should.equal("alpha");
          done();
        });
      });

      var notOk = ['a b c', 'one/two', 'one:two', '..', '.one.two'];
      notOk.forEach(function(name) {
        it("should fail to validate id "+name, function(done) {
          validators.validateId(name, function(err, val) {
            (!!err).should.be.true;
            err.toString().should.equal("Error: '"+name+"' is not a valid id.");
            (val === undefined).should.be.true;
            done();
          });
        });
      });
    });

    describe("relative id validation", function() {
      var ok = ['alpha', 'BraVo', 'char-lie', 'delta ', "e_cho",
                "one.two", "one.two.three", '..', '.one.two'];
      ok.forEach(function(name) {
        it("should validate relative id "+name, function(done) {
          validators.validateRelativeId(name, function(err, val) {
            noerr(err);
            val.should.equal(name.trim());
            done();
          });
        });
      });

      it("should strip at-sign", function(done) {
        validators.validateRelativeId("@.alpha", function(err, val) {
          noerr(err);
          val.should.equal(".alpha");
          done();
        });
      });

      var notOk = ['a b c', 'one/two', 'one:two'];
      notOk.forEach(function(name) {
        it("should fail to validate relative id "+name, function(done) {
          validators.validateRelativeId(name, function(err, val) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: '"+name+"' is not a valid relative id."
            );
            (val === undefined).should.be.true;
            done();
          });
        });
      });
    });

    // ----------------------------------------------------------------------

    describe("float validation", function() {
      it("should handle simple floats", function(done) {
        validators.validateFloat("45.25", function(err, val) {
          val.should.equal(45.25);
          done();
        });
      });

      it("should reject non-floats", function(done) {
        validators.validateFloat("bob", function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: 'bob' is not a valid number."
          );
          (val === undefined).should.be.true;
          done();
        });
      });

    });

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
          err.toString().should.equal(
            "Error: 'bob' is not a valid whole number."
          );
          (val === undefined).should.be.true;
          done();
        });
      });

      it("should include line number in error, if available", function(done) {
        var prop = {$value:"bob", $line:4};
        validators.validateInteger(prop, function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Line 4: 'bob' is not a valid whole number.");
          (val === undefined).should.be.true;
          done();
        });
      });

      it("should include line number and file in error, if available",
         function(done) {
           var prop = {$value:"bob", $file:"test.dry", $line:4};
           validators.validateInteger(prop, function(err, val) {
             (!!err).should.be.true;
             err.toString().should.equal(
               "Error: test.dry line 4: 'bob' is not a valid whole number.");
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
          err.toString().should.equal(
            "Error: 'bob' is not a valid whole number."
          );
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
          noerr(err);
          val.should.equal('foo');
          done();
        });
      });

      it("trims whitespace before match", function(done) {
        validators.makeEnsureEqualTo("P", "foo  ")("  foo", function(err, val) {
          noerr(err);
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
          $file:"test.dry",
          $line: 4
        };
        validators.makeEnsureEqualTo("Prop", "foo")(prop, function(err, val) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: test.dry line 4: "+
            "Prop must equal 'foo', 'bar' found instead."
          );
          (val === undefined).should.be.true;
          done();
        });
      });
    });

    // ----------------------------------------------------------------------

    describe("tag list validation", function() {
      it("handles hash prefix or no prefix", function(done) {
        validators.validateTagList("alpha, #bravo", function(err, list) {
          noerr(err);
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
            noerr(err);
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
          noerr(err);
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
          $file:"test.dry",
          $line: 4
        };
        validators.validateTagList(
          prop,
          function(err, list) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: test.dry line 4: Tag 3 '$charlie' is not valid.");
            (list === undefined).should.be.true;
            done();
          });
      });

    });

    // ----------------------------------------------------------------------

    describe("predicate magic/logic", function() {
      it("validates magic predicate", function(done) {
        validators.validatePredicate(
          "{! return true; !}",
          function(err, result) {
            noerr(err);
            result(null, null).should.be.true;
            done();
          });
      });

      it("disallows other content with magic predicate", function(done) {
        validators.validatePredicate(
          "{! return true; !} true",
          function(err, result) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: Magic in a predicate must have no other "+
              "content surrounding it."
            );
            done();
          });
      });

      it("passes on magic eval errors", function(done) {
        validators.validatePredicate(
          "{! case 4; !}",
          function(err, result) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: SyntaxError: Unexpected token case"
            );
            done();
          });
      });

      it("disallows multiple magic in a predicate", function(done) {
        validators.validatePredicate(
          "{! return true; !} {! return false !}",
          function(err, result) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: Magic in a predicate must have no other "+
              "content surrounding it."
            );
            done();
          });
      });

      it("validates logic predicate", function(done) {
        validators.validatePredicate(
          "true",
          function(err, result) {
            noerr(err);
            result(null, null).should.be.true;
            done();
          });
      });


      it("validates logic predicate that uses qualities", function(done) {
        validators.validatePredicate(
          "foo >= 1",
          function(err, result) {
            noerr(err);
            var Q = {foo: 2};
            result(null, Q).should.be.true;
            done();
          });
      });
    });

    // ----------------------------------------------------------------------

    describe("actions magic/logic", function() {
      it("validates magic actions", function(done) {
        validators.validateActions(
          "{! Q.foo = 1; !}",
          function(err, actions) {
            noerr(err);

            actions.length.should.equal(1);

            var Q = {foo:0};
            actions[0](null, Q);
            Q.foo.should.equal(1);

            done();
          });
      });

      it("validates multiple actions", function(done) {
        validators.validateActions(
          "{! Q.foo = 1; !} {! Q.foo += 2 !}",
          function(err, actions) {
            noerr(err);
            actions.length.should.equal(2);
            var Q = {foo:0};
            actions[0](null, Q);
            Q.foo.should.equal(1);
            actions[1](null, Q);
            Q.foo.should.equal(3);
            done();
          });
      });

      it("passes on magic eval errors", function(done) {
        validators.validateActions(
          "{! case 4; !}",
          function(err, result) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: SyntaxError: Unexpected token case in chunk 1."
            );
            done();
          });
      });

      it("passes on logic compilation errors", function(done) {
        validators.validateActions(
          "foo true",
          function(err, result) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: No valid way to parse this content."
            );
            done();
          });
      });

      it("allows mixing of logic and magic", function(done) {
        validators.validateActions(
          "{! Q.foo = 1 !} foo += 2 {! Q.foo += 3 !}",
          function(err, actions) {
            noerr(err);
            actions.length.should.equal(3);
            var Q = {foo:0};
            actions[0](null, Q);
            Q.foo.should.equal(1);
            actions[1](null, Q);
            Q.foo.should.equal(3);
            actions[2](null, Q);
            Q.foo.should.equal(6);
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
          noerr(err);
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

      it("removes removable properties", function(done) {
        var schema = {
          foo: {required:true, validate:null},
          bar: {remove:true}
        };
        var content = {
          foo: 'foo',
          bar: 'bar'
        };
        var ensure = validators.makeEnsureObjectMatchesSchema(schema);
        ensure(content, function(err, result) {
          noerr(err);
          result.foo.should.equal('foo');
          (result.bar === undefined).should.be.true;
          done();
        });
      });

      it("removes removable properties after validation", function(done) {
        var schema = {
          foo: {required:true, validate:null},
          bar: {remove:true, validate:validators.validateInteger},
          sun: {remove:true, validate:validators.validateInteger}
        };
        var content = {
          foo: 'foo',
          bar: '2',
          sun: 'sun',
        };
        var ensure = validators.makeEnsureObjectMatchesSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: 'sun' is not a valid whole number."
          );
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
          foo: {$value:'foo', $file:"test.dry", $line: 1},
          bar: {$value:'bar', $file:"test.dry", $line: 2}
        };
        var ensure = validators.makeEnsureObjectMatchesSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Unknown properties: 'bar' (test.dry line 2).");
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
          foo: {$value:'foo', $file:"test.dry", $line: 2},
          bar: {$value:'sun', $file:"test.dry", $line: 4}
        };
        var ensure = validators.makeEnsureObjectMatchesSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: test.dry line 4: "+
            "Property must equal 'bar', 'sun' found instead."
          );
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
          noerr(err);
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
          noerr(err);
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
          {foo: 'dock', bar: {$value:'tro', $file:"test.dry", $line: 4}}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchema(schema);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: test.dry line 4: "+
            "Property must equal 'bar', 'tro' found instead."
          );
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
          noerr(err);
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
          noerr(err);
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
          noerr(err);
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
          {id: 'dock', bar: {$value:'foo', $file:"test.dry", $line:4}}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchemaById(schemae);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: test.dry line 4: "+
            "Property must equal 'tro', 'foo' found instead."
          );
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
        ], $file:"test.dry", $line:4};
        var ensure = validators.makeEnsureListItemsMatchSchemaById(schemae);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: test.dry line 4: Found an item with an unknown id 'sun'.");
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
          {$value: {id: 'sun'}, $file:"test.dry", $line:4},
          {id: 'dock', bar: 'tro'}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchemaById(schemae);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: test.dry line 4: Found an item with an unknown id 'sun'.");
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
          {id: {$value:'sun', $file:"test.dry", $line:4}},
          {id: 'dock', bar: 'tro'}
        ];
        var ensure = validators.makeEnsureListItemsMatchSchemaById(schemae);
        ensure(content, function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: test.dry line 4: Found an item with an unknown id 'sun'.");
          (result === undefined).should.be.true;
          done();
        });
      });
    });

    // ----------------------------------------------------------------------

    describe("go-to validation", function() {
      it("validates single id", function(done) {
        validators.validateGoTo('@foo', function(err, result) {
          noerr(err);
          result.length.should.equal(1);
          result[0].id.should.equal('foo');
          (result[0].predicate === undefined).should.be.true;
          done();
        });
      });

      it("validates single goto with predicate", function(done) {
        validators.validateGoTo(
          '@foo if {! return true !}',
          function(err, result) {
            noerr(err);
            result.length.should.equal(1);
            result[0].id.should.equal('foo');
            (result[0].predicate === undefined).should.be.false;
            result[0].predicate().should.be.true;
            done();
          });
      });

      it("validates multiple gotos", function(done) {
        validators.validateGoTo(
          '@foo if {! return true !}; @bar',
          function(err, result) {
            noerr(err);
            result.length.should.equal(2);
            result[0].id.should.equal('foo');
            (result[0].predicate === undefined).should.be.false;
            result[0].predicate().should.be.true;
            result[1].id.should.equal('bar');
            (result[1].predicate === undefined).should.be.true;
            done();
          });
      });

      it("allows semicolons in magic", function(done) {
        validators.validateGoTo(
          '@foo if {! return true; !}; @bar',
          function(err, result) {
            noerr(err);
            result.length.should.equal(2);
            result[0].id.should.equal('foo');
            (result[0].predicate === undefined).should.be.false;
            result[0].predicate().should.be.true;
            result[1].id.should.equal('bar');
            (result[1].predicate === undefined).should.be.true;
            done();
          });
      });

      it("requires non-terminal clauses to have a predicate", function(done) {
        validators.validateGoTo(
          '@foo; @bar',
          function(err, result) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: Only the last goto instruction can have no if-clause."
            );
            done();
          });
      });

      it("passes on id validation errors", function(done) {
        validators.validateGoTo('#foo', function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: '#foo' is not a valid relative id."
          );
          done();
        });
      });

      it("passes on predicate validation errors", function(done) {
        validators.validateGoTo('@foo if $bar', function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Unrecognized content at position 0."
          );
          done();
        });
      });

    }); // end describe goto

  });
}());
