/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var async = require('async');
  var _ = require('lodash');
  var assert = require('assert');
  
  var propParser = require('./prop_parser');
  var dryParser = require('./dry_parser');
  
  var parseFromContent = function(filename, content, callback) {
    dryParser.parseFromContent(filename, content, function(err, dry) {
      if (err) return callback(err);
      parseFromDry(dry, callback);
    });
  };
  
  var parseFromFile = function(filename, callback) {
    dryParser.parseFromFile(filename, function(err, dry) {
      if (err) return callback(err);
      parseFromDry(dry, callback);
    });
  };
  
  var makeEnsureObjectMatchesSchema = function(schema) {
    return function(object, callback) {
      // Find list of properties in the dry. We'll remove these as we process
      // them, leaving just 'extras' we have no schema for.
      var props = {};
      for (var name in object) {
        props[name] = true;
      }

      // Async each requires a list to iterate over.
      var schemaNames = [];
      for (name in schema) schemaNames.push(name);

      // Go through the properties in the schema.
      async.each(schemaNames, function(name, itcallback) {
        var propSchema = schema[name];
        var valueInObject = object[name];

        // Remove this name if we've got it.
        delete props[name];

        // Ensure we have required values.
        if (valueInObject === undefined) {
          if (propSchema.required) {
            return itcallback(new Error(
              "Required property '"+name+"' missing."));
          }
          return itcallback();
        }

        // Clean and parse values
        var clean = propSchema.clean;
        if (!clean) {
          // No-op, the value can be used as is.
          return itcallback();
        } else {
          // We have a validation function.
          clean(valueInObject, function(err, value) {
            if (err) return itcallback(err);
            object[name] = value;
            return itcallback();
          });
        }

      }, function(err) {
        if (err) return callback(err);

        // Anything left in the defined properties, are extras and not allowed.
        var extras = [];
        for (var name in props) extras.push(name);
        if (extras.length > 0) {
          return callback(new Error(
            "Unknown properties defined: "+extras.join(', ')+"."));
        }

        return callback(null, object);
      });
    };
  };
  
  var makeEnsureListItemsMatchSchema = function(schema) {
    var ensureItem = makeEnsureObjectMatchesSchema(schema);
    return function(list, callback) {
      var result = [];
      async.each(list, function(item, done) {
        ensureItem(item, function(err, resultItem) {
          if (err) return done(err);
          result.push(resultItem);
          return done();
        });
      }, function(err) {
        if (err) callback(err);
        else callback(null, list);
      });
    };
  };
  
  var sceneOptionSchema = {
    id: {
      required: true,
      clean: null
    }, 
    title: {
      required: false,
      clean: null
    },
    viewIf: {
      required: false,
      clean: null
    }
  };
  
  var sceneOptionsSchema = {
    options: {
      required: true,
      clean: makeEnsureListItemsMatchSchema(sceneOptionSchema)
    }
  };
  
  var sceneSectionSchema = {
    id: {
      required: true,
      clean: null
    },
    title: {
      required: false,
      clean: null
    },
    tags: {
      required: false,
      clean: propParser.parseTagList
    },
    content: {
      required: true,
      clean: null
    },
    options: {
      required: false,
      clean: makeEnsureObjectMatchesSchema(sceneOptionsSchema)
    }
  };
  
  var sceneSchema = _.clone(sceneSectionSchema, true);
  sceneSchema.type = {
    required: true,
    clean: propParser.makeEnsureEqualTo('scene')
  };
  sceneSchema.sections = {
    required: false,
    clean: makeEnsureListItemsMatchSchema(sceneSectionSchema)
  };
    
  var parseFromDry = makeEnsureObjectMatchesSchema(sceneSchema);

  module.exports = {
    parseFromContent: parseFromContent,
    parseFromFile: parseFromFile,
    parseFromDry: parseFromDry
  };
}());
