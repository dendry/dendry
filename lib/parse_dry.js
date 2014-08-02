/*!
 * dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:4 */
(function() {

  var RESERVED_PROPERTIES = {
    "id": true,
    "sections": true,
    "content": true,
    "options": true
  };

  var propre = /^([a-z0-9_-]+)\s*:\s*(.*)$/;
  var parsePropertySync = function(propertyString) {
    proeprtyString = propertyString.trim();
    var match = propre.exec(propertyString);
    if (match) {
      return {
        name: match[1],
        value: match[2]
      };
    } else {
      return null;
    }
  };

  var optionre = /^([@#][a-z0-9_-]+)(\s+if\s+(.+?))?(\s*:\s*(.*))?$/;
  var parseOptionSync = function(optionString) {
    optionString = optionString.trim();
    var match = optionre.exec(optionString);
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

    // Handles an error, adding line number.
    var error = function(message) {
      var fullMessage = "Line "+i.toString()+": "+message;
      var error = new Error(fullMessage);
      error.line = i;
      callback(error);
    };

    // Validate a property, returns null if the property is invalid
    // and an error was raised.
    var doProperty = function(text, whatami) {
      var property = parsePropertySync(text);
      if (property !== null) {
        if (RESERVED_PROPERTIES[property.name]) {
          return error("Property '"+property.name+"' is a reserved name.");
        } else if (currentSection[property.name] !== undefined) {
          return error("Property '"+property.name+"' is already defined.");
        } else {
          return property;
        }
      } else {
        return error("Invalid "+whatami+" definition.");
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

        // Clean up the outgoing section.
        currentSection.content = contentLines.join("\n");

        // Create a new section and register it.
        currentSection = {
          id: line.substr(1).trim()
        };
        contentLines = [];
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
          return error("More than one options block found.");
        }
        currentSection.options = {
          options: []
        };
      }

      // Otherwise deal with the appropriate content.
      switch(context) {
      case null:
        // This is an error.
        return error("Found content after an options block.");
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
        var property = doProperty(line, "property");
        if (property !== undefined) {
          currentSection[property.name] = property.value;
        } else {
          // Error has been raised, just exit.
          return;
        }
        break;
      case 'options':
        gobbleFollowOnLines();
        var lineTrimmed = line.substr(1).trim();
        var option = parseOptionSync(lineTrimmed);
        if (option !== null) {
          currentSection.options.options.push(option);
        } else {
          // See if we can interpret it as a property.
          option = doProperty(line.substr(1).trim(), "property or option");
          if (option !== undefined) {
            currentSection.options[option.name] = option.value;
          } else {
            // Error has been raised, just exit.
            return;
          }
        }
        break;
      }
    }

    // Clean up any dangling content.
    currentSection.content = contentLines.join("\n");

    return callback(null, result);
  };

  module.exports = {
    parse: parse
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
