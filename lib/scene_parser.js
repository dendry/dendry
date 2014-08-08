/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');

  var propParser = require('./prop_parser');
  var dryParser = require('./dry_parser');

  // --------------------------------------------------------------------
  // Schemae
  // --------------------------------------------------------------------

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
      clean: propParser.makeEnsureListItemsMatchSchema(sceneOptionSchema)
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
      clean: propParser.makeEnsureObjectMatchesSchema(sceneOptionsSchema)
    }
  };

  var sceneSchema = _.clone(sceneSectionSchema, true);
  sceneSchema.type = {
    required: true,
    clean: propParser.makeEnsureEqualTo('scene')
  };
  sceneSchema.sections = {
    required: false,
    clean: propParser.makeEnsureListItemsMatchSchema(sceneSectionSchema)
  };

  // --------------------------------------------------------------------

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

  var parseFromDry = propParser.makeEnsureObjectMatchesSchema(sceneSchema);

  module.exports = {
    parseFromContent: parseFromContent,
    parseFromFile: parseFromFile,
    parseFromDry: parseFromDry
  };
}());
