/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var path = require('path');
  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var parse = require('../lib/scene_parser');

  describe("scene-parser", function() {
    
    // ----------------------------------------------------------------------
    
    it("should parse from raw content", function(done) {
      var content = "title: My Title\ntags: alpha, bravo";
      parse.parseFromContent("foo.scene.dry", content, function(err, dry) {
        (!!err).should.be.false;
        dry.title.should.equal('My Title');
        done();
      });
    });

    it("handles parsing of sections", function(done) {
      var content = "title: My Title\n@bar";
      parse.parseFromContent("foo.scene.dry", content, function(err, dry) {
        (!!err).should.be.false;
        dry.title.should.equal('My Title');
        dry.sections.length.should.equal(1);
        done();
      });
    });

    it("requires the type of content to be 'scene'", function(done) {
      var content = "title: My Title";
      parse.parseFromContent("foo.quality.dry", content, function(err, dry) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Property must equal 'scene', 'quality' found instead.");
        (dry === undefined).should.be.true;
        done();
      });
    });

    it("should enforce required properties", function(done) {
      var content = "title: My Title";
      // No 'type' inferred from filename.
      parse.parseFromContent("foo.dry", content, function(err, dry) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Required property 'type' missing.");
        (dry === undefined).should.be.true;
        done();
      });
    });

    it("should reject unknown properties", function(done) {
      var content = "title: My Title\nlabel: foo";
      parse.parseFromContent("foo.scene.dry", content, function(err, dry) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Unknown properties defined: label.");
        (dry === undefined).should.be.true;
        done();
      });
    });

    it("should reject malformed dry files", function(done) {
      var content = "title: My Title\nfoo";
      parse.parseFromContent("foo.scene.dry", content, function(err, dry) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 2: Invalid property definition.");
        (dry === undefined).should.be.true;
        done();
      });
    });

    it("should reject malformed properties", function(done) {
      var content = "title: My Title\ntags: $nope";
      parse.parseFromContent("foo.scene.dry", content, function(err, dry) {
        (!!err).should.be.true;
        err.toString().should.equal("Error: Tag 1 is not valid.");
        (dry === undefined).should.be.true;
        done();
      });
    });
    
    it("should load and parse scene file", function(done) {
      var fn = path.join(__dirname, 'files', 'test_scene_parser.scene.dry');
      parse.parseFromFile(fn, function(err, result) {
        (!!err).should.be.false;
        result.id.should.equal('test_scene_parser');
        result.type.should.equal('scene');
        result.tags.length.should.equal(2);
        result.sections.length.should.equal(2);
        result.sections[0].id.should.equal('foo');
        done();
      });
    });

    it("should pass on dry file errors", function(done) {
      var fn = path.join(__dirname, 'files', 'unknown.scene.dry');
      parse.parseFromFile(fn, function(err, result) {
        (!!err).should.be.true;
        (result === undefined).should.be.true;
        done();
      });
    });
    
  });
}());

