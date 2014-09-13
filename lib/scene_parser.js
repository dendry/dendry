/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var mdp = require('./make_dry_parser');
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
    order: {
      required: false,
      validate: validators.validateInteger
    },
    maxVisits: {
      required: false,
      validate: validators.makeEnsureIntegerInRange(0, undefined)
    },
    gameOver: {
      required: false,
      validate: validators.validateBoolean
    },
    goTo: {
      required: false,
      validate: validators.validateRelativeId
    },
    newPage: {
      required: false,
      validate: validators.validateBoolean
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

  var sceneSchema = mdp.extendSchema(sceneSectionSchema, {
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

  module.exports = mdp.makeExports(sceneSchema);
}());
