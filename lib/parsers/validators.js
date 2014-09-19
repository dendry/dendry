/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var async = require('async');
  var assert = require('assert');
  var _ = require('lodash');

  var engine = require('../engine');
  var dryParser = require('./dry');
  var logic = require('./logic');
  var propval = dryParser.propval;
  var properr = dryParser.properr;
  var propline = dryParser.propline;
  var propfile = dryParser.propfile;

  // ------------------------------------------------------------------------
  // Basic Types
  // ------------------------------------------------------------------------

  // |f the property is valid, calls back with an integer.
  var validateInteger = function(property, callback) {
    var val = propval(property);
    var integer = parseInt(val);
    if (isNaN(integer)) {
      var err = properr(property, "'"+val+"' is not a valid whole number.");
      err.property = property;
      return callback(err);
    } else {
      return callback(null, integer);
    }
  };

  // |f the property is valid, calls back with a float.
  var validateFloat = function(property, callback) {
    var val = propval(property);
    var integer = parseFloat(val);
    if (isNaN(integer)) {
      var err = properr(property, "'"+val+"' is not a valid number.");
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
      var err = properr(property, "'"+property+"' is not a valid id.");
      err.property = property;
      return callback(err);
    }
  };

  var validateQualityName = function(property, callback) {
    property = propval(property).trim();
    if (/^[a-zA-Z][\-a-zA-Z0-9_]*$/.test(property)) {
      return callback(null, property);
    } else {
      var err = properr(property,
                        "'"+property+"' is not a valid quality name.");
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
      var err = properr(property, "'"+property+"' is not a valid relative id.");
      err.property = property;
      return callback(err);
    }
  };

  // |f the property is valid, calls back with an integer.
  var validateBoolean = function(property, callback) {
    var val = propval(property);
    var name = val.toLowerCase().trim();
    if (/^(yes|true|t|y|ok)$/.test(name)) {
      return callback(null, true);
    } else if (/^(no|false|f|n)$/.test(name)) {
      return callback(null, false);
    } else {
      var integer = parseInt(name);
      if (!isNaN(integer)) {
        return callback(null, !!integer);
      } else {
        var err = properr(property, "'"+val+"' is not a valid yes/no value.");
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

  // ------------------------------------------------------------------------
  // Magic and Logic
  // ------------------------------------------------------------------------

  // Makes sure that the property contains instructions to generate a
  // true/false value, either from Magic (javascript code) or an
  // expression in Logic.
  var validatePredicate = function(property, callback) {
    var err;
    var val = propval(property).trim();

    // Check for Magic
    var magicStart = val.search("{!");
    var magicEnd = val.search("!}");
    if (magicStart > -1 || magicEnd > -1) {
      // The content contains magic, check it contains nothing else.
      if (magicStart > 0 || magicEnd < val.length-2) {
        err = properr(
          property,
          "Magic in a predicate must have no other content surrounding it."
        );
        err.property = property;
        return callback(err);
      } else {
        var magic = val.slice(2, -2);
        try {
          var fn = engine.makeFunctionFromSource(magic);
          return callback(null, fn);
        } catch(evalErr) {
          err = properr(property, evalErr.toString());
          err.property = property;
          return callback(err);
        }
      }
    } else {
      logic.compilePredicate(val, function(err, fn) {
        if (err) {
          err = properr(property, err.toString().substr(7));
          err.property = property;
          return callback(err);
        }
        return callback(null, fn);
      });
    }
  };

  // Makes sure that the property contains a series of chunks of
  // functionality, either in Magic or Logic. Sends back an array of
  // actions if validation succeeds.
  var validateActions = function(property, callback) {
    var i;
    var err;
    var val = propval(property).trim();

    // Split up value into chunks by the boundary characters of magic.
    var magicRe = /\{\!([\s\S]*?)\!\}/g;
    var chunks = [];
    var candidateChunks = val.split(magicRe);
    for (i = 0; i < candidateChunks.length; ++i) {
      var candidateChunk = candidateChunks[i].trim();
      if (candidateChunk.length > 0) {
        chunks.push({type:(i%2===0) ? 'logic' : 'magic',
                     source: candidateChunk});
      }
    }

    // Validate and convert each chunk.
    var actions = [];
    i = -1;
    async.eachSeries(chunks, function(chunk, chunkDone) {
      var fn;
      ++i;
      if (chunk.type === 'magic') {
        // Parse this as Magic.
        try {
          fn = engine.makeFunctionFromSource(chunk.source);
          actions.push(fn);
        } catch(evalErr) {
          err = properr(property, evalErr.toString() + " in chunk "+(i+1)+".");
          err.property = property;
          return chunkDone(err);
        }
        return chunkDone();
      } else {
        // Parse this as Logic.
        logic.compileActions(chunk.source, function(err, fn) {
          if (err) return chunkDone(err);
          actions.push(fn);
          return chunkDone();
        });
      }
    }, function(err) {
      if (err) return callback(err);
      else return callback(null, actions);
    });
  };

  // ------------------------------------------------------------------------
  // Schemata
  // ------------------------------------------------------------------------

  var makeEnsureObjectMatchesSchema = function(schema) {
    return function(property, callback) {
      var object = propval(property);

      // Find list of properties in the dry. We'll remove these as we process
      // them, leaving just 'extras' we have no schema for.
      var props = {};
      _.forIn(object, function(field, name) {
        var line = propline(field);
        var file = propfile(field);
        props[name] = (line || file) ? {
          line: propline(field),
          file: propfile(field)
        } : true;
      });

      // Async each requires a list to iterate over.
      var schemaNames = [];
      for (var name in schema) schemaNames.push(name);

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
            var location = props[value];
            if (location !== true) {
              return "'"+value+"' ("+location.file+" line "+location.line+")";
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

  // ------------------------------------------------------------------------
  // Specific property types
  // ------------------------------------------------------------------------

  var endsInMagic = function(startsInMagic, chunk) {
    var lastStart = chunk.lastIndexOf("{!");
    var lastEnd = chunk.lastIndexOf("!}");
    if (lastEnd > lastStart) {
      return false;
    } else if (lastStart > lastEnd) {
      return true;
    } else {
      // They are only equal if neither was found.
      return startsInMagic;
    }
  };

  // GoTo properties take zero or more relative ids followed by
  // if-clauses with predicates, optionally concluded by a relative id
  // without and if-clause. Each of these are separated by
  // semi-colons.
  var validateGoTo = function(property, callback) {
    var val = propval(property);

    // Separate the value by semi-colons. Semi-colons are common in
    // magic, so we'll have to weld chunks back together if they are
    // mid-magic.
    var naiveChunks = val.split(/\s*;\s*/);
    var chunks = [];
    var inMagic = false;
    _.each(naiveChunks, function(chunk) {
      if (inMagic) {
        chunks[chunks.length-1] = chunks[chunks.length-1] + ';' + chunk;
      } else {
        chunks.push(chunk);
      }
      inMagic = endsInMagic(inMagic, chunk);
    });
    // Not an error because dry parsing should have excluded this.
    assert(!inMagic);

    // For each clause, split by the first if and validate each bit.
    var result = [];
    var error;
    async.eachSeries(chunks, function(chunk, chunkDone) {
      var parts = chunk.split(/\s+if\s+/, 2);
      validateRelativeId(parts[0], function(err, relativeId) {
        if (err) return chunkDone(err);
        if (parts.length == 2) {
          validatePredicate(parts[1], function(err, predicate) {
            if (err) return chunkDone(err);
            result.push({id: relativeId, predicate:predicate});
            chunkDone();
          });
        } else {
          result.push({id: relativeId});
          chunkDone();
        }
      });
    }, function(err) {
      if (err) return callback(err);

      // Make sure all gotos in the middle of the list have an if
      // (otherwise they'd never be called).
      for (var i = 0; i < result.length-1; ++i) {
        if (result[i].predicate === undefined) {
          error = properr(
            property,
            "Only the last goto instruction can have no if-clause."
          );
          return callback(error);
        }
      }
      return callback(null, result);
    });
  };

  // ------------------------------------------------------------------------

  module.exports = {
    validateId: validateId,
    validateQualityName: validateQualityName,
    validateBoolean: validateBoolean,
    validateRelativeId: validateRelativeId,
    validateInteger: validateInteger,
    validateFloat: validateFloat,
    makeEnsureIntegerInRange: makeEnsureIntegerInRange,
    makeEnsureEqualTo: makeEnsureEqualTo,
    validateTagList: validateTagList,

    validatePredicate: validatePredicate,
    validateActions: validateActions,

    makeEnsureObjectMatchesSchema: makeEnsureObjectMatchesSchema,
    makeEnsureListItemsMatchSchema: makeEnsureListItemsMatchSchema,
    makeEnsureListItemsMatchSchemaById: makeEnsureListItemsMatchSchemaById,

    validateGoTo: validateGoTo
  };
}());
