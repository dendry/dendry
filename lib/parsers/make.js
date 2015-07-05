/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  'use strict';

  var _ = require('lodash');

  var validators = require('./validators');
  var dryParser = require('./dry');

  // ----------------------------------------------------------------------
  // Routines to author schema.
  var extendSchema = function(orig, additional) {
    return _.assign(_.clone(orig, true), additional);
  };

  // ----------------------------------------------------------------------
  // Routines to set up dry file parsing.

  var makeParseFromContent = function(schema) {
    var ensure = validators.makeEnsureObjectMatchesSchema(schema);
    return function(filename, content, callback) {
      dryParser.parseFromContent(filename, content, function(err, dry) {
        if (err) {
          return callback(err);
        }
        ensure(dry, null, callback);
      });
    };
  };

  var makeParseFromFile = function(schema) {
    var ensure = validators.makeEnsureObjectMatchesSchema(schema);
    return function(filename, callback) {
      dryParser.parseFromFile(filename, function(err, dry) {
        if (err) {
          return callback(err);
        }
        ensure(dry, null, callback);
      });
    };
  };

  var makeParseFromDry = validators.makeEnsureObjectMatchesSchema;

  var makeExports = function(schema) {
    return {
      schema: schema,
      parseFromContent: makeParseFromContent(schema),
      parseFromFile: makeParseFromFile(schema),
      parseFromDry: makeParseFromDry(schema)
    };
  };

  module.exports = {
    extendSchema: extendSchema,

    makeParseFromContent: makeParseFromContent,
    makeParseFromFile: makeParseFromFile,
    makeParseFromDry: makeParseFromDry,
    makeExports: makeExports
  };
}());
