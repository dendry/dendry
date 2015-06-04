/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var fs = require('fs');
  var path = require('path');
  var _ = require('lodash');
  var marked = require('marked');
  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var dry = require('../lib/parsers/dry');

  var noerr = function(err) {
    if (err) console.trace(err);
    (!!err).should.be.false;
  };

  var getPropertiesFromMarkdown = function(data) {
    var lexed = marked.lexer(data.toString());
    var propertiesForThisSet = null;
    var lastProperty = null;
    var sets = [];
    _.each(lexed, function(chunk) {
      if (chunk.type === 'heading') {
        if (chunk.depth === 1) {
          propertiesForThisSet = {};
          sets[chunk.text.toLowerCase()] = propertiesForThisSet;
        } else if (chunk.depth === 2) {
          (!!propertiesForThisSet).should.be.true;
          propertiesForThisSet[chunk.text] = false;
          lastProperty = chunk.text;
        }
      } else if (chunk.type === 'paragraph' && chunk.text === '*Required*') {
        (!!lastProperty).should.be.true;
        propertiesForThisSet[lastProperty] = true;
      }
    });
    return sets;
  };

  // A new should type to make failures more understandable.
  should.Assertion.add('documented', function(documentedPropertiesAsDict) {
    this.params = {operator: 'be present in the docs'};
    should.exist(documentedPropertiesAsDict[this.obj]);
  });

  should.Assertion.add('documentedAsRequired', function(docPropsAsDict, req) {
    this.params = {operator: 'be marked as'+(req?'':' not')+' required'};
    docPropsAsDict[this.obj].should.equal(req);
  });

  var validatePropertiesMatchSchema = function(schema, properties, ignore) {
    var ignoreAsDict = {};
    _.each(ignore, function(name) { ignoreAsDict[name] = true; });

    var propertiesDictCopy = {};
    _.each(properties, function(isRequired, name) {
      var camelName = dry.convertPropertyNameToCamelCase(name);
      propertiesDictCopy[camelName] = isRequired; 
    });

    // Each of the properties in the schema should be present. 
    _.each(schema, function(propertySchema, name) {
      if (name.substr(0, 1) === '$') return;
      if (ignoreAsDict[name] === true) return;
      name.should.be.documented(propertiesDictCopy);
      name.should.be.documentedAsRequired(
        propertiesDictCopy, propertySchema.required
        );
      delete propertiesDictCopy[name];
    });
    // And we should have no others.
    propertiesDictCopy.should.eql({});
  };


  describe("documentation", function() {

    describe("scene", function() {
      var scene = require('../lib/parsers/scene');

      it("has correct top level properties", function(done) {
        var schema = scene.schema;
        var doc = path.resolve(__dirname, "..", "doc", "dry", "scene.md");
        fs.readFile(doc, function(err, data) {
          noerr(err);
          var sets = getPropertiesFromMarkdown(data);
          validatePropertiesMatchSchema(
            schema, sets.scene, ['options', 'sections']
            );
          done();
        });
      });
  
      it("has correct options properties", function(done) {
        var schema = scene.optionSchema;
        var doc = path.resolve(__dirname, "..", "doc", "dry", "scene.md");
        fs.readFile(doc, function(err, data) {
          noerr(err);
          var sets = getPropertiesFromMarkdown(data);
          validatePropertiesMatchSchema(schema, sets.options, []);
          done();
        });
      });
    }); // end describe scene


    describe("quality", function() {
      var quality = require('../lib/parsers/quality');

      it("has correct top level properties", function(done) {
        var schema = quality.schema;
        var doc = path.resolve(__dirname, "..", "doc", "dry", "quality.md");
        fs.readFile(doc, function(err, data) {
          noerr(err);
          var sets = getPropertiesFromMarkdown(data);
          validatePropertiesMatchSchema(schema, sets.quality, []);
          done();
        });
      });
    }); // end describe quality


    describe("qdisplay", function() {
      var qdisplay = require('../lib/parsers/qdisplay');

      it("has correct top level properties", function(done) {
        var schema = qdisplay.schema;
        var doc = path.resolve(__dirname, "..", "doc", "dry", "qdisplay.md");
        fs.readFile(doc, function(err, data) {
          noerr(err);
          var sets = getPropertiesFromMarkdown(data);
          validatePropertiesMatchSchema(schema, sets.qdisplay, []);
          done();
        });
      });
    }); // end describe qdisplay

  });
}());
