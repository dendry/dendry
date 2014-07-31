#!/usr/bin/env node
/*!
 * dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:4 */
(function() {
  var exec = require('child_process').exec;
  var prompt = require('prompt');

  /* Instantiate this prototype to create a new top level management
   * command. Instantiation automatically registers the command. */
  var Command = function(name) {
    this.name = name;
    Command.commandList.push(this);
    Command.commandMap[name] = this;
  };
  Command.prototype.createArgumentParser = function(subparsers) {
    throw new Error("Command '"+this.name+"' must define a subparser.");
  };
  Command.prototype.run = function(args) {
    throw new Error("Command '"+this.name+"' has no implementation.");
  };
  Command.commandList = [];
  Command.commandMap = {};

  // ----------------------------------------------------------------------

  /* Creates a new project directory structure. */
  var cmdNew = new Command("new");
  cmdNew.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: "Create a new project."
    });
    parser.addArgument(['project'], {
      help: "The project name (used as a directory) to create."
    });
    parser.addArgument(['-t', '--template'], {
      help: "A project template to clone (default: the standard project)."
    });
    parser.addArgument(['--title'], {
      help: "The project title (default: will prompt you)."
    });
    parser.addArgument(['--author'], {
      help: "The project's author (default: will prompt you)."
    });
  };
  cmdNew.run = function(args) {
    var id = args.project;

    var doCmd = function(params) {
      console.dir(params);
    };

    // Prompt for any additional data not given in arguments.
    var doPrompt = function() {
      prompt.override = args;
      prompt.message = "Dendry".grey;
      prompt.start();
      prompt.get([{
        name: 'title',
        description: "Title".red,
        // Capitalise the directory name as a default
        'default': (id.substr(0, 1).toUpperCase() + id.substr(1)),
        required: true
      }, {
        name: 'author',
        description: "Author".red,
        'default': defaultAuthor,
        required: true
      }], function(err, result) {
        if (err) throw err; // Prompt.get shouldn't error on user input.
        doCmd(result);
      });
    };

    var defaultAuthor;
    if (args.author === null) {
      // Try to find the author name, and use it as a default.
      var child = exec('id -P | cut -f8 -d:', function(err, stdout, stderr) {
        // Silently consume the error, if we have one, it just means
        // we won't have a default.
        if (err === null) {
          // Trim the training newline.
          defaultAuthor = stdout.substr(0, stdout.length-1);
        }
        doPrompt();
      });
    } else {
      // We have an explicit author, so don't try to find one from the system.
      doPrompt();
    }
  };

  // ----------------------------------------------------------------------

  /* Validates a project. */
  var cmdValidate = new Command("validate");
  cmdValidate.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: "Validate a project.",
      aliases: ['valid']
    });
    parser.addArgument(['project'], {
      nargs: "?",
      help: "The project to validate (default: the current directory)."
    });
  };
  cmdValidate.run = function(args) {
    console.dir(args);
  };

  // ----------------------------------------------------------------------

  // Export the commands in case we need to run them from code.
  module.exports = {
    commands: Command.commandMap,
    allCommands: Command.commandList
  };

  // Process the command line and run the appropriate command.
  var main = function() {
    // Create the top level parser.
    var ArgumentParser = require('argparse').ArgumentParser;
    var parser = new ArgumentParser({
      prog: "dendry",
      description: "Create and manage dendry projects."
    });
    var subparsers = parser.addSubparsers({
      title: 'Commands',
      description:
        "For more information on a command, run: dendry <COMMAND> --help",
      dest: 'command',
      metavar: '<COMMAND>'
    });

    // Register each command's subparser in turn.
    Command.commandList.forEach(function(command) {
      command.createArgumentParser(subparsers);
    });

    // Parse the arguments and run.
    var args = parser.parseArgs();
    var cmd = Command.commandMap[args.command];
    cmd.run(args);
  };

  if (require.main === module) {
    main();
  }

}());
