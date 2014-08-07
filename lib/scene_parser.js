/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var async = require('async');
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
  
  var schema = {
    id: {
      required: true,
      clean: null
    },
    type:{
      required: true,
      clean: propParser.makeEnsureEqualTo('scene')
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
      required: false,
      clean: null
    },
    options: {
      required: false,
      list: true,
      schema: {
        // No params in options.
      }
    },
    sections: {
      required: false,
      list: true,
      schema: {
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
        }
      }
    }
  };
  
  var reservedProps = {
    content: true,
    sections: true,
    options: true
  };
  
  var parseFromDry = function(dry, callback) {
    // Find list of properties in the dry. We'll remove these as we process
    // them, leaving just 'extras' we have no schema for.
    var props = {};
    for (var name in dry) {
      props[name] = true;
    }
    
    // Async each requires a list to iterate over.
    var schemaNames = [];
    for (name in schema) schemaNames.push(name);
    
    // Go through the properties in the schema.
    async.each(schemaNames, function(name, itcallback) {
      var propSchema = schema[name];
      var valueInDry = dry[name];
      
      // Remove this name if we've got it.
      delete props[name];
      
      // Ensure we have required values.
      if (valueInDry === undefined) {
        if (propSchema.required) {
          return itcallback(new Error(
            "Required property '"+name+"' missing."));
        }
        return itcallback();
      }
      
      // Clean and parse values
      var clean = propSchema.clean;
      if (clean === undefined) {
        // Check for subschema and validate against that.
        return itcallback();
      } else if (clean === null) {
        // No-op, the value can be used as a string.
        return itcallback();
      } else {
        // We have a parsing function.
        clean(valueInDry, function(err, value) {
          if (err) return itcallback(err);
          dry[name] = value;
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

      return callback(null, dry);
    });
  };

  module.exports = {
    parseFromContent: parseFromContent,
    parseFromFile: parseFromFile,
    parseFromDry: parseFromDry
  };
}());
