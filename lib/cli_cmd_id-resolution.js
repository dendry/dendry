/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');

  var compiler = require('./compiler');
  var cliUtils = require('./cli_utils');

  // ----------------------------------------------------------------------
  // IdResolution: Creates a new project directory structure from a template.
  // ----------------------------------------------------------------------

  var cmdIdResolution = new cliUtils.Command("id-resolution");
  cmdIdResolution.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      help: "Displays the order that id references will be checked."
    });
    parser.addArgument(['relative-id'], {
      help: "The id reference that needs to be tracked down."
    });
    parser.addArgument(['context-id'], {
      nargs: '?',
      help: "The id of the scene in which the reference occurs."
    });
  };
  cmdIdResolution.run = function(args, callback) {
    try {
      var candidates = compiler.getCandidateAbsoluteIds(
        args['context-id'], args['relative-id']
      );
      _.each(candidates, function(candidate) {
        console.log(candidate);
      });
    } catch (err) {
      console.error(err.toString().red);
    }
  };

  module.exports = {
    cmd: cmdIdResolution
  };
}());
