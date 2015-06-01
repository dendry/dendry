/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var path = require('path');
  var fs = require('fs');
  var handlebars = require('handlebars');
  var async = require('async');
  var browserify = require('browserify');
  var uglify = require('uglify-js');

  var utils = require('../utils');
  var compiler = require('../../parsers/compiler');
  var cmdCompile = require('./compile').cmd;

  var loadGameAndSource = function(data, callback) {
    compiler.loadCompiledGame(data.compiledPath, function(err, game, json) {
      if (err) return callback(err);
      data.gameFile = json;
      data.game = game;
      callback(null, data);
    });
  };

  var browserifyUI = function(data, callback) {
    var b = browserify();
    b.add(path.resolve(__dirname, "../../ui/browser.js"));
    b.bundle(function(err, buffer) {
      if (err) return callback(err);
      var str = buffer.toString();
      data.browserify = str;
      return callback(null, data);
    });
  };

  var uglifyBundle = function(data, callback) {
    var gameFile = data.gameFile.toString();
    var wrappedGameFile = JSON.stringify({compiled:gameFile});
    var content = ["window.game="+wrappedGameFile+";", data.browserify];
    if (data.no_uglify) {
      data.code = content.join('');
    } else {
      data.code = uglify.minify(content, {fromString: true, compress:{}}).code;
    }
    return callback(null, data);
  };

  var getTemplateDir = function(data, callback) {
    utils.getTemplatePath(
      data.template, "html",
      function(err, templateDir, name) {
        if (err) return callback(err);
        data.templateDir = templateDir;
        data.template = name;
        return callback(null, data);
      });
  };

  var getDestDir = function(data, callback) {
    data.destDir = path.join(data.projectDir, "out", "html");
    callback(null, data);
  };

  var notifyUser = function(data, callback) {
    console.log(("Creating HTML build in: "+data.destDir).grey);
    console.log(("Using template: "+data.template).grey);
    callback(null, data);
  };

  var createHTML = function(data, callback) {
    fs.exists(data.destDir, function(exists) {
      if (exists) {
        if (data.overwrite) {
          console.log(
            "Warning: Overwriting existing HTML and custom content.".red
          );
        } else {
          console.log(
            "Warning: Overwriting existing HTML content.".red
          );
        }
      }
      utils.copyTemplate(
        data.templateDir, data.destDir, data,
        function(err) {
          if (err) return callback(err);
          else return(null, data);
        });
    });
  };

  // ----------------------------------------------------------------------
  // Make-HTML: Creates a playable HTML version of the game.
  // ----------------------------------------------------------------------

  var cmdMakeHTML = new utils.Command("make-html");
  cmdMakeHTML.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: "Make a project into a playable HTML page.",
      description: "Builds a HTML version of a game, compiling it first "+
        "if it is out of date. The compilation uses a template which "+
        "can be a predefined template, or the path to a directory. "+
        "Templates use the handlebars templating system. The default "+
        "HTML template (called 'default') compresses the browser interface "+
        "and your game content and embeds it in a single HTML file, for the "+
        "most portable game possible."
    });
    parser.addArgument(['project'], {
      nargs: "?",
      help: "The project to compile (default: the current directory)."
    });
    parser.addArgument(['-t', '--template'], {
      help: "A theme template to use (default: the 'default' theme). "+
        "Can be the name of a built-in theme, or the path to a theme."
    });
    parser.addArgument(['--no-uglify'], {
      action: "storeTrue",
      defaultValue: false,
      help: "Doesn't run the output through uglify for compression."
    });
    parser.addArgument(['--overwrite'], {
      action: "storeTrue",
      defaultValue: false,
      help: "Overwrites all files, including those designed for customization."
    });
    parser.addArgument(['-f', '--force'], {
      action: "storeTrue",
      defaultValue: false,
      help: "Always recompiles, even if the compiled game is up to date."
    });
  };
  cmdMakeHTML.run = function(args, callback) {
    var getData = function(callback) {
      cmdCompile.run(args, callback);
    };

    async.waterfall([getData, loadGameAndSource,
                     browserifyUI, uglifyBundle,
                     getTemplateDir, getDestDir,
                     notifyUser, createHTML], callback);
  };

  module.exports = {
    cmd: cmdMakeHTML
  };
}());
