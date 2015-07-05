/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  'use strict';

  var _ = require('lodash');

  var compiler = require('../../parsers/compiler');
  var utils = require('../utils');

  // ----------------------------------------------------------------------
  // IdResolution: Creates a new project directory structure from a template.
  // ----------------------------------------------------------------------

  var cmdIdResolution = new utils.Command('id-resolution');
  cmdIdResolution.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      // Omit help option to avoid listing in main -h output.
      description: 'When refering to other scenes by their id, a range of ' +
        'relative id formats can be used. These are resolved when the ' +
        'game is compiled into absolute ids of scenes. This command allows ' +
        'you to see the order in which relative ids are checked. When ' +
        'multiple candidates are returned, these are checked in turn and ' +
        'the first matching id is used.'
    });
    parser.addArgument(['relative-id'], {
      help: 'The id reference that needs to be tracked down.'
    });
    parser.addArgument(['context-id'], {
      nargs: '?',
      help: 'The id of the scene in which the reference occurs.'
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
