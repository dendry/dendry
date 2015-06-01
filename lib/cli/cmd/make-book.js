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
  var _ = require('lodash');

  var utils = require('../utils');
  var compiler = require('../../parsers/compiler');
  var cmdCompile = require('./compile').cmd;
  var gamebook = require('../../search/gamebook');
  var html = require('../../ui/content/html');
  var latex = require('../../ui/content/latex');

  var loadGameAndSource = function(data, callback) {
    compiler.loadCompiledGame(data.compiledPath, function(err, game, json) {
      if (err) return callback(err);
      data.gameFile = json;
      data.game = game;
      callback(null, data);
    });
  };

  var getTemplateDir = function(data, callback) {
    utils.getTemplatePath(
      data.template, "book",
      function(err, templateDir, name) {
        if (err) return callback(err);
        data.templateDir = templateDir;
        data.template = name;
        return callback(null, data);
      });
  };

  var getDestDir = function(data, callback) {
    data.destDir = path.join(data.projectDir, "out", "book");
    callback(null, data);
  };

  var buildGamebook = function(data, callback) {
    var result;
    try {
      result = gamebook.build(data.game, data.limit);
    } catch (err) {
      return callback(err);
    }
    data.gamebook = result;
    callback(null, data);
  };

  var notifyUser = function(data, callback) {
    console.log(("Creating Gamebook in: "+data.destDir).grey);
    console.log(("Using template: "+data.template).grey);
    callback(null, data);
  };

  var _addHandlebarsBlocks = function() {
    handlebars.registerHelper('html', function(context) {
      return new handlebars.SafeString(html.convert(context));
    });
    handlebars.registerHelper('htmlLine', function(context) {
      return new handlebars.SafeString(html.convertLine(context));
    });
    handlebars.registerHelper('latex', function(context) {
      return new handlebars.SafeString(latex.convert(context));
    });
    handlebars.registerHelper('latexLine', function(context) {
      return new handlebars.SafeString(latex.convertLine(context));
    });
    handlebars.registerHelper('list', function(context, options) {
      var out = "";
      var data;

      for (var i=0; i<context.length; i++) {
        if (options.data) {
          data = handlebars.createFrame(options.data || {});
          data.number = i + 1;
        }

        out += options.fn(context[i], { data: data });
      }

     return out;
    });
    handlebars.registerHelper('turn_to', function() {
      return (this.turnTo + 1).toString();
    });
  };

  var createOutput = function(data, callback) {
    _addHandlebarsBlocks();
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
  // make-ebook: Creates a playable HTML version of the game.
  // ----------------------------------------------------------------------

  var cmdMakeBook = new utils.Command("make-book");
  cmdMakeBook.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: "Make a project into a playable ebook.",
      description: "Builds an book version of a game, compiling it first "+
        "if it is out of date. The book generation uses a template which "+
        "can be a predefined template, or the path to a directory. The "+
        "template generates an ebook in the HTML-based format used by "+
        "Amazon's kindlegen."
    });
    parser.addArgument(['project'], {
      nargs: "?",
      help: "The project to compile (default: the current directory)."
    });
    parser.addArgument(['-t', '--template'], {
      help: "A theme template to use (default: the 'default' theme). "+
        "Can be the name of a built-in theme, or the path to a theme."
    });
    parser.addArgument(['-l', '--limit'], {
      action: "store", type:parseInt,
      defaultValue: "5000",
      help: "The maximum number of paragraphs in the resulting book."
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
  cmdMakeBook.run = function(args, callback) {
    var getData = function(callback) {
      cmdCompile.run(args, callback);
    };

    async.waterfall([getData, loadGameAndSource, buildGamebook,
                     getTemplateDir, getDestDir,
                     notifyUser, createOutput], callback);
  };

  module.exports = {
    cmd: cmdMakeBook
  };
}());
