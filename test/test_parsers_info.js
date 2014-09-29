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

  var parse = require('../lib/parsers/info');

  describe("info parser", function() {

    // ----------------------------------------------------------------------

    it("should parse from raw content", function(done) {
      var content = "title: My Title\nauthor: Jo Doe";
      parse.parseFromContent("info.dry", content, function(err, result) {
        (!!err).should.be.false;
        result.title.should.equal('My Title');
        result.author.should.equal('Jo Doe');
        done();
      });
    });

    it("cannot have sections", function(done) {
      var content = "title: My Title\nauthor: Jo Doe\n@bar";
      parse.parseFromContent("info.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: info.dry: Unknown properties: 'sections'."
        );
        (result === undefined).should.be.true;
        done();
      });
    });

    it("requires the type of content to be 'info'", function(done) {
      var content = "title: My Title\nauthor: Jo Doe";
      parse.parseFromContent("foo.quality.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: File type must equal 'info', 'quality' found instead.");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("should enforce required properties", function(done) {
      var content = "title: My Title";
      parse.parseFromContent("info.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: info.dry: Required property 'author' missing.");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("should reject unknown properties", function(done) {
      var content = "title: My Title\nauthor: Jo Doe\nlabel: foo";
      parse.parseFromContent("info.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: info.dry: Unknown properties: 'label' (info.dry line 3).");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("should reject malformed dry files", function(done) {
      var content = "title: My Title\nauthor: Jo Doe\nfoo";
      parse.parseFromContent("info.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: info.dry line 3: Invalid property definition.");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("should reject malformed properties", function(done) {
      var content = "title: My Title\nauthor: Jo Doe\nfirst-scene: $nope";
      parse.parseFromContent("info.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: '$nope' is not a valid id.");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("should load and parse info file", function(done) {
      var fn = path.join(__dirname, 'files', 'test_info_parser.info.dry');
      parse.parseFromFile(fn, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          title: "The game title",
          author: "The game author",
          firstScene: "foo",
          content: "This is the introductory content.",
        });
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

    it("should not allow option blocks", function(done) {
      var content = "title: My Title\nauthor: Jo Doe\n\n- @foo";
      parse.parseFromContent("foo.info.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: foo.info.dry: Unknown properties: 'options'.");
        (result === undefined).should.be.true;
        done();
      });
    });

  });
}());
