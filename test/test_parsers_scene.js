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

  var noerr = function(err) {
    if (err) console.trace(err);
    (!!err).should.be.false;
  };

  var parse = require('../lib/parsers/scene');

  describe("scene parser", function() {

    // ----------------------------------------------------------------------

    it("should parse from raw content", function(done) {
      var content = "title: My Title\ntags: alpha, bravo";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        noerr(err);
        result.title.should.equal('My Title');
        done();
      });
    });

    it("handles parsing of sections", function(done) {
      var content = "title: My Title\n@bar";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        noerr(err);
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
          "Error: Unknown properties: 'label' (foo.scene.dry line 2).");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("should reject malformed dry files", function(done) {
      var content = "title: My Title\nfoo";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: foo.scene.dry line 2: Invalid property definition.");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("should reject malformed properties", function(done) {
      var content = "title: My Title\ntags: $nope";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: foo.scene.dry line 2: Tag 1 '$nope' is not valid.");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("should cope with go-to", function(done) {
      var content = "title: My Title\ngo-to: root";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        noerr(err);
        result.goTo.should.eql([{id:'root'}]);
        done();
      });
    });

    it("should cope with compound go-to", function(done) {
      var content = "title: My Title\ngo-to: foo.bar";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        noerr(err);
        result.goTo.should.eql([{id:'foo.bar'}]);
        done();
      });
    });

    it("should cope with relative go-to", function(done) {
      var content = "title: My Title\ngo-to: ..foo.bar";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        noerr(err);
        result.goTo.should.eql([{id:'..foo.bar'}]);
        done();
      });
    });

    it("should cope with prefixed go-to", function(done) {
      var content = "title: My Title\ngo-to: @foo";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        noerr(err);
        result.goTo.should.eql([{id:'foo'}]);
        done();
      });
    });

    it("should cope with game-over", function(done) {
      var content = "title: My Title\ngame-over: y";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        noerr(err);
        result.gameOver.should.be.true;
        done();
      });
    });

    it("should cope with new page", function(done) {
      var content = "title: My Title\nnew-page: y";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        noerr(err);
        result.newPage.should.be.true;
        done();
      });
    });

    it("should parse priority and frequency", function(done) {
      var content = "title: My Title\npriority: 1.2\nfrequency: 1.2";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        noerr(err);
        result.priority.should.equal(1);
        result.frequency.should.equal(1.2);
        done();
      });
    });

    it("should load and parse scene file", function(done) {
      var fn = path.join(__dirname, 'files', 'test_scene_parser.scene.dry');
      parse.parseFromFile(fn, function(err, result) {
        noerr(err);
        result.should.eql({
          id: "test_scene_parser",
          type: "scene",
          title: "The scene title",
          tags: ["alpha", "bravo"],
          content: "This is the scene content.",
          options: [{id:"@foo", title:"The title for foo."},
                    {id:"@bar"}],
          sections: [{
            id: "test_scene_parser.foo",
            gameOver: true,
            content: "This is section 'foo'."
          },{
            id: "test_scene_parser.bar",
            title: "The Bar Scene",
            content: "This is section 'bar'.",
            goTo: [{id:"foo"}],
            maxVisits: 1,
            options: [{id:"@foo", title:"Return to foo."}]
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

    it("validates options properties", function(done) {
      var content = "title: My Title\n\n- @foo\n- priority:3";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        noerr(err);
        result.options[0].priority.should.equal(3);
        done();
      });
    });

    it("can detect errors in options blocks", function(done) {
      var content = "title: My Title\n\n- @foo\n- min:3";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: foo.scene.dry line 3: "+
          "Unknown properties: 'min' (foo.scene.dry line 4).");
        (result === undefined).should.be.true;
        done();
      });
    });

    it("can detect errors in sections", function(done) {
      var content = "title: My Title\n\n@bar\nmin:3";
      parse.parseFromContent("foo.scene.dry", content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Unknown properties: 'min' (foo.scene.dry line 4).");
        (result === undefined).should.be.true;
        done();
      });
    });

  });
}());
