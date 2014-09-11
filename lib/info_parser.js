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
    content: {
      required: false,
      validate: null
    }
  };

  // --------------------------------------------------------------------

  module.exports = mdp.makeExports(infoSchema);
}());
