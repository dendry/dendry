/*!
 * dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:4 */
(function() {

  var parsePropertySync = function(propertyString) {
    console.dir(propertyString);
    var terms = propertyString.trim().split(':', 2);
    var name = terms[0].trim();
    // TODO: Check for invalid property names.
    var value = terms[1].trim();
    return {
      name: name,
      value: value
    };
  };

  var parseOptionSync = function(optionString) {
    optionString = optionString.trim();
    var match = /([@#][a-z0-9_-]+)(\s+if\s+(.+?))?(\s*:\s*(.*))?$/.exec(optionString);
    if (match) {
      return {
        id: match[1],
        "view-if": match[3],
        title: match[5]
      };
    } else {
      return null;
    }
  };

  var parse = function(content, callback) {
    var lines = content.split(/\n/);

    var currentSection = {};
    var result = currentSection;
    var context = 'properties';
    var contentLines = [];
    currentSection.content = contentLines;

    var i;
    var line;
    // For properties and links, we can have follow on lines, this
    // checks and advances the current line, returning the accumulated
    // data.
    var gobbleFollowOnLines = function() {
      var content;
      for (var j = i+1; j <= lines.length; ++j) {
        if (!/^\s+\S/.test(lines[j-1])) break;

        // We have a continuation line.
        i = j;
        if (!content) content = [line.trim()];
        content.push(lines[j-1].trim());
      }
      if (content) {
        line = content.join(" ");
      }
    };

    // Interpret lines in sequence.
    for (i = 1; i <= lines.length; ++i) {
      line = lines[i-1];

      // Ignore comments.
      if (line.substring(0, 1) == '#') continue;

      // A blank line finishes properties or options
      if (line.trim().length === 0) {
        switch (context) {
        case 'content':
          context = 'blank-content';
          break;
        case 'properties':
          context = 'first-content';
          break;
        case 'options':
          // Transitions into no-context, we can have no more content.
          context = null;
          break;
        case null:
          // We're after any content, so ignore any blank lines.
          break;
        }
        // We're done with this line.
        continue;
      }

      // If we have an id, then create a new section.
      if (line.substring(0, 1) == '@') {
        // Make sure we've got a sections array.
        if (result.sections === undefined) {
          result.sections = [];
        }

        // Create a new section and register it.
        currentSection = {
          id: line.substr(1).trim()
        };
        contentLines = [];
        currentSection.content = contentLines;
        result.sections.push(currentSection);

        // Reset our mode.
        context = 'properties';

        // We're done with this line.
        continue;
      }

      // Check we are starting a link block.
      if (line.substring(0, 1) == '-' && (context == 'blank-content' ||
                                          context == 'first-content')) {
        context = 'options';
        if (currentSection.options !== undefined) {
          return callback(new Error("More than one options block found."));
        }
        currentSection.options = {
          options: []
        };
      }

      // Otherwise deal with the appropriate content.
      switch(context) {
      case null:
        // This is an error.
        return callback(new Error("Found content after an options block."));
      case 'blank-content':
        contentLines.push('');
        contentLines.push(line);
        context = 'content';
        break;
      case 'first-content':
        contentLines.push(line);
        context = 'content';
        break;
      case 'content':
        contentLines.push(line);
        break;
      case 'properties':
        gobbleFollowOnLines();
        var property = parsePropertySync(line);
        currentSection[property.name] = property.value;
        break;
      case 'options':
        gobbleFollowOnLines();
        var lineTrimmed = line.substr(1).trim();
        var option = parseOptionSync(lineTrimmed);
        if (option) {
          currentSection.options.options.push(option);
        } else {
          option = parsePropertySync(lineTrimmed);
          currentSection.options[option.name] = option.value;
        }
        break;
      }
    }

    return callback(null, result);
  };

  module.exports = {
  };

  var fs = require('fs');
  var path = require('path');
  var colors = require('colors');
  var main = function() {
    // DEBUG
    var fn = path.join(__dirname, '..', 'test', 'parse-test.type.dry');
    fs.readFile(fn, 'utf8', function(err, content) {
      if (err) return console.info(err.toString().red);
      parse(content, function(err, content) {
        if (err) return console.info(err.toString().red);
        console.info(JSON.stringify(content, null, 2));
      });
    });
  };

  if (require.main === module) {
    main();
  }

}());
