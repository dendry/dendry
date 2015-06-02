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

  var qdisplaySchema = {
    id: {
      required: true,
      validate: validators.makeExcludeIdOrName(
        "Quality display",
        validators.validateQualityName,
        ['cardinal', 'ordinal', 'number', 'fudge']
      )
    },
    type: {
      required: true,
      validate: validators.makeEnsureEqualTo('File type', 'qdisplay')
    },

    content: { 
      required: true,
      validate: validators.validateQDisplayContent
    }
  };

  // --------------------------------------------------------------------

  module.exports = make.makeExports(qdisplaySchema);
}());
