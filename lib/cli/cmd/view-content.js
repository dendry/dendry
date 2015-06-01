/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');
  var argparse = require('argparse');
  var fs = require('fs');

  var content = require('../../parsers/content');
  var toText = require('../../ui/content/text');
  var toHTML = require('../../ui/content/html');
  var utils = require('../utils');

  // ----------------------------------------------------------------------
  // View-Content: Displays the formatted output for given input content.
  // ----------------------------------------------------------------------

  var cmdViewContent = new utils.Command("view-content");
  cmdViewContent.createArgumentParser = function(subparsers) {
    var parser = subparsers.addParser(this.name, {
      // No help to avoid this being displayed in top level help.
      description: "The main textual content of a Dendry scene is written "+
        "using a kind of markdown/structured text format. This command "+
        "lets you preview the output for a particular input content."
    });
    parser.addArgument(['content'], {
      help: "The content text to convert.",
      action: "store",
      defaultValue: '-'
    });
    var typeGroup = parser.addMutuallyExclusiveGroup({required: true});
    typeGroup.addArgument(['-H', '--html', '--HTML'], {
      defaultValue: false,
      action: "storeTrue",
      help: "Output the content in HTML form."
    });
    typeGroup.addArgument(['-t', '--text'], {
      defaultValue: false,
      action: "storeTrue",
      help: "Output the content in text form."
    });
  };
  cmdViewContent.run = function(args, callback) {
    var inStream;
    if (args.content.trim() === '-') {
      inStream = process.stdin;
    } else {
      inStream = fs.createReadStream(args.content);
    }

    // Suck all the content out of the stream.
    var source = [];
    inStream.on('data', function(chunk) {
      source.push(chunk.toString());
    });
    inStream.on('error', function(err) {
      return callback(err);
    });
    inStream.on('end', function() {
      source = source.join('');

      content.compile(source, function(err, compiled) {
        // Build the conversion data
        var data = [];
        if (compiled.stateDependencies !== undefined) {
          data = _.times(compiled.stateDependencies.length,
                         function() { return true; });
        }

        // Find the conversion fn.
        var output;
        if (args.html) {
          output = toHTML.convert(compiled.paragraphs, data);
        } else {
          var width = (process.stdout.getWindowSize()[0] - 2);
          output = toText.convert(compiled.paragraphs, data, width);
        }
        console.log(output);
        callback();
      });
    });
  };

  module.exports = {
    cmd: cmdViewContent
  };
}());
