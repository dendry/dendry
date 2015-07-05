/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  'use strict';

  var exec = require('child_process').exec;
  var prompt = require('prompt');
  var path = require('path');
  var fs = require('fs');
  var async = require('async');

  var utils = require('../utils');

  var getDefaultAuthor = function(data, callback) {
    if (data.author === null) {
      // Try to find the author name, and use it as a default.
      var child = exec('id -P | cut -f8 -d:', function(err, stdout, stderr) {
        var defaultAuthor;
        // Silently consume the error, if we have one, it just means
        // we won't have a default.
        if (err === null) {
          // Trim the training newline.
          defaultAuthor = stdout.substr(0, stdout.length - 1);
        }
        callback(null, data, defaultAuthor);
      });
    } else {
      // We have an explicit author, so don't try to find one from the system.
      callback(null, data, undefined);
    }
  };

  var getTitleAndAuthor = function(data, defaultAuthor, callback) {
    var id = data.project;

    prompt.override = data;
    prompt.message = 'Dendry'.grey;
    prompt.start();
    prompt.get([{
      name: 'title',
      description: 'Title'.red,
      // Capitalise the directory name as a default
      'default': (id.substr(0, 1).toUpperCase() + id.substr(1)),
      required: true
    }, {
      name: 'author',
      description: 'Author'.red,
      'default': defaultAuthor,
      required: true
    }], function(err, result) {
      if (err) {
        return callback(err);
      }
      data.title = result.title;
      data.author = result.author;
      callback(null, data);
    });
  };

  var getTemplateDir = function(data, callback) {
    utils.getTemplatePath(
      data.template, 'new',
      function(err, templateDir, name) {
        if (err) {
          return callback(err);
        }
        // Make sure it is a project.
        utils.getProjectPath(templateDir, function(err, templateDir) {
          if (err) {
            return callback(err);
          }
          data.templateDir = templateDir;
          data.template = name;
          return callback(null, data);
        });
      });
  };

  var getDestDir = function(data, callback) {
    // Make sure we *can't* find the destination directory.
    var destDir = path.resolve(process.cwd(), data.project);
    if (fs.existsSync(destDir)) {
      var err = new Error('Destination directory already exists: ' + destDir);
      return callback(err);
    }

    data.projectDir = destDir;
    callback(null, data);
  };

  var notifyUser = function(data, callback) {
    console.log(('Creating new project in: ' + data.projectDir).grey);
    console.log(('Using template: ' + data.template).grey);
    callback(null, data);
  };

  var transformAndCopy = function(data, callback) {
    utils.copyTemplate(
      data.templateDir, data.projectDir, data,
      function(err) {
        if (err) {
          return callback(err);
        } else {
          return callback(null, data);
        }
      });
  };

  // ----------------------------------------------------------------------
  // New: Creates a new project directory structure from a template.
  // ----------------------------------------------------------------------

  var cmdNew = new utils.Command('new');
  cmdNew.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: 'Create a new project.',
      description: 'Creates a new project directory with sample files that ' +
        'bootstrap your game. To create a new project, you don\'t need to ' +
        'use this command, you can create the "info.dry" file and any ' +
        'other source files yourself. This command just makes it easier ' +
        'to get started. Your project is created using a set of handlebars ' +
        'templates, additional template projects allow you to start a ' +
        'project more tailored to your needs.'
    });
    parser.addArgument(['project'], {
      help: 'The project directory to create (must not exist).'
    });
    parser.addArgument(['--title'], {
      help: 'The project title (default: will prompt you).'
    });
    parser.addArgument(['--author'], {
      help: 'The project\'s author (default: will prompt you).'
    });
    parser.addArgument(['-t', '--template'], {
      help: 'A project template to clone (default: the "default" project). ' +
        'Can be the name of a built-in template, or the path to a template ' +
        'or existing project.'
    });
  };
  cmdNew.run = function(args, callback) {
    // Define steps in performing the command, then run them
    // asynchronously in series with async.waterfall.
    var getData = function(callback) {
      callback(null, args);
    };
    async.waterfall(
      [getData,
       getTemplateDir, getDestDir,
       getDefaultAuthor, getTitleAndAuthor,
       notifyUser, transformAndCopy],
      function(err, result) {
        callback(err);
      });
  };

  module.exports = {
    cmd: cmdNew
  };
}());
