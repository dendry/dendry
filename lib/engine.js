/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  // To avoid the need to include any utility libraries when this is
  // used in a browser, define some helper functions we'd normally
  // rely on libraries for.

  var assert = function(mustBeTrue) {
    /* istanbul ignore if */
    if (!mustBeTrue) throw new Error("Assertion failed.");
  };

  var each = function(array, fn) {
    for (var i = 0; i < array.length; ++i) {
      fn(array[i]);
    }
  };

  var objEach = function(obj, fn) {
    for (var key in obj) {
      fn(key);
    }
  };

  // Credit: Taken from Lodash (MIT License). See CREDITS.
  var isObject = function(value) {
    var type = typeof value;
    return type == 'function' || (value && type == 'object') || false;
  };

  var makeFunctionFromSource = function(source) {
    /*jshint -W054 */
    var fn = new Function('ui', 'state', 'Q', source);
    /*jshint +W054 */
    fn.source = source;
    return fn;
  };

  var convertJSONToGame = function(json, callback) {
    var reviver = function(key, value) {
      if (isObject(value) && value.$code !== undefined) {
        return makeFunctionFromSource(value.$code);
      } else {
        return value;
      }
    };

    try {
      var game = JSON.parse(json, reviver);
      return callback(null, game);
    } catch (err) {
      return callback(err);
    }
  };

  // ------------------------------------------------------------------------

  // Objects with this interface are passed to a game state to have it
  // display content.
  var UserInterface = function() {};
  UserInterface.prototype.beginGame = function() {};
  UserInterface.prototype.displayContent = function(content) {};
  UserInterface.prototype.displayChoices = function(choices) {};
  UserInterface.prototype.displayGameOver = function() {
    this.displayContent("Game Over");
  };
  UserInterface.prototype.removeChoices = function() {};
  UserInterface.prototype.newPage = function() {};
  // Allows us to simply subclass.
  UserInterface.makeParentOf = function(OtherConstructor) {
    OtherConstructor.prototype = new UserInterface();
    OtherConstructor.constructor = OtherConstructor;
  };

  // ------------------------------------------------------------------------

  // An engine is given a user interface, the game and the current
  // game state (can be omitted). It is responsible for the logic of
  // the game.
  var DendryEngine = function(ui, game, state) {
    this.ui = ui;
    this.game = game;
    this.state = state;
  };

  DendryEngine.prototype.displayGameOver = function() {
    this.ui.displayGameOver();
    return this;
  };

  DendryEngine.prototype.displayChoices = function() {
    var choices = this.getCurrentChoices();
    assert(choices);
    this.ui.displayChoices(choices);

    return this;
  };

  DendryEngine.prototype.displaySceneContent = function() {
    var that = this;

    var scene = this.getCurrentScene();
    assert(scene);

    if (scene.newPage) {
      this.ui.newPage();
    }
    this.ui.removeChoices();

    this._runActions(scene.onDisplay);
    if (scene.content) {
      this.ui.displayContent(scene.content);
    }

    return this;
  };

  DendryEngine.prototype.choose = function(choiceIndex) {
    var choices = this.state.choices;

    // Check for valid choice.
    assert(choices);
    if (choices.length <= choiceIndex) {
      throw new Error("No choice at index "+choiceIndex+", only "+
                      choices.length+" choices are available.");
    }

    // Commit the choice.
    var choice = choices[choiceIndex];
    var id = choice.id;

    delete this.state.choices;
    this.state.turn++;
    this.goToScene(id);

    return this;
  };

  // If we're restoring the game from some state, we don't want to
  // leave the previous scene or run the 'before' code of the new
  // scene.
  DendryEngine.prototype.goToScene = function(id, dontTransition) {
    var scene;
    var that = this;

    // Leave previous scene.
    if (!dontTransition && !!this.state.sceneId) {
      scene = this.getCurrentScene();
      this._runActions(scene.onDeparture);
    }

    scene = this.game.scenes[id];
    assert(scene);

    // Arrive at current scene.
    this.state.sceneId = id;
    if (!dontTransition) this._runActions(scene.onArrival);
    if (this.state.visits[id] === undefined) this.state.visits[id] = 1;
    else this.state.visits[id]++;

    this.displaySceneContent();

    // Check if we're done.
    if (scene.gameOver) {
      this.gameOver();
    } else if (scene.goTo) {
      this.goToScene(scene.goTo);
    } else {
      // Check game over based on exhaustion (follows goto check)
      this.state.choices = this._compileChoices(scene);
      if (this.state.choices === null) {
        this.gameOver();
      } else {
        this.displayChoices();
      }
    }
  };

  DendryEngine.prototype.getRootSceneId = function() {
    return this.game.firstScene || 'root';
  };

  DendryEngine.prototype.beginGame = function() {
    this.state = {
      sceneId: null,
      gameOver: false,
      turn: 0,
      visits: {},
      qualities: {}
    };

    this.ui.beginGame();

    var id = this.getRootSceneId();
    this.goToScene(id);

    return this;
  };

  DendryEngine.prototype.gameOver = function() {
    this.state.gameOver = true;
    this.displayGameOver();
    return this;
  };

  DendryEngine.prototype.isGameOver = function() {
    return this.state.gameOver;
  };

  DendryEngine.prototype.getCurrentScene = function() {
    var scene = this.game.scenes[this.state.sceneId];
    assert(scene !== undefined);
    return scene;
  };

  // Returns the choices for the current scene. Choices are objects
  // with an id and a title property, not to be confused with the
  // option objects in a scene (though options are used to generate
  // choices). Choices are compiled from the options belonging to the
  // current scene.
  DendryEngine.prototype.getCurrentChoices = function() {
    return this.state.choices;
  };

  // ------------------------------------------------------------------------

  DendryEngine.prototype._runActions = function(actions) {
    var that = this;
    if (actions === undefined) return;
    each(actions, function(fn) {
      try {
        fn(that, that.state, that.state.qualities);
      } catch(err) {
        // Ignore errors. TODO: Log them somehow?
      }
    });
  };

  DendryEngine.prototype._runPredicate = function(predicate, default_) {
    var result = default_;
    if (predicate === undefined) return result;
    try {
      result = !!predicate(this, this.state, this.state.qualities);
    } catch(err) {
      // Ignore errors. TODO: Log them somehow?
    }
    return result;
  };

  DendryEngine.prototype.__getChoiceData = function(idToTitleMap) {
    var result = [];
    for (var id in idToTitleMap) {
      var optionScene = this.game.scenes[id];
      var title = idToTitleMap[id] || optionScene.title;
      assert(title);
      var order = optionScene.order || 0;
      var priority = optionScene.priority || 1;
      var frequency = optionScene.frequency || 100;
      result.push({
        id: id,
        title: title,
        order: order,
        priority: priority,
        frequency: frequency,
        selectionPriority: 0 // Used by filterByPriority.
      });
    }
    return result;
  };

  DendryEngine.prototype.__filterViewable = function(idToTitleMap) {
    var result = {};
    for (var id in idToTitleMap) {
      var thisScene = this.game.scenes[id];

      // This id fails if it is past its max visits.
      var maxVisits = thisScene.maxVisits;
      if (maxVisits !== undefined) {
        var visits = this.state.visits[id] || 0;
        if (visits >= maxVisits) continue;
      }

      // It fails if its predicate fails.
      var canView = this._runPredicate(thisScene.viewIf, true);
      if (!canView) continue;

      // It passes otherwise.
      result[id] = idToTitleMap[id];
    }
    return result;
  };

  DendryEngine.prototype.__getChoiceIdsFromOptions = function(options) {
    var that = this;

    var choices = {};
    each(options, function(option) {
      if (option.id.substr(0, 1) === '@') {
        // This is an id, use it.
        choices[option.id.substring(1)] = option.title || null;
      } else {
        assert(option.id.substr(0, 1) === '#');
        // This is a tag, add all matching ids.
        var ids = that.game.tagLookup[option.id.substring(1)];
        objEach(ids, function(id) {
          if (choices[id] === undefined) choices[id] = null;
        });
      }
    });
    return choices;
  };

  // Code based on Undum (MIT License). See CREDITS.
  DendryEngine.prototype.__filterByPriority = function(choices,
                                                    minChoices, maxChoices) {
    assert(minChoices === null ||
           maxChoices === null ||
           maxChoices >= minChoices);

    var committed = [];
    var candidates = [];
    var choice;

    // Work in descending priority order.
    choices.sort(function(a, b) {
      return b.priority - a.priority;
    });

    // First phase: we make sure we have at least our minimum number
    // of choices, and that we consider the minimum possible number of
    // priorities to reach that minimum.
    var lastPriority;
    for (var i = 0; i < choices.length; ++i) {
      choice = choices[i];
      if (choice.priority != lastPriority) {
        if (lastPriority !== undefined) {
          // Priority has decreased, use the candidates if there are enough.
          if (minChoices === null || i >= minChoices) break;
        }

        // We're going on, so commit our current candidates.
        committed.push.apply(committed, candidates);
        candidates = [];
        lastPriority = choice.priority;
      }
      candidates.push(choice);
    }

    // Second phase: we commit as many candidates as we can without
    // exceeding our maximum.
    var committedChoices = committed.length;
    var totalChoices = committedChoices + candidates.length;
    if (maxChoices === null || maxChoices >= totalChoices) {
      // We can use all the candidates without exceeding our maximum.
      committed.push.apply(committed, candidates);
    } else {
      // Take a subset of the candidates, using their relative frequency.
      each(candidates, function(choice) {
        choice.selectionPriority = Math.random() / choice.frequency;
      });
      candidates.sort(function(a, b) {
        return a.selectionPriority - b.selectionPriority;
      });
      var extraChoices = maxChoices - committedChoices;
      var chosen = candidates.slice(0, extraChoices);
      committed.push.apply(committed, chosen);
    }

    return committed;
  };

  DendryEngine.prototype._compileChoices = function(scene) {
    var id;

    assert(scene);

    var optionsData = scene.options;
    if (optionsData !== undefined && optionsData.options !== undefined) {

      var choiceIds = this.__getChoiceIdsFromOptions(optionsData.options);
      choiceIds = this.__filterViewable(choiceIds);

      var validChoiceData = this.__getChoiceData(choiceIds);
      var minChoices = optionsData.minChoices || null;
      var maxChoices = optionsData.maxChoices || null;
      validChoiceData = this.__filterByPriority(validChoiceData,
                                                minChoices, maxChoices);

      // Sort the result into display order.
      validChoiceData.sort(function(a, b) {
        return a.order - b.order;
      });

      if (validChoiceData.length > 0) return validChoiceData;
    }

    // We have no options, see if we need to use the default option.
    var root = this.getRootSceneId();
    if (root !== this.state.sceneId) {
      return [{id:root, title:'Scene Complete'}];
    } else {
      // There are no possible options.
      return null;
    }
  };

  // ------------------------------------------------------------------------

  module.exports = {
    makeFunctionFromSource: makeFunctionFromSource,
    convertJSONToGame: convertJSONToGame,

    DendryEngine: DendryEngine,
    UserInterface: UserInterface,
    NullUserInterface: UserInterface
  };
}());
