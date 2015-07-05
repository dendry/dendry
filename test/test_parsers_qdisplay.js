/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  'use strict';

  var _ = require('lodash');
  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var noerr = function(err) {
    if (err) {
      console.trace(err);
    }
    (!!err).should.be.false;
  };

  var parse = require('../lib/parsers/qdisplay');

  describe('qdisplay parser', function() {

    // ----------------------------------------------------------------------

    it('should parse basic content', function(done) {
      var content = '\n(1-5) Foo';
      parse.parseFromContent('a.qdisplay.dry', content, function(err, result) {
        noerr(err);
        result.content.length.should.equal(1);
        result.content.should.eql([
          {min:1, max:5, output:'Foo'}
        ]);
        done();
      });
    });

    it('should parse half-open ranges', function(done) {
      var content = '\n(--5) Foo\n(6-) Bar';
      parse.parseFromContent('a.qdisplay.dry', content, function(err, result) {
        noerr(err);
        result.content.should.eql([
          {max:-5, output:'Foo'},
          {min:6, output:'Bar'}
        ]);
        done();
      });
    });

    var seps = ['-', 'to', '..', '+', ','];
    _.each(seps, function(sep) {
      it('should parse "' + sep + '" as range separator', function(done) {
        var content = '\n(-13' + sep + '-5) Foo';
        parse.parseFromContent(
          'a.qdisplay.dry', content, function(err, result) {
            noerr(err);
            result.content.should.eql([
              {min:-13, max:-5, output:'Foo'},
            ]);
            done();
          });
      });
    });

    it('should reorder min/max if needed', function(done) {
      var content = '\n(-3 to -5) Foo';
      parse.parseFromContent('a.qdisplay.dry', content, function(err, result) {
        noerr(err);
        result.content.should.eql([
          {min:-5, max:-3, output:'Foo'}
        ]);
        done();
      });
    });

    it('should fail to parse unknown separator', function(done) {
      var content = '\n(-13 -> -5) Foo';
      parse.parseFromContent('a.qdisplay.dry', content, function(err, result) {
        (!!err).should.be.true;
        err.message.should.equal('Unknown range declaration.');
        done();
      });
    });

    it('should parse output as lines of rich content', function(done) {
      var content = '\n(-3 to -5) Foo *bar*';
      parse.parseFromContent('a.qdisplay.dry', content, function(err, result) {
        noerr(err);
        result.content.should.eql([
          {
            min:-5,
            max:-3,
            output:['Foo ', {type:'emphasis-1', content:'bar'}]
          }
        ]);
        done();
      });
    });

    it('should pass on content errors', function(done) {
      var content = '\n(-3 to -5) Foo [+ **bar** +]';
      parse.parseFromContent('a.qdisplay.dry', content, function(err, result) {
        (!!err).should.be.true;
        err.message.should.equal(
          'Insert content doesn\'t look like logic or magic.'
        );
        done();
      });
    });

  });
}());
