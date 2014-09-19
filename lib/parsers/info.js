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

  // --------------------------------------------------------------------
  // Schemae
  // --------------------------------------------------------------------

  var infoSchema = {
    id: {
      remove: true
    },
    type: {
      remove: true,
      required: false,
      validate: validators.makeEnsureEqualTo('File type', 'info')
    },
    title: {
      required: true,
      validate: null
    },
    author: {
      required: true,
      validate: null
    },

    firstScene: {
      required: false,
      validate: validators.validateId
    },
    rootScene: {
      required: false,
      validate: validators.validateId
    },

    content: {
      required: false,
      validate: null
    }
  };

  // --------------------------------------------------------------------

  module.exports = make.makeExports(infoSchema);
}());
