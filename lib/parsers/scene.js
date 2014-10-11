/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var make = require('./make');
  var validators = require('./validators');
  var dryParser = require('./dry');

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
      validate: validators.validateLineContent
    },
    viewIf: {
      required: false,
      validate: validators.validatePredicate
    },
    order: {
      required: false,
      validate: validators.validateInteger
    },
    priority: {
      required: false,
      validate: validators.validateInteger
    },
    frequency: {
      required: false,
      validate: validators.validateFloat
    }
  };

  var sceneSectionSchema = {
    $clean: function(object, callback) {
      if (object.maxVisits !== undefined) {
        if (object.countVisitsMax !== undefined &&
            object.countVisitsMax < object.maxVisits) {
          var cv = dryParser.propertyFileAndLine(object, 'countVisitsMax');
          var mv = dryParser.propertyFileAndLine(object, 'maxVisits');
          var msg = (
            "Cannot have count-visits-max ("+cv+
            ") set lower than max-visits ("+mv+")."
            );
          return callback(new Error(msg));
        }
        if (object.countVisitsMax === undefined) {
          object.countVisitsMax = object.maxVisits;
        }
      }
      callback(null, object);
    },
    id: {
      required: true,
      validate: null
    },
    title: {
      required: false,
      validate: validators.validateLineContent
    },
    signal: {
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
    priority: {
      required: false,
      validate: validators.validateInteger
    },
    frequency: {
      required: false,
      validate: validators.validateFloat
    },

    viewIf: {
      required: false,
      validate: validators.validatePredicate
    },
    maxVisits: {
      required: false,
      validate: validators.makeEnsureInRange(1, undefined)
    },
    countVisitsMax: { // always at least as high as maxVisits, if that is set
      required: false,
      validate: validators.makeEnsureInRange(1, undefined)
    },

    onArrival: {
      required: false,
      validate: validators.validateActions
    },
    onDeparture: {
      required: false,
      validate: validators.validateActions
    },
    onDisplay: {
      required: false,
      validate: validators.validateActions
    },

    gameOver: {
      required: false,
      validate: validators.validateBoolean
    },
    goTo: {
      required: false,
      validate: validators.validateGoTo
    },
    newPage: {
      required: false,
      validate: validators.validateBoolean
    },

    setRoot: {
      required: false,
      validate: validators.validateBoolean
    },

    minChoices: {
      required: false,
      validate: validators.validateInteger
    },
    maxChoices: {
      required: false,
      validate: validators.validateInteger
    },

    content: {
      required: true,
      validate: validators.validateParagraphContent
    },
    options: {
      required: false,
      validate: validators.makeEnsureListItemsMatchSchema(sceneOptionSchema)
    }
  };

  var sceneSchema = make.extendSchema(sceneSectionSchema, {
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

  module.exports = make.makeExports(sceneSchema);
  module.exports.optionSchema = sceneOptionSchema;
}());
