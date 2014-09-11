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

  var dryParser = require('./dry_parser');
  var propval = dryParser.propval;
  var properr = dryParser.properr;
  var propline = dryParser.propline;

  // |f the property is valid, calls back with an integer.
  var validateInteger = function(property, callback) {
    var integer = parseInt(propval(property));
    if (isNaN(integer)) {
      var err = properr(property, "Not a valid whole number.");
      err.property = property;
      return callback(err);
    } else {
      return callback(null, integer);
    }
  };

  // |f the property is valid, calls back with an id.
  var validateId = function(property, callback) {
    property = propval(property).trim();
    if (property.substr(0, 1) === '@') property = property.substr(1);
    if (dryParser.regexes.id.test(property)) {
      return callback(null, property);
    } else {
      var err = properr(property, "Not a valid id.");
      err.property = property;
      return callback(err);
    }
  };

  // |f the property is valid, calls back with a relative id.
  var validateRelativeId = function(property, callback) {
    property = propval(property).trim();
    if (property.substr(0, 1) === '@') property = property.substr(1);
    if (dryParser.regexes.relativeId.test(property)) {
      return callback(null, property);
    } else {
      var err = properr(property, "Not a valid relative id.");
      err.property = property;
      return callback(err);
    }
  };

  // |f the property is valid, calls back with an integer.
  var validateBoolean = function(property, callback) {
    var name = propval(property).toLowerCase().trim();
    if (/^(yes|true|t|y|ok)$/.test(name)) {
      return callback(null, true);
    } else if (/^(no|false|f|n)$/.test(name)) {
      return callback(null, false);
    } else {
      var integer = parseInt(name);
      if (!isNaN(integer)) {
        return callback(null, !!integer);
      } else {
        var err = properr(property, "Not a valid yes/no value.");
        err.property = property;
        return callback(err);
      }
    }
  };

  // Generator to make tests to convert properties to an integer and check
  // they are in bounds.
  var makeEnsureIntegerInRange = function(min, max) {
    return function(property, callback) {
      validateInteger(property, function(err, val) {
        if (err) return callback(err);
        if ((min !== undefined && val < min) ||
            (max !== undefined && val > max)) {
          if (min !== undefined) {
            if (max !== undefined) {
              err = properr(property, ""+val+" is not in range "+
                            min+"-"+max+".");
            } else {
              err = properr(property, ""+val+" is not in range "+min+"+.");
            }
          } else {
            err = properr(property, ""+val+" is not in range -"+max+".");
          }
          err.property = property;
          return callback(err);
        }
        return callback(null, val);
      });
    };
  };

  // Generator to make tests to check if a property is equal to a given value.
  var makeEnsureEqualTo = function(what, value) {
    value = value.trim();
    return function(property, callback) {
      var val = propval(property).trim();
      if (val === value) {
        return callback(null, value);
      } else {
        return callback(properr(property, what+" must equal '"+value+"', '"+
                                val+"' found instead."));
      }
    };
  };

  // If the property is valid, calls back with a list of tags, stripped of
  // any leading hash symbols. Tags can be whitespace, comma or semicolon
  // separated.
  var tagSeparatorRe = /[\s;,]+/;
  var tagRe = /^#?([0-9a-zA-z_-]+)$/;
  var validateTagList = function(property, callback) {
    var tags = propval(property).split(tagSeparatorRe);
    var result = [];
    for (var i = 0; i < tags.length; ++i) {
      var tag = tags[i].trim();
      if (!tag) continue;

      var match = tagRe.exec(tag);
      if (!match) {
        var err = properr(property, "Tag "+(i+1)+" '"+tag+"' is not valid.");
        err.property = property;
        return callback(err);
      } else {
        result.push(match[1]);
      }
    }
    return callback(null, result);
  };

  var makeEnsureObjectMatchesSchema = function(schema) {
  return function(property, callback) {
      var object = propval(property);

      // Find list of properties in the dry. We'll remove these as we process
      // them, leaving just 'extras' we have no schema for.
      var props = {};
      for (var name in object) {
        props[name] = propline(object[name]) || true;
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
            return itcallback(properr(property,
              "Required property '"+name+"' missing."));
          }
          return itcallback();
        }

        // Validate and parse values
        var validate = propSchema.validate;
        if (!validate) {

          // Remove names that we should trim.
          if (propSchema.remove) {
            delete object[name];
          } else {
            // Use the value, stripped of property data (e.g. line numbers).
            object[name] = propval(valueInObject);
          }

          return itcallback();
        } else {
          // We have a validation function.
          validate(valueInObject, function(err, value) {
            if (err) return itcallback(err);

            // Remove names that we should trim (NB: after validation).
            if (propSchema.remove) {
              delete object[name];
            } else {
              // Use the validated value.
              object[name] = value;
            }

            return itcallback();
          });
        }

      }, function(err) {
        if (err) return callback(err);

        // Anything left in the defined properties, are extras and not allowed.
        var extras = [];
        for (var name in props) extras.push(name);
        if (extras.length > 0) {
          var extrasQuoted = _.map(extras, function(value) {
            var line = props[value];
            if (line !== true) {
              return "'"+value+"' (line "+line+")";
            } else {
              return "'"+value+"'";
            }
          });
          return callback(properr(property,
            "Unknown properties: "+extrasQuoted.join(', ')+"."));
        }

        return callback(null, object);
      });
    };
  };

  var makeEnsureListItemsMatchSchema = function(schema) {
    var ensureItem = makeEnsureObjectMatchesSchema(schema);
    return function(property, callback) {
      var list = propval(property);
      var result = [];
      async.each(list, function(item, done) {
        ensureItem(item, function(err, resultItem) {
          if (err) return done(err);
          result.push(resultItem);
          return done();
        });
      }, function(err) {
        if (err) callback(err);
        else callback(null, result);
      });
    };
  };

  // For each item in the list, its id is used to look up a schema in the
  // given schemae object. That schema is then used to validate the item.
  // If the id doesn't match a schema, then the $default schema is used, if
  // no default is available, an error is raised.
  var makeEnsureListItemsMatchSchemaById = function(schemae) {
    return function(property, callback) {
      var list = propval(property);
      var result = [];
      async.each(list, function(item, done) {
        var listItem = propval(item);
        var id = propval(listItem.id);
        var schema = schemae[id];
        if (schema === undefined) schema = schemae.$default;
        if (schema === undefined) {
          var propToPass = property;
          if (propToPass.$line === undefined) {
            propToPass = item;
            if (propToPass.$line === undefined) {
              propToPass = item.id;
            }
          }
          return done(properr(propToPass,
                              "Found an item with an unknown id '"+id+"'."));
        }
        var ensureItem = makeEnsureObjectMatchesSchema(schema);
        ensureItem(item, function(err, resultItem) {
          if (err) return done(err);
          result.push(resultItem);
          return done();
        });
      }, function(err) {
        if (err) callback(err);
        else callback(null, result);
      });
    };
  };

  module.exports = {
    validateBoolean: validateBoolean,
    validateId: validateId,
    validateRelativeId: validateRelativeId,
    validateInteger: validateInteger,
    makeEnsureIntegerInRange: makeEnsureIntegerInRange,
    makeEnsureEqualTo: makeEnsureEqualTo,
    validateTagList: validateTagList,
    makeEnsureObjectMatchesSchema: makeEnsureObjectMatchesSchema,
    makeEnsureListItemsMatchSchema: makeEnsureListItemsMatchSchema,
    makeEnsureListItemsMatchSchemaById: makeEnsureListItemsMatchSchemaById
  };
}());
