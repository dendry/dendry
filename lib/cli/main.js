#!/usr/bin/env node
/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  'use strict';

  var argparse = require('argparse');

  var utils = require('./utils');

  // User Commands.
  require('./cmd/new');
  require('./cmd/compile');
  require('./cmd/run');
  require('./cmd/make-html');
  require('./cmd/make-book');

  // Infrastructure Commands.
  require('./cmd/id-resolution');
  require('./cmd/logic-to-magic');
  require('./cmd/view-content');

  // Process the command line and run the appropriate command.
  var main = function() {
    // Create the top level parser.
    var ArgumentParser = argparse.ArgumentParser;
    var parser = new ArgumentParser({
      prog: 'dendry',
      description: 'Create and manage dendry projects.'
    });
    var subparsers = parser.addSubparsers({
      title: 'Commands',
      description:
        'For more information on a command, run: dendry <COMMAND> --help',
      dest: 'command',
      metavar: '<COMMAND>'
    });

    // Register each command's subparser in turn.
    utils.Command.commandList.forEach(function(command) {
      command.createArgumentParser(subparsers);
    });

    // Parse the arguments and run.
    var args = parser.parseArgs();
    var cmd = utils.Command.commandMap[args.command];
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
