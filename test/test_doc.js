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
    var properties = null;
    var sets = [];
    _.each(lexed, function(chunk) {
      if (chunk.type === 'heading') {
        if (chunk.depth === 1) {
          properties = [];
          sets[chunk.text.toLowerCase()] = properties;
        } else if (chunk.depth === 2) {
          (!!properties).should.be.true;
          properties.push(chunk.text);
        }
      }
    });
    return sets;
  };


  // A new should type to make failures more understandable.
  should.Assertion.add('documented', function(documentedPropertiesAsDict) {
    this.params = {operator: 'be present in the docs'};
    should.exist(documentedPropertiesAsDict[this.obj]);
    documentedPropertiesAsDict[this.obj].should.be.true;
  });

  var validatePropertiesMatchSchema = function(schema, properties, ignore) {
    var ignoreAsDict = {};
    _.each(ignore, function(name) { ignoreAsDict[name] = true; });

    var propertiesAsDict = {};
    _.each(properties, function(name) {
      var camelName = dry.convertPropertyNameToCamelCase(name);
      propertiesAsDict[camelName] = true; 
    });

    // Each of the properties in the schema should be present. 
    _.each(schema, function(_, name) {
      if (name.substr(0, 1) === '$') return;
      if (ignoreAsDict[name] === true) return;
      name.should.be.documented(propertiesAsDict);
      delete propertiesAsDict[name];
    });
    // And we should have no others.
    propertiesAsDict.should.eql({});
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
