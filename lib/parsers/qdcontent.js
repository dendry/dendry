/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var async = require('async');
  var content = require('./content');

  var indent_re = /^\s+\S+/;
  var line_re = /^\((-?[0-9]+(?:\.[0-9]+)?|-?\.[0-9]+)?\s*(-|to|..|\+)\s*(-?[0-9]+(?:\.[0-9]+)?|-?\.[0-9]+)?\)\s*(.*)$/m;
  var compile = function(text, callback) {
    var lines = text.split(/[ \t]*\n/g);
    var result = [];
    for (var i = 0; i < lines.length; ) {
      var line = lines[i];

      var j = i+1;
      while (j < lines.length) {
        if (indent_re.test(lines[j])) {
          line = line + '\n' + lines[j];
          ++j;
        } else {
          break;
        }
      }

      var match = line_re.exec(line);
      if (!match) {
        return callback(new Error("Unknown range declaration."));
      } else {
        var rng = {};
        if (match[1] !== undefined) {
          rng.min = parseFloat(match[1]);
        }
        if (match[3] !== undefined) {
          rng.max = parseFloat(match[3]);
        }
        if (match[4] !== undefined && match[4].trim().length > 0) {
          rng.output = match[4];
        }
        result.push(rng);
      }

      i = j;
    }

    async.each(result, function(rng, done) {
      if (rng.output) {
        content.compile(rng.output, false, function(err, content) {
          if (err) return done(err);
          rng.output = content;
          return done(null);
        });
      } else {
        return done(null);
      }
    }, function(err) {
      if (err) return callback(err);
      else return callback(null, result);
    });
  };

  module.exports = {
    compile: compile
  };
}());
