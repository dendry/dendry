/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var bdp = require('./base_dry_parser');
  var validators = require('./validators');

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

  var sceneSchema = bdp.extendSchema(sceneSectionSchema, {
    type: {
      required: true,
      validate: validators.makeEnsureEqualTo('File type', 'scene')
    },
    sections: {
      required: false,
      validate: validators.makeEnsureListItemsMatchSchema(sceneSectionSchema)
    }
  });

  // --------------------------------------------------------------------

  module.exports = bdp.makeExports(sceneSchema);
}());
