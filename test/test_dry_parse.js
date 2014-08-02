var should = require('should');
// Disable errors from using the should library.
/*jshint -W030 */

var parse = require('../lib/parse_dry');

describe("dry-file parsing", function() {
  describe("properties", function() {
    var reserved = ['id', 'sections', 'options', 'content'];
    reserved.forEach(function(name) {
      it("should not allow "+name+" as a property name", function() {
        parse.parse(name+": foo", function(err, result) {
          err.should.be.ok;
          err.toString().should.eql(
            "Error: Line 1: Property '"+name+"' is a reserved name."
          );
          (result === undefined).should.be.true;
        });
      });
    });

    it("should not allow properties to be redefined", function() {
      parse.parse("prop: foo\nprop: bar", function(err, result) {
        err.should.be.ok;
        err.toString().should.eql(
          "Error: Line 2: Property 'prop' is already defined."
          );
        (result === undefined).should.be.true;
      });
    });

    it("should allow a property to be split over two lines", function() {
      parse.parse("prop: foo\n\tbar", function(err, result) {
        (!!err).should.be.false;
        result.prop.should.eql('foo bar');
      });
    });

    it("should allow a property to be split over multiple lines", function() {
      parse.parse("prop: foo\n\tbar\n  sun", function(err, result) {
        (!!err).should.be.false;
        result.prop.should.eql('foo bar sun');
      });
    });

    it("should not allow interspersed non-conforming content", function() {
      parse.parse("prop: foo\nbar\nprop2: sun", function(err, result) {
        err.should.be.ok;
        err.toString().should.eql(
          "Error: Line 2: Invalid property definition."
          );
        (result === undefined).should.be.true;
      });
    });

    it("should be terminated by a blank line", function() {
      parse.parse("prop: foo\n\nbar", function(err, result) {
        (!!err).should.be.false;
        result.prop.should.eql('foo');
        result.content.should.eql('bar');
      });
    });

    it("can be skipped with an initial blank line", function() {
      parse.parse("\nbar", function(err, result) {
        (!!err).should.be.false;
        result.content.should.eql('bar');
      });
    });

  });
});
