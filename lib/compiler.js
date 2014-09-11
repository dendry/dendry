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

    // ......................................................................
    // Helper functions
    // ......................................................................
    var addToScenes = function(scene, parentId) {
      var id = scene.id;
      if (parentId !== undefined && id.lastIndexOf(parentId, 0) === -1) {
        // We have a scene id that doesn't include its parent, so add
        // the parent.
        id = parentId + '.' + id;
        scene.id = id;
      }

      if (result.scenes[id] !== undefined) {
        callback(
          new Error("Duplicate scenes with id '"+id+"' found.")
        );
        return false;
      }

      // Add the scene to the scene list.
      result.scenes[id] = scene;

      // Add tag lookups.
      if (scene.tags !== undefined) {
        _.each(scene.tags, function(tag) {
          if (result.tagLookup[tag] === undefined) {
            result.tagLookup[tag] = {};
          }
          result.tagLookup[tag][id] = true;
        });
      }

      // No error found.
      return true;
    };

    var addTopLevelSceneToScenes = function(scene) {
      // Add sections as scenes.
      if (scene.sections !== undefined && scene.sections.length > 0) {
        var ok = _.every(scene.sections, function(section) {
          return addToScenes(section, scene.id);
        });
        if (!ok) return false;
      }
      delete scene.sections;

      // Add the main scene.
      return addToScenes(scene);
    };

    /**
     * Uses the registered scenes to figure out what fully-qualified
     * id is intended by the given id used in the given parent.
     */
    var getFullyQualifiedId = function(parentId, id) {
      var newId = null;
      if (result.scenes[id] !== undefined) {
        newId = id;
      } else {
        var parentComponents = parentId.split('.');
        for (var i = 0; i < parentComponents.length; ++i) {
          var ancestorId = parentComponents.slice(0, i+1).join('.');
          var candidateId = ancestorId + '.' + id;
          if (result.scenes[candidateId] !== undefined) {
            newId = candidateId;
            break;
          }
        }
      }

      if (newId === null) {
        callback(
          new Error("Couldn't find an id matching '"+id+"' in '"+parentId+"'.")
        );
      }
      return newId;
    };

    var fullyQualifyIdsInScene = function(scene) {
      if (scene.goTo !== undefined) {
        var newId = getFullyQualifiedId(scene.id, scene.goTo);
        if (newId === null) return false;
        scene.goTo = newId;
      }
      var ok = true;
      if (scene.options !== undefined) {
        ok = _.every(scene.options.options, function(option) {
          if (option.id.substr(0, 1) === '@') {
            var oldId = option.id.substring(1);
            var newId = getFullyQualifiedId(scene.id, oldId);
            if (newId === null) return false;
            option.id = "@"+newId;
          }
          return true;
        });
      }
      return ok;
    };

    // ......................................................................
    // Run the compilation.
    // ......................................................................

    // Add all scenes to the game.
    var ok = _.every(listOfScenes, addTopLevelSceneToScenes);
    if (!ok) return;

    // Go through all id references and figure out the fully qualified
    // id intended.
    ok = _.every(result.scenes, fullyQualifyIdsInScene);
    if (ok) return callback(null, result);
  };

  module.exports = {
    compile: compile
  };
}());
