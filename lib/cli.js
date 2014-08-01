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
  var path = require('path');
  var ncp = require('ncp').ncp;
  var fs = require('fs');
  var handlebars = require('handlebars');
  var dive = require('dive');

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

  /* New: Creates a new project directory structure from a template. */
  var cmdNew = new Command("new");
  cmdNew.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: "Create a new project."
    });
    parser.addArgument(['project'], {
      help: "The project name (also the directory name) to create."
    });
    parser.addArgument(['--title'], {
      help: "The project title (default: will prompt you)."
    });
    parser.addArgument(['--author'], {
      help: "The project's author (default: will prompt you)."
    });
    parser.addArgument(['-t', '--template'], {
      help: "A project template to clone (default: the standard project)."
    });
  };
  cmdNew.run = function(args, callback) {
    var id = args.project;

    // Perform the copy.
    var doCmd = function(params) {
      var err;

      // Try to find the source directory.
      var template =  args.template || "standard";
      var source_diry = template;
      if (!fs.existsSync(source_diry)) {
        source_diry = path.resolve(__dirname, "templates", source_diry);
        if (!fs.existsSync(source_diry)) {
          err = new Error("Cannot find template: "+template);
          return callback(err);
        } else {
          var info_path = path.join(source_diry, "_info.dry");
          if (!fs.existsSync(info_path)) {
            err = new Error("Can't find info file in template: "+info_path);
            return callback(err);
          }
        }
      }

      // Make sure we can't find the destination directory.
      var dest_diry = path.resolve(process.cwd(), id);
      if (fs.existsSync(dest_diry)) {
        err = new Error("Destination directory already exists: "+dest_diry);
        return callback(err);
      }

      // Setup the handlebars context.
      params.id = id;

      // Do the streaming copy.
      var make_diry = function(err, source_path) {
        if (err) throw err;
        var path_frag = path.relative(source_diry, source_path);
        var dest_path = path.join(dest_diry, path_frag);
        fs.mkdirSync(dest_path); // Sync because further paths may depend on it.
        if (path_frag) {
          console.log(("    Directory: "+path_frag).grey);
        }
      };
      var copy_file = function(err, source_path) {
        if (err) throw err;
        var path_frag = path.relative(source_diry, source_path);
        var dest_path = path.join(dest_diry, path_frag);
        fs.readFile(source_path, function(err, input) {
          if (err) throw err;
          var template = handlebars.compile(input.toString());
          var output = template(params);
          fs.writeFile(dest_path, output, function(err) {
            if (err) throw err;
            console.log(("    File: "+path_frag).grey);
          });
        });
      };
      console.log(("Creating new project in: "+dest_diry).grey);
      console.log(("Using template: "+template).grey);
      make_diry(null, source_diry); // Visit the top level diry (dive doesn't).
      dive(source_diry, {directories:true, files:false}, make_diry, function() {
        dive(source_diry, copy_file, function() {
          callback();
        });
      });
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

  /* Validate: Checks a project is correct and compiles. */
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
  cmdValidate.run = function(args, callback) {
    // Check the top level directory is there at all.
    var source_diry = path.resolve(process.cwd(), args.project || '.');
    if (!fs.existsSync(source_diry)) {
      return callback(new Error("No such project: "+source_diry));
    }

    // Make sure it has an info file.
    var info_path = path.join(source_diry, "_info.dry");
    if (!fs.existsSync(info_path)) {
      return callback(new Error("No info file found at "+info_path+
                                ", directory may not be a dendry project."));
    }

    console.log(source_diry);
    console.dir(args);
    callback();
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
    cmd.run(args, function(err) {
      if (err) {
        console.error(err.toString().red);
      }
    });
  };

  if (require.main === module) {
    main();
  }

}());
