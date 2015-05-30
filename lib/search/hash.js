/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');
  var crypto = require('crypto');

  // We assume we have a regular engine state object with qualities
  // and visits counts, a currentSceneSeed array and the rest raw
  // data.
  var hashState = function(stateObject) {
    var hash = crypto.createHash('sha1');
    hash.update(stateObject.sceneId);
    _addArrayToHash(hash, stateObject.sceneIdsSinceGoTo);
    hash.update(stateObject.rootSceneId);
    hash.update(stateObject.gameOver.toString());
    _addObjectToHash(hash, stateObject.qualities);
    _addObjectToHash(hash, stateObject.visits);
    _addArrayToHash(hash, stateObject.currentRandomState);
    return hash.digest('hex');
  };

  var _addArrayToHash = function(hash, array) {
    _.each(array, function(item) {
      hash.update(item.toString());
    });
  };

  var _addObjectToHash = function(hash, object) {
    var keys = _.keys(object).sort();
    _.each(keys, function(key) {
      hash.update(key);
      hash.update(object[key].toString());
    });
  };

  module.exports = {
    hashState: hashState
  };

}());
