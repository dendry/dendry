#!/usr/bin/env node
/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var argparse = require('argparse');

  var cliUtils = require('./cli_utils');

  // User Commands.
  require('./cli_cmd_new');
  require('./cli_cmd_compile');
  require('./cli_cmd_run');
  require('./cli_cmd_make-html');

  // Infrastructure Commands.
  require('./cli_cmd_id-resolution');

  // Process the command line and run the appropriate command.
  var main = function() {
    // Create the top level parser.
    var ArgumentParser = argparse.ArgumentParser;
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
    cliUtils.Command.commandList.forEach(function(command) {
      command.createArgumentParser(subparsers);
    });

    // Parse the arguments and run.
    var args = parser.parseArgs();
    var cmd = cliUtils.Command.commandMap[args.command];
    cmd.run(args, function(err) {
      if (err) {
        console.error(err.toString().red);
        console.trace(err);
      }
    });
  };

  if (require.main === module) {
    main();
  }

}());
