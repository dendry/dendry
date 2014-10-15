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
    source = source.trim();
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

  var runExpression = function(expression, default_, context, state) {
    var result = default_;
    if (expression === undefined) return result;
    try {
      result = expression.call(context, state, state.qualities);
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

  var simpleContent = function(text) {
    return [{type:'paragraph', content:[text]}];
  };

  // ------------------------------------------------------------------------

  // Objects with this interface are passed to a game state to have it
  // display content.
  var UserInterface = function() {};
  UserInterface.prototype.beginGame = function() {};
  UserInterface.prototype.displayContent = function(paragraphs) {
    assert(arguments.length === 1);
  };
  UserInterface.prototype.displayChoices = function(choices) {};
  UserInterface.prototype.displayGameOver = function() {
    this.displayContent(simpleContent("Game Over"));
  };
  UserInterface.prototype.removeChoices = function() {};
  UserInterface.prototype.newPage = function() {};
  UserInterface.prototype.signal = function(data) {};
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

    var sceneSignal = scene.signal || this.game.sceneSignal;
    if (sceneSignal !== undefined) {
      this.ui.signal({signal:sceneSignal,
                      event:"scene-display",
                      id:this.state.sceneId});
    }
    if (scene.newPage) this.ui.newPage();
    this.ui.removeChoices();

    this._runActions(scene.onDisplay);
    if (scene.content !== undefined) {
      var displayContent = this._makeDisplayContent(scene.content, true);
      this.ui.displayContent(displayContent);
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
    if (!choice.canChoose) {
      throw new Error("Attempted to choose index "+choiceIndex+", but "+
                      "that choice is unavailable.");
    }

    var id = choice.id;

    delete this.choiceCache;
    this.goToScene(id);

    return this;
  };

  DendryEngine.prototype.goToScene = function(id) {
    var scene = this.game.scenes[id];
    assert(scene);
    var that = this;

    // Leave previous scene.
    var fromId = this.state.sceneId;
    if (!!fromId) {
      var from = this.getCurrentScene();
      this._runActions(from.onDeparture);
      var fromSignal = from.signal || this.game.sceneSignal;
      if (fromSignal !== undefined) {
        this.ui.signal({signal:fromSignal,
                        event:"scene-departure",
                        id:this.state.sceneId,
                        "to":id});
      }
    }


    // Arrive at current scene.
    this.state.sceneId = id;
    if (scene.setRoot) this.state.rootSceneId = id;
    if (scene.countVisitsMax !== undefined) {
      if (this.state.visits[id] === undefined) {
        this.state.visits[id] = 1;
      } else if (this.state.visits[id] < scene.countVisitsMax) {
        this.state.visits[id]++;
      }
    }
    this._runActions(scene.onArrival);
    var sceneSignal = scene.signal || this.game.sceneSignal;
    if (sceneSignal !== undefined) {
      var signal = {signal:sceneSignal,
                    event:"scene-arrival",
                    id:id};
      if (!!fromId) signal.from = fromId;
      this.ui.signal(signal);
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
    // Set the state.
    this.state = state;
    this._setUpQualities();
    this.random = Random.fromSeed(this.state.currentSceneSeed);

    // Display the current state.
    if (this.isGameOver()) {
      this.displayGameOver();
    } else {
      var scene = this.getCurrentScene();
      this.choiceCache = this._compileChoices(scene);
      this.displaySceneContent();
      this.displayChoices();
    }
    return this;
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

  DendryEngine.prototype._evaluateStateDependencies = function(defs) {
    var result = [];

    for (var i = 0; i < defs.length; ++i) {
      var def = defs[i];
      var fn = def.fn;
      switch(def.type) {
      case 'insert':
        result.push(this._runExpression(fn));
        break;

      default:
        assert(def.type === 'predicate');
        result.push(this._runPredicate(fn));
        break;
      }
    }
    return result;
  };

  DendryEngine.prototype._mergeStateEvaluationsInArray = function(array, evals){
    var result = [];
    for (var i = 0; i < array.length; ++i) {
      result = result.concat(this._mergeStateEvaluations(array[i], evals));
    }
    return result;
  };

  DendryEngine.prototype._mergeStateEvaluations = function(content, evals) {
    if (content.type === undefined) return [content];

    var result;
    switch(content.type) {
    case 'conditional':
      if (evals[content.predicate]) {
        result = this._mergeStateEvaluationsInArray(content.content, evals);
      } else {
        result = [];
      }
      break;
    case 'insert':
      result = [ evals[content.insert].toString() ];
      break;
    default:
      var newE = {type:content.type};
      newE.content = this._mergeStateEvaluationsInArray(content.content, evals);
      result = [newE];
      break;
    }
    return result;
  };

  DendryEngine.prototype._makeDisplayContent = function(content, useParas) {
    // Raw content can just be returned.
    if (content.content === undefined) {
      if (useParas) {
        return [{type:'paragraph', content:[content]}];
      } else {
        return [content];
      }
    }

    // Merge in dependencies if we have them
    var stateDepDefs = content.stateDependencies;
    var displayContent = content.content;
    if (stateDepDefs && stateDepDefs.length > 0) {
      var evals = this._evaluateStateDependencies(stateDepDefs);
      displayContent = this._mergeStateEvaluationsInArray(
        displayContent, evals
      );
    }
    return displayContent;
  };

  DendryEngine.prototype._setUpQualities = function() {
    var _Q = this._qualitiesAccessorsPrivate = {};
    var Q = this.state.qualities;
    var that = this;
    objEach(this.game.qualities, function(id, quality) {
      var min = quality.min;
      var max = quality.max;
      var signal = quality.signal || that.game.qualitySignal;
      var predicate = quality.isValid;
      var needsAccessors = (
        min !== undefined ||
        max !== undefined ||
        signal !== undefined ||
        predicate !== undefined
      );
      if (needsAccessors) {
        if (Q[id] !== undefined) _Q[id] = Q[id];
        Q.__defineGetter__(id, function() {
          return _Q[id];
        });
        Q.__defineSetter__(id, function(value) {
          if (min !== undefined && value < min) value = min;
          if (max !== undefined && value > max) value = max;
          var was = _Q[id];
          _Q[id] = value;

          // Check if the new value is not allowed.
          if (!that._runPredicate(predicate, true)) {
            // Reverse the change.
            _Q[id] = value = was;
          }

          // Signal after the change is made.
          if (signal !== undefined && value !== was) {
            var signalObj = {signal:signal,
                             event:"quality-change",
                             id:id, now:value};
            if (was !== undefined) signalObj.was = was;
            that.ui.signal(signalObj);
          }
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

  DendryEngine.prototype._runExpression = function(expression, default_) {
    return runExpression(expression, default_, this, this.state);
  };

  DendryEngine.prototype.__getChoiceSelectionData = function(idToInfoMap) {
    var result = [];
    for (var id in idToInfoMap) {
      var optionScene = this.game.scenes[id];
      var optionInfo = idToInfoMap[id];

      optionInfo.order = optionInfo.order || optionScene.order || 0;
      optionInfo.priority = optionInfo.priority || optionScene.priority || 1;
      // Because 'null' is a valid frequency, we can't use || to do this.
      if (optionInfo.frequency === undefined) {
        optionInfo.frequency = optionScene.frequency;
        if (optionInfo.frequency === undefined) {
          optionInfo.frequency = 100;
        }
      }
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

      // Fiter out scenes that can't be viewed.
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
      // Filter out options that can't be viewed.
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
        if (choice.frequency === null) {
          choice.selectionPriority = 0; // Always choose.
        } else {
          choice.selectionPriority = that.random.random()/choice.frequency;
        }
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

  DendryEngine.prototype.__getChoiceDisplayData = function(choicesSelected) {
    var choiceOutput = [];
    var numChoosable = 0;

    for (var i = 0; i < choicesSelected.length; ++i) {
      var choice = choicesSelected[i];
      var choiceScene = this.game.scenes[choice.id];

      // Figure out if this choice can be chosen.
      var canChoose = true;
      if (choice.chooseIf) {
        canChoose = this._runPredicate(choice.chooseIf, true);
      }
      if (canChoose && choiceScene.chooseIf) {
        canChoose = this._runPredicate(choiceScene.chooseIf, true);
      }

      var title = choice.title || choiceScene.title;
      assert(title);

      var subtitle = null;
      if (!canChoose) {
        subtitle = choice.unavailableSubtitle||choiceScene.unavailableSubtitle;
      }
      if (!subtitle) {
        subtitle = choice.subtitle || choiceScene.subtitle;
      }

      var finalChoice = {
        id:choice.id,
        canChoose:canChoose,
        title:this._makeDisplayContent(title, false)
      };
      if (subtitle) {
        finalChoice.subtitle = this._makeDisplayContent(subtitle, false);
      }

      choiceOutput.push(finalChoice);
      if (canChoose) ++numChoosable;
    }

    return {choices:choiceOutput, numChoosable:numChoosable};
  };

  DendryEngine.prototype._compileChoices = function(scene) {
    var id;

    assert(scene);

    var options = scene.options;
    var choiceOutput = [];
    var numChoosable = 0;
    if (options !== undefined) {

      var choiceIds = this.__getChoiceIdsFromOptions(options);
      choiceIds = this.__filterViewable(choiceIds);

      var validChoiceData = this.__getChoiceSelectionData(choiceIds);
      var minChoices = scene.minChoices || null;
      var maxChoices = scene.maxChoices || null;
      validChoiceData = this.__filterByPriority(validChoiceData,
                                                minChoices, maxChoices);

      // Sort the result into display order.
      validChoiceData.sort(function(a, b) {
        return a.order - b.order;
      });

      // Now we've chosen our selection, get the final displayable data.
      var data = this.__getChoiceDisplayData(validChoiceData);
      choiceOutput = data.choices;
      numChoosable = data.numChoosable;
    }

    if (numChoosable === 0) {
      // We have no choosable options, so add the default option (NB:
      // this may take us over the max-choices limit).
      var root = this.state.rootSceneId;
      if (root !== this.state.sceneId) {
        var rootSceneChoose = this.game.scenes[root].chooseIf;
        if (!rootSceneChoose || this._runPredicate(rootSceneChoose, true)) {
          choiceOutput.push({id:root, title:'Continue...', canChoose:true});
          ++numChoosable;
        }
      }
    }
    if (numChoosable > 0) {
      return choiceOutput;
    } else {
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
    runExpression: runExpression,
    convertJSONToGame: convertJSONToGame,
    simpleContent: simpleContent,

    DendryEngine: DendryEngine,
    UserInterface: UserInterface,
    NullUserInterface: UserInterface,

    Random: Random
  };
}());
