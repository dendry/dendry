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
    title: {
      required: true,
      validate: null
    },
    author: {
      required: true,
      validate: null
    },
    content: {
      required: false,
      validate: null
    }
  };

  // --------------------------------------------------------------------

  module.exports = mdp.makeExports(infoSchema);
}());
