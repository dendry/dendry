/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  // Export.
  var dendry = {
  };

  if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = dendry;
  } else {
    // Browser <script>
    this.dendry = dendry;
  }
}());

