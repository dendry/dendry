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

  var createHTML = function(data, callback) {
    var templatePath = path.resolve(__dirname, "templates", "html",
                                    "index.html");
    fs.readFile(templatePath, function(err, input) {
      if (err) return callback(err);
      var template = handlebars.compile(input.toString());
      var output = template(data);
      data.html = output;
      callback(null, data);
    });
  };

  var writeHTML = function(data, callback) {
    var outPath = path.join(data.sourceDir, "out", "html", "index.html");
    fs.writeFile(outPath, data.html, function(err) {
      return callback(err);
    });
  };

  // ----------------------------------------------------------------------
  // Make-HTML: Creates a playable HTML version of the game.
  // ----------------------------------------------------------------------

  var cmdMakeHTML = new cliUtils.Command("make-html");
  cmdMakeHTML.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: "Make a project into a playable HTML page."
    });
    parser.addArgument(['project'], {
      nargs: "?",
      help: "The project to compile (default: the current directory)."
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
                     createHTML, writeHTML], callback);
  };

  module.exports = {
    cmd: cmdMakeHTML
  };
}());
