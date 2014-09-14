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

  var cliUtils = require('./cli_utils');
  var cmdCompile = require('./cli_cmd_compile').cmd;

  var loadGameFile = function(data, callback) {
    fs.readFile(data.compiledPath, function(err, result) {
      if (err) return callback(err);
      data.gameFile = result;
      if (data.game === undefined) data.game = JSON.parse(result);
      callback(null, data);
    });
  };

  var browserifyRuntime = function(data, callback) {
    var b = browserify();
    b.add(path.resolve(__dirname, "browser_runtime.js"));
    b.bundle(function(err, buffer) {
      if (err) return callback(err);
      var str = buffer.toString();
      data.browserify = str;
      return callback(null, data);
    });
  };

  var uglifyBundle = function(data, callback) {
    var content = ["window.game="+data.gameFile+";", data.browserify];
    var result = uglify.minify(content, {fromString: true, compress:{}});
    data.code = result.code;
    return callback(null, data);
  };

  var getTemplateDir = function(data, callback) {
    cliUtils.getTemplatePath(
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
    cliUtils.copyTemplate(
      data.templateDir, data.destDir, data, false,
      function(err) {
        if (err) return callback(err);
        else return(null, data);
      });
  };

  // ----------------------------------------------------------------------
  // Make-HTML: Creates a playable HTML version of the game.
  // ----------------------------------------------------------------------

  var cmdMakeHTML = new cliUtils.Command("make-html");
  cmdMakeHTML.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: "Make a project into a playable HTML page.",
      description: "Builds a HTML version of a game, compiling it first "+
        "if it is out of date. The compilation uses a template which "+
        "can be a predefined template, or the path to a directory. "+
        "Templates use the handlebars templating system. The default "+
        "HTML template (called 'default') compresses the runtime and your "+
        "game content and embeds it in a single HTML file, for the most "+
        "portable game possible."
    });
    parser.addArgument(['project'], {
      nargs: "?",
      help: "The project to compile (default: the current directory)."
    });
    parser.addArgument(['-t', '--template'], {
      help: "A theme template to use (default: the 'default' theme). "+
        "Can be the name of a built-in theme, or the path to a theme."
    });
    parser.addArgument(['-f', '--force'], {
      action: "storeTrue",
      default: false,
      help: "Always recompiles, even if the compiled game is up to date."
    });
  };
  cmdMakeHTML.run = function(args, callback) {
    var getData = function(callback) {
      cmdCompile.run(args, callback);
    };

    async.waterfall([getData, loadGameFile,
                     browserifyRuntime, uglifyBundle,
                     getTemplateDir, getDestDir,
                     notifyUser, createHTML], callback);
  };

  module.exports = {
    cmd: cmdMakeHTML
  };
}());
