/*!
 * dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:4 */
(function() {

  var parsePropertySync = function(propertyString) {
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
        condition: match[3],
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

    lines.forEach(function(line) {
      // Ignore comments.
      if (line.substring(0, 1) == '#') return;

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
        return;
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
        return;
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

      // If we start with an indent, then we continue the previous property
      if (/^[ \t]/.test(line)) {
        // TODO
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
        var property = parsePropertySync(line);
        currentSection[property.name] = property.value;
        break;
      case 'options':
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
    });

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
