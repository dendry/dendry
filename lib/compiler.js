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
      scenes: {},
      tagLookup: {}
    };
    var ok = _.every(listOfScenes, function(scene) {
      if (result.scenes[scene.id] !== undefined) {
        return callback(
          new Error("Duplicate scenes with id '"+scene.id+"' found.")
        );
      }
      result.scenes[scene.id] = scene;
      if (scene.tags !== undefined) {
        _.each(scene.tags, function(tag) {
          if (result.tagLookup[tag] === undefined) {
            result.tagLookup[tag] = {};
          }
          result.tagLookup[tag][scene.id] = true;
        });
      }
      return true;
    });
    if (ok) return callback(null, result);
  };

  module.exports = {
    compile: compile
  };
}());
