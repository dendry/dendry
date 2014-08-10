/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');

  // Takes lists of dry files and builds a final playable game structure.
  var compile = function(infoDry, listOfScenes, callback) {
    var result = {
      title: infoDry.title,
      author: infoDry.author,
      sceneLookup: {},
      tagLookup: {}
    };
    _.each(listOfScenes, function(scene) {
      result.sceneLookup[scene.id] = scene;
      if (scene.tags !== undefined) {
        _.each(scene.tags, function(tag) {
          if (result.tagLookup[tag] === undefined) {
            result.tagLookup[tag] = [];
          }
          result.tagLookup[tag].push(scene.id);
        });
      }
    });
    return callback(null, result);
  };

  module.exports = {
    compile: compile
  };
}());
