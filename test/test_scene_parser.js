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

  describe("scene parser", function() {

    // ----------------------------------------------------------------------

    it("should parse from raw content", function(done) {
      var content = "title: My Title\ntags: alpha, bravo";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.false;
        result.title.should.equal('My Title');
        done();
      });
    });

    it("handles parsing of sections", function(done) {
      var content = "title: My Title\n@bar";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.false;
        result.title.should.equal('My Title');
        result.sections.length.should.equal(1);
        done();
      });
    });

    it("requires the type of content to be 'scene'", function(done) {
      var content = "title: My Title";
      parse.parseFromContent("foo.quality.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: File type must equal 'scene', 'quality' found instead.");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("should enforce required properties", function(done) {
      var content = "title: My Title";
      // No 'type' inferred from filename.
      parse.parseFromContent("foo.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Required property 'type' missing.");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("should reject unknown properties", function(done) {
      var content = "title: My Title\nlabel: foo";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Unknown properties: 'label' (line 2).");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("should reject malformed dry files", function(done) {
      var content = "title: My Title\nfoo";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 2: Invalid property definition.");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("should reject malformed properties", function(done) {
      var content = "title: My Title\ntags: $nope";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Line 2: Tag 1 '$nope' is not valid.");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("should cope with go-to", function(done) {
      var content = "title: My Title\ngo-to: root";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.false;
        result.goTo.should.equal('root');
        done();
      });
    });

    it("should cope with game-over", function(done) {
      var content = "title: My Title\ngame-over: y";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.false;
        result.gameOver.should.be.true;
        done();
      });
    });

    it("should cope with new page", function(done) {
      var content = "title: My Title\nnew-page: y";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.false;
        result.newPage.should.be.true;
        done();
      });
    });

    it("should load and parse scene file", function(done) {
      var fn = path.join(__dirname, 'files', 'test_scene_parser.scene.dry');
      parse.parseFromFile(fn, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          id: "test_scene_parser",
          type: "scene",
          title: "The scene title",
          tags: ["alpha", "bravo"],
          content: "This is the scene content.",
          options: {
            options: [{id:"@foo", title:"The title for foo."},
                      {id:"@bar"}],
          },
          sections: [{
            id: "foo",
            gameOver: true,
            content: "This is section 'foo'."
          },{
            id: "bar",
            title: "The Bar Scene",
            content: "This is section 'bar'.",
            goTo: "foo",
            maxVisits: 1,
            options: {
              options: [{id:"@foo", title:"Return to foo."}]
            }
          }]
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

    it("can detect errors in options blocks", function(done) {
      var content = "title: My Title\n\n- @foo\n- min:3";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Unknown properties: 'min' (line 4).");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("can detect errors in sections", function(done) {
      var content = "title: My Title\n\n@bar\nmin:3";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Unknown properties: 'min' (line 4).");
        (result === undefined).should.be.true;
        done();
      });
    });

  });
}());
