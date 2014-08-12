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

    var addToScenes = function(scene) {
      if (result.scenes[scene.id] !== undefined) {
        callback(
          new Error("Duplicate scenes with id '"+scene.id+"' found.")
        );
        return false;
      }

      // Add the scene to the scene list.
      result.scenes[scene.id] = scene;

      // Add tag lookups.
      if (scene.tags !== undefined) {
        _.each(scene.tags, function(tag) {
          if (result.tagLookup[tag] === undefined) {
            result.tagLookup[tag] = {};
          }
          result.tagLookup[tag][scene.id] = true;
        });
      }

      // No error found.
      return true;
    };

    var ok = _.every(listOfScenes, function(scene) {
      // Add sections as scenes.
      if (scene.sections !== undefined && scene.sections.length > 0) {
        if (!_.every(scene.sections, addToScenes)) return false;
      }
      delete scene.sections;

      // Add the main scene.
      return addToScenes(scene);
    });
    if (ok) return callback(null, result);
  };

  module.exports = {
    compile: compile
  };
}());
