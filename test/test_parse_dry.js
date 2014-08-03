"use strict";

var path = require('path');
var should = require('should');
// Disable errors from using the should library.
/*jshint -W030 */

var parse = require('../lib/parse_dry');

describe("dry-file", function() {

  describe("filename", function() {
    it("requires a valid id component", function() {
      parse.parse("foo$bar.dry", "\ncontent", function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Cannot extract id or type from filename."
        );
        (result === undefined).should.be.true;
      });
    });

    it("sets the id", function() {
      parse.parse("test.dry", "prop: foo", function(err, result) {
        (!!err).should.be.false;
        result.id.should.equal('test');
      });
    });

    it("sets the type, if given", function() {
      parse.parse("test.type.dry", "prop: foo", function(err, result) {
        (!!err).should.be.false;
        result.id.should.equal('test');
        result.type.should.equal('type');
      });
    });

    it("should not set the type, if not given", function() {
      parse.parse("test.dry", "prop: foo", function(err, result) {
        (!!err).should.be.false;
        result.id.should.equal('test');
        (result.type === undefined).should.be.true;
      });
    });

    it("copes with full paths", function() {
      parse.parse("/tmp/foo/test.type.dry", "prop: foo", function(err, result) {
        (!!err).should.be.false;
        result.id.should.equal('test');
        result.type.should.equal('type');
      });
    });

    it("copes with any extension", function() {
      parse.parse("test.type.bar", "prop: foo", function(err, result) {
        (!!err).should.be.false;
        result.id.should.equal('test');
        result.type.should.equal('type');
      });
    });
  });

  // ----------------------------------------------------------------------

  describe("properties", function() {
    var reserved = ['id', 'sections', 'options', 'content'];
    reserved.forEach(function(name) {
      it("should not allow "+name+" as a property name", function() {
        parse.parse("test.dry", name+": foo", function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Line 1: Property '"+name+"' is a reserved name."
          );
          (result === undefined).should.be.true;
        });
      });
    });

    it("should not allow properties to be redefined", function() {
      parse.parse("test.dry", "prop: foo\nprop: bar", function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 2: Property 'prop' is already defined."
          );
        (result === undefined).should.be.true;
      });
    });

    it("should not allow type to be redefined", function() {
      parse.parse("test.type.dry", "type: foo", function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 1: Property 'type' is already defined."
          );
        (result === undefined).should.be.true;
      });
    });

    it("allow type to be set if not inferred", function() {
      parse.parse("test.dry", "type: foo", function(err, result) {
        (!!err).should.be.false;
        result.type.should.equal('foo');
      });
    });

    it("allow a property to be split over two lines", function() {
      parse.parse("test.dry", "prop: foo\n\tbar", function(err, result) {
        (!!err).should.be.false;
        result.prop.should.equal('foo bar');
      });
    });

    it("allow a property to be split over multiple lines", function() {
      parse.parse("test.dry", "prop: foo\n\tbar\n  sun", function(err, result) {
        (!!err).should.be.false;
        result.prop.should.equal('foo bar sun');
      });
    });

    it("should not allow interspersed non-conforming content", function() {
      parse.parse("test.dry", "prop: A\nbar\nprop2: B", function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 2: Invalid property definition."
          );
        (result === undefined).should.be.true;
      });
    });

    it("should be terminated by a blank line", function() {
      parse.parse("test.dry", "prop: foo\n\nbar", function(err, result) {
        (!!err).should.be.false;
        result.prop.should.equal('foo');
        result.content.should.equal('bar');
      });
    });

    it("can be skipped with an initial blank line", function() {
      parse.parse("test.dry", "\nbar", function(err, result) {
        (!!err).should.be.false;
        result.content.should.equal('bar');
      });
    });
  });

  // ----------------------------------------------------------------------

  describe("content", function() {
    it("allows multiple paragraphs", function() {
      parse.parse("test.dry", "\nfoo\n\nbar", function(err, result) {
        (!!err).should.be.false;
        result.content.should.equal('foo\n\nbar');
      });
    });

    it("interprets apparent continuation lines as text", function() {
      parse.parse("test.dry", "\nfoo\n\tbar", function(err, result) {
        (!!err).should.be.false;
        result.content.should.equal('foo\n\tbar');
      });
    });

    it("interprets apparent option lines as text", function() {
      parse.parse("test.dry", "\nfoo\n- bar", function(err, result) {
        (!!err).should.be.false;
        result.content.should.equal('foo\n- bar');
      });
    });

    it("interprets apparent property lines as text", function() {
      parse.parse("test.dry", "\nfoo\nbar: foo", function(err, result) {
        (!!err).should.be.false;
        result.content.should.equal('foo\nbar: foo');
      });
    });

    it("ends when a new section id is given", function() {
      parse.parse("test.dry", "\nfoo\n@bar", function(err, result) {
        (!!err).should.be.false;
        result.content.should.equal('foo');
        result.sections.length.should.equal(1);
        result.sections[0].id.should.equal('bar');
      });
    });

    it("ends when an option block is given", function() {
      parse.parse("test.dry", "\nfoo\n\n- @bar", function(err, result) {
        (!!err).should.be.false;
        result.content.should.equal('foo');
        result.options.options.length.should.equal(1);
        result.options.options[0].id.should.equal('@bar');
      });
    });

    it("ignores extra blank lines", function() {
      parse.parse("test.dry", "\nfoo\n\n\nbar", function(err, result) {
        (!!err).should.be.false;
        result.content.should.equal('foo\n\nbar');
      });
    });

    it("ignores trailing blank lines", function() {
      parse.parse("test.dry", "\nfoo\n\nbar\n\n\n", function(err, result) {
        (!!err).should.be.false;
        result.content.should.equal('foo\n\nbar');
      });
    });

    it("should be blank if we start with options", function() {
      parse.parse("test.dry", "\n- @bar", function(err, result) {
        (!!err).should.be.false;
        result.content.should.equal('');
        result.options.options.length.should.equal(1);
        result.options.options[0].id.should.equal('@bar');
      });
    });
  });

  // ----------------------------------------------------------------------

  describe("options", function() {
    it("can start with either a tag or id", function() {
      parse.parse("test.dry", "\n- @bar\n-#foo", function(err, result) {
        (!!err).should.be.false;
        result.content.should.equal('');
        result.options.options.length.should.equal(2);
        result.options.options[0].id.should.equal('@bar');
        result.options.options[1].id.should.equal('#foo');
      });
    });

    it("must start with a tag or id", function() {
      parse.parse("test.dry", "\n- $foo", function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 2: Invalid property or option definition."
        );
        (result === undefined).should.be.true;
      });
    });

    it("can have a title with an id", function() {
      parse.parse(
        "test.dry", "\n- @foo\n- @bar: The title",
        function(err, result) {
          (!!err).should.be.false;
          result.options.options.length.should.equal(2);
          result.options.options[0].id.should.equal('@foo');
          (result.options.options[0].title === undefined).should.be.true;
          result.options.options[1].id.should.equal('@bar');
          result.options.options[1].title.should.equal('The title');
        });
    });

    it("can have a condition", function() {
      parse.parse(
        "test.dry", "\n- @foo\n- @bar if condition",
        function(err, result) {
          (!!err).should.be.false;
          result.options.options.length.should.equal(2);
          result.options.options[0].id.should.equal('@foo');
          (result.options.options[0].viewIf === undefined).should.be.true;
          result.options.options[1].id.should.equal('@bar');
          (result.options.options[1].title === undefined).should.be.true;
          result.options.options[1].viewIf.should.equal('condition');
        });
    });

    it("can have both a condition and title", function() {
      parse.parse(
        "test.dry", "\n- @foo if condition: title",
        function(err, result) {
          (!!err).should.be.false;
          result.options.options.length.should.equal(1);
          result.options.options[0].id.should.equal('@foo');
          result.options.options[0].title.should.equal('title');
          result.options.options[0].viewIf.should.equal('condition');
        });
    });

    it("should not allow content after options", function() {
      parse.parse("test.dry", "\n- @foo\n\nbar", function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 4: Found content after an options block."
        );
        (result === undefined).should.be.true;
      });
    });

    it("should not allow multiple options blocks", function() {
      parse.parse("test.dry", "\n- @foo\n\n- #bar", function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 4: Found content after an options block."
        );
        (result === undefined).should.be.true;
      });
    });

    it("allow property definitions", function() {
      parse.parse("test.dry", "\n- foo:bar\n- #sun", function(err, result) {
        (!!err).should.be.false;
        result.options.options.length.should.equal(1);
        result.options.options[0].id.should.equal('#sun');
        result.options.foo.should.equal('bar');
      });
    });

    it("allow interspersed property definitions", function() {
      parse.parse(
        "test.dry", "\n- @cube\n- foo:bar\n- #sun",
        function(err, result) {
          (!!err).should.be.false;
          result.options.options.length.should.equal(2);
          result.options.options[0].id.should.equal('@cube');
          result.options.options[1].id.should.equal('#sun');
          result.options.foo.should.equal('bar');
        });
    });

    it("require properties to have a preceding hyphen", function() {
      parse.parse("test.dry", "\n- @cube\nfoo:bar", function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 3: Hyphens are required in an option block."
        );
        (result === undefined).should.be.true;
      });
    });

    it("interpret a tag without a hyphen as a comment", function() {
      parse.parse("test.dry", "\n- @cube\n#foo", function(err, result) {
        (!!err).should.be.false;
        result.options.options.length.should.equal(1);
        result.options.options[0].id.should.equal('@cube');
      });
    });

    it("interpret an id without a hyphen as a new section", function() {
      parse.parse("test.dry", "\n- @cube\n@foo", function(err, result) {
        (!!err).should.be.false;
        result.options.options.length.should.equal(1);
        result.options.options[0].id.should.equal('@cube');
        result.sections.length.should.equal(1);
        result.sections[0].id.should.equal('foo');
      });
    });

    it("should not allow an id to be specified more than once", function() {
      parse.parse("test.dry", "\n- @foo\n-@foo", function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 3: Option with id/tag '@foo' already specified."
        );
        (result === undefined).should.be.true;
      });
    });

    it("should allow an id to be specified in other sections", function() {
      parse.parse("test.dry", "\n- @foo\n@bar\n\n-@foo", function(err, result) {
        (!!err).should.be.false;
      });
    });

    it("should not allow a tag to be specified more than once", function() {
      parse.parse("test.dry", "\n- #foo\n-#foo", function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 3: Option with id/tag '#foo' already specified."
        );
        (result === undefined).should.be.true;
      });
    });
  });

  // ----------------------------------------------------------------------

  describe("sections", function() {
    it("can begin at the start of the file", function() {
      parse.parse("test.dry", "@foo", function(err, result) {
        (!!err).should.be.false;
        result.content.should.equal('');
        result.sections.length.should.equal(1);
        result.sections[0].id.should.equal('foo');
      });
    });

    it("require a valid id", function() {
      parse.parse("test.dry", "\nContent\n@foo$bar", function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 3: Malformed id 'foo$bar' "+
          "(use letters, numbers, _ and - only)."
        );
        (result === undefined).should.be.true;
      });
    });

    it("begin by interpreting following lines as properties", function() {
      parse.parse("test.dry", "@foo\nsun:dock", function(err, result) {
        (!!err).should.be.false;
        result.sections.length.should.equal(1);
        result.sections[0].id.should.equal('foo');
        result.sections[0].sun.should.equal('dock');
      });
    });

    it("should not allow an id to be reused more than once", function() {
      parse.parse("test.dry", "@foo\n@foo", function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 2: Section with id 'foo' already defined."
        );
        (result === undefined).should.be.true;
      });
    });

    it("should not allow an id to match the top level id", function() {
      parse.parse("test.dry", "@test", function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 1: Section can't use the file id 'test'."
        );
        (result === undefined).should.be.true;
      });
    });

  });

  // ----------------------------------------------------------------------

  describe("filesystem", function() {
    it("should load and parse file", function() {
      var fn = path.join(__dirname, 'files', 'test_parse_dry.test.dry');
      parse.parseFile(fn, function(err, result) {
        (!!err).should.be.false;
        result.id.should.equal('test_parse_dry');
        result.type.should.equal('test');
        result.sections.length.should.equal(4);
        result.sections[0].id.should.equal('new-id');
        result.sections[0].options.options.length.should.equal(6);
      });
    });

    it("should fail if the file is not there", function() {
      var fn = path.join(__dirname, 'files', 'not-a-file.type.dry');
      parse.parseFile(fn, function(err, result) {
        (!!err).should.be.true;
        (result === undefined).should.be.true;
      });
    });
  });

});
