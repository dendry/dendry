/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');

  var validators = require('./validators');
  var dryParser = require('./dry_parser');

  // --------------------------------------------------------------------
  // Schemae
  // --------------------------------------------------------------------

  var sceneOptionSchema = {
    id: {
      required: true,
      validate: null
    },
    title: {
      required: false,
      validate: null
    },
    viewIf: {
      required: false,
      validate: null
    }
  };

  var sceneOptionsSchema = {
    options: {
      required: true,
      validate: validators.makeEnsureListItemsMatchSchema(sceneOptionSchema)
    }
  };

  var sceneSectionSchema = {
    id: {
      required: true,
      validate: null
    },
    title: {
      required: false,
      validate: null
    },
    tags: {
      required: false,
      validate: validators.validateTagList
    },
    content: {
      required: true,
      validate: null
    },
    options: {
      required: false,
      validate: validators.makeEnsureObjectMatchesSchema(sceneOptionsSchema)
    }
  };

  var sceneSchema = _.assign(_.clone(sceneSectionSchema, true), {
    type: {
      required: true,
      validate: validators.makeEnsureEqualTo('scene')
    },
    sections: {
      required: false,
      validate: validators.makeEnsureListItemsMatchSchema(sceneSectionSchema)
    }
  });

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

  var parseFromDry = validators.makeEnsureObjectMatchesSchema(sceneSchema);

  module.exports = {
    parseFromContent: parseFromContent,
    parseFromFile: parseFromFile,
    parseFromDry: parseFromDry
  };
}());
