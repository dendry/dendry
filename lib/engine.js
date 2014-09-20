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
      fn(key, obj[key]);
    }
  };

  var merge = function() {
    var result = {};
    for (var i = 0; i < arguments.length; ++i) {
      var obj = arguments[i];
      for (var key in obj) result[key] = obj[key];
    }
    return result;
  };

  // Credit: Taken from Lodash (MIT License). See CREDITS.
  var isObject = function(value) {
    var type = typeof value;
    return type == 'function' || (value && type == 'object') || false;
  };

  var makeFunctionFromSource = function(source) {
    /*jshint -W054 */
    var fn = new Function('state', 'Q', source);
    /*jshint +W054 */
    fn.source = source;
    return fn;
  };

  var runActions = function(actions, context, state) {
    if (actions === undefined) return;
    each(actions, function(fn) {
      try {
        fn.call(context, state, state.qualities);
      } catch(err) {
        // Ignore errors. TODO: Log them somehow?
      }
    });
  };

  var runPredicate = function(predicate, default_, context, state) {
    var result = default_;
    if (predicate === undefined) return result;
    try {
      result = !!predicate.call(context, state, state.qualities);
    } catch(err) {
      // Ignore errors. TODO: Log them somehow?
    }
    return result;
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
  UserInterface.prototype.signal = function(signal, type) {};
  // Not part of the UI, but allows us to simply subclass.
  UserInterface.makeParentOf = function(OtherConstructor) {
    OtherConstructor.prototype = new UserInterface();
    OtherConstructor.constructor = OtherConstructor;
  };

  // ------------------------------------------------------------------------

  // An engine is given a user interface, the game and the current
  // game state (can be omitted). It is responsible for the logic of
  // the game.
  var DendryEngine = function(ui, game) {
    this.ui = ui;
    this.game = game;
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

    if (scene.signal !== undefined) {
      this.ui.signal(scene.signal, "scene-display");
    }
    if (scene.newPage) this.ui.newPage();
    this.ui.removeChoices();

    this._runActions(scene.onDisplay);
    if (scene.content) {
      this.ui.displayContent(scene.content);
    }

    return this;
  };

  DendryEngine.prototype.choose = function(choiceIndex) {
    var choices = this.choiceCache;

    // Check for valid choice.
    assert(choices);
    if (choices.length <= choiceIndex) {
      throw new Error("No choice at index "+choiceIndex+", only "+
                      choices.length+" choices are available.");
    }

    // Commit the choice.
    var choice = choices[choiceIndex];
    var id = choice.id;

    delete this.choiceCache;
    this.state.turn++;
    this.goToScene(id);

    return this;
  };

  DendryEngine.prototype.goToScene = function(id) {
    var scene;
    var that = this;

    // Leave previous scene.
    if (!!this.state.sceneId) {
      scene = this.getCurrentScene();
      this._runActions(scene.onDeparture);
      if (scene.signal !== undefined) {
        this.ui.signal(scene.signal, "scene-departure");
      }
    }

    scene = this.game.scenes[id];
    assert(scene);

    // Arrive at current scene.
    this.state.sceneId = id;
    if (scene.setRoot) this.state.rootSceneId = id;
    if (this.state.visits[id] === undefined) this.state.visits[id] = 1;
    else this.state.visits[id]++;
    this._runActions(scene.onArrival);
    if (scene.signal !== undefined) {
      this.ui.signal(scene.signal, "scene-arrival");
    }

    // We're done with any code that might generate random numbers, we
    // can store the seed which can be used to replay the behavior
    // from here.
    this.state.currentSceneSeed = this.random.getSeed();
    this.displaySceneContent();

    // Check if we have any reason to leave the scene, or end the game.
    if (scene.gameOver) {
      this.gameOver();
    } else if (scene.goTo) {
      for (var i = 0; i < scene.goTo.length; ++i) {
        var goTo = scene.goTo[i];
        if (goTo.predicate === undefined || this._runPredicate(goTo.predicate)){
          this.goToScene(goTo.id);
          break;
        }
      }
    } else {
      // Check game over based on exhaustion (follows goto check)
      this.choiceCache = this._compileChoices(scene);
      if (this.choiceCache === null) {
        this.gameOver();
      } else {
        this.displayChoices();
      }
    }
  };

  DendryEngine.prototype.beginGame = function() {
    this.state = {
      sceneId: null,
      rootSceneId: this.game.rootScene || this.game.firstScene || 'root',
      gameOver: false,
      turn: 0,
      visits: {},
      qualities: {},
      currentSceneSeed: null
    };
    this._setUpQualities();
    this.random = Random.fromTime();

    this.ui.beginGame();

    var id = this.game.firstScene || this.state.rootSceneId;
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
    return this.choiceCache;
  };

  // Sets the current state of the engine from an exportable state.
  DendryEngine.prototype.setState = function(state) {
    this.state = state;
    this._setUpQualities();
    this.random = Random.fromSeed(this.state.currentSceneSeed);
    if (this.isGameOver()) {
      this.displayGameOver();
    } else {
      var scene = this.getCurrentScene();
      this.choiceCache = this._compileChoices(scene);
      this.displaySceneContent();
      this.displayChoices();
    }
  };

  // Returns a data structure for exporting without any accessors or
  // complex classes.
  DendryEngine.prototype.getExportableState = function() {
    // Because we only have complex state in the qualities (they have
    // accessors), and because we save with JSON (which calls
    // accessors correctly), we don't have to worry about giving the
    // actual state.
    return this.state;
  };

  // ------------------------------------------------------------------------

  DendryEngine.prototype._setUpQualities = function() {
    var _Q = this._qualitiesAccessorsPrivate = {};
    var Q = this.state.qualities;
    var that = this;
    objEach(this.game.qualities, function(id, quality) {
      var min = quality.min;
      var max = quality.max;
      var signal = quality.signal;
      var needsAccessors = (
        min !== undefined ||
        max !== undefined ||
        signal !== undefined
      );
      if (needsAccessors) {
        Q.__defineGetter__(id, function() {
          return _Q[id];
        });
        Q.__defineSetter__(id, function(value) {
          if (min !== undefined && value < min) value = min;
          if (max !== undefined && value > max) value = max;
          if (signal !== undefined && value !== _Q[id]) {
            that.ui.signal(signal, "quality-change");
          }
          _Q[id] = value;
        });
      }
      if (quality.initial !== undefined && Q[id] === undefined) {
        Q[id] = quality.initial;
      }
    });
  };

  DendryEngine.prototype._runActions = function(actions) {
    runActions(actions, this, this.state);
  };

  DendryEngine.prototype._runPredicate = function(predicate, default_) {
    return runPredicate(predicate, default_, this, this.state);
  };

  DendryEngine.prototype.__getChoiceData = function(idToInfoMap) {
    var result = [];
    for (var id in idToInfoMap) {
      var optionScene = this.game.scenes[id];
      var optionInfo = idToInfoMap[id];

      optionInfo.title = optionInfo.title || optionScene.title;
      assert(optionInfo.title);

      optionInfo.order = optionInfo.order || optionScene.order || 0;
      optionInfo.priority = optionInfo.priority || optionScene.priority || 1;
      optionInfo.frequency =
        optionInfo.frequency || optionScene.frequency || 100;
      optionInfo.selectionPriority = 0; // Used by __filterByPriority

      result.push(optionInfo);
    }
    return result;
  };

  DendryEngine.prototype.__filterViewable = function(idToInfoMap) {
    var result = {};
    for (var id in idToInfoMap) {
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
      result[id] = idToInfoMap[id];
    }
    return result;
  };

  DendryEngine.prototype.__getChoiceIdsFromOptions = function(options) {
    var that = this;

    var choices = {};
    each(options, function(option) {
      if (!that._runPredicate(option.viewIf, true)) return;

      if (option.id.substr(0, 1) === '@') {
        // This is an id, use it.
        var trimmedId = option.id.substring(1);
        var choice = merge(option, {id:trimmedId});
        choices[trimmedId] = choice;
      } else {
        assert(option.id.substr(0, 1) === '#');
        // This is a tag, add all matching ids.
        var ids = that.game.tagLookup[option.id.substring(1)];
        objEach(ids, function(id) {
          if (choices[id] === undefined) {
            choices[id] = merge(option, {id:id});
          }
        });
      }
    });
    return choices;
  };

  // Code based on Undum (MIT License). See CREDITS.
  DendryEngine.prototype.__filterByPriority = function(choices,
                                                       minChoices,
                                                       maxChoices) {
    assert(minChoices === null ||
           maxChoices === null ||
           maxChoices >= minChoices);
    var that = this;

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
        choice.selectionPriority = that.random.random()/choice.frequency;
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

    var options = scene.options;
    if (options !== undefined) {

      var choiceIds = this.__getChoiceIdsFromOptions(options);
      choiceIds = this.__filterViewable(choiceIds);

      var validChoiceData = this.__getChoiceData(choiceIds);
      var minChoices = scene.minChoices || null;
      var maxChoices = scene.maxChoices || null;
      validChoiceData = this.__filterByPriority(validChoiceData,
                                                minChoices, maxChoices);

      // Sort the result into display order.
      validChoiceData.sort(function(a, b) {
        return a.order - b.order;
      });

      if (validChoiceData.length > 0) return validChoiceData;
    }

    // We have no options, see if we need to use the default option.
    var root = this.state.rootSceneId;
    if (root !== this.state.sceneId) {
      return [{id:root, title:'Scene Complete'}];
    } else {
      // There are no possible options.
      return null;
    }
  };

  // ------------------------------------------------------------------------

  // Marsaglia, George (July 2003). "Xorshift RNGs".
  // Journal of Statistical Software 8 (14).
  var Random = function(v, w, x, y, z) {
    w = w || 88675123;
    x = x || 123456789;
    y = y || 362436069;
    z = z || 521288629;

    this.getSeed = function() {
      return [v, w, x, y, z];
    };
    this.uint32 = function() {
      var t = (x ^ (x >>> 7)) >>> 0;
      x = y;
      y = z;
      z = w;
      w = v;
      v = (v ^ (v << 6)) ^ (t ^ (t << 13)) >>> 0;
      return ((y + y + 1) * v) >>> 0;
    };
    this.random = function() {
      return this.uint32() * 2.3283064365386963e-10;
    };
  };
  Random.fromTime = function() {
    return new Random(new Date().getTime());
  };
  Random.fromSeed = function(seed) {
    return new Random(seed[0], seed[1], seed[2], seed[3], seed[4]);
  };

  // ------------------------------------------------------------------------

  module.exports = {
    makeFunctionFromSource: makeFunctionFromSource,
    runActions: runActions,
    runPredicate: runPredicate,
    convertJSONToGame: convertJSONToGame,

    DendryEngine: DendryEngine,
    UserInterface: UserInterface,
    NullUserInterface: UserInterface,

    Random: Random
  };
}());
