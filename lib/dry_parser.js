/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var path = require('path');
  var fs = require('fs');
  var assert = require('assert');

  var RESERVED_PROPERTIES = {
    "id": true,
    "sections": true,
    "content": true,
    "options": true
  };

  var propre = /^([a-z-]+)\s*:\s*(.*)$/;
  var parseProperty = function(propertyString) {
    propertyString = propertyString.trim();
    var match = propre.exec(propertyString);
    if (match) {
      var name = match[1];
      name = name.replace(/-(.)/g, function(match, letter) {
        return letter.toUpperCase();
      });
      return {
        name: name,
        value: match[2]
      };
    } else {
      return null;
    }
  };

  var optionre = /^([@#][\w-]+)(\s+if\s+(.+?))?(\s*:\s*(.*))?$/;
  var parseOption = function(optionString) {
    optionString = optionString.trim();
    var match = optionre.exec(optionString);
    if (match) {
      var obj = {
        id: match[1]
      };
      if (match[3]) obj.viewIf = match[3];
      if (match[5]) obj.title = match[5];
      return obj;
    } else {
      return null;
    }
  };

  var parseFilename = function(filename) {
    var ext = path.extname(filename);
    var base = path.basename(filename, ext);
    var match = filenamere.exec(base);
    if (match) {
      var obj = {
        id: match[1]
      };
      if (match[3]) obj.type = match[3];
      return obj;
    } else {
      return null;
    }
  };

  var filenamere = /^([\w-]+?)(\.([\w-]+?))?$/;
  var idre = /^[\w-]+$/;

  // Parses the given content, extracted from the given file.
  var parseFromContent = function(filename, content, callback) {
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
      var fullMessage = i ? "Line "+i.toString()+": "+message : message;
      var error = new Error(fullMessage);
      error.line = i;
      callback(error);
    };

    var validateId = function(text) {
      if (!idre.test(text)) {
        error("Malformed id '"+text+"' (use letters, numbers, _ and - only).");
        return false;
      }
      return true;
    };

    // Validate a property, returns null if the property is invalid
    // and an error was raised.
    var parseAndValidateProperty = function(text, whatami) {
      var property = parseProperty(text);
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

    var finishCurrentSection = function() {
      currentSection.content = contentLines.join("\n");
    };

    // Blank lines are used as the primary transitions between content chunks.
    var handleBlankLine = function() {
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
      return true;
    };

    // Lines beginning with '@' introduce a new section.
    var createNewSection = function() {
      if (result.sections === undefined) result.sections = [];
      finishCurrentSection();

      var id = line.substr(1).trim();
      if (!validateId(id)) return false;

      // Check for id reuse.
      if (id === result.id) {
        error("Section can't use the file id '"+id+"'.");
        return false;
      }
      if (sectionIds[id] !== undefined) {
        error("Section with id '"+id+"' already defined.");
        return false;
      } else {
        sectionIds[id] = true;
      }

      // Create a new section and register it.
      currentSection = {
        id: id
      };
      contentLines = [];
      optionIds = {};
      result.sections.push(currentSection);

      context = 'properties';
      return true;
    };

    var beginOptionsBlock = function() {
      context = 'options';
      currentSection.options = {
        options: []
      };
      return true;
    };

    var handlePropertyLine = function() {
      gobbleFollowOnLines();
      var property = parseAndValidateProperty(line, "property");
      if (property !== undefined) {
        currentSection[property.name] = {$value:property.value, $line:i};
        return true;
      } else {
        // Error has been raised, just exit.
        return false;
      }
    };

    var handleOptionLine = function() {
      gobbleFollowOnLines();
      if (line.substr(0,1) !== '-') {
        error("Hyphens are required in an option block.");
        return false;
      }

      var lineTrimmed = line.substr(1).trim();
      var option = parseOption(lineTrimmed);
      if (option !== null) {
        // Check for redefinitions.
        if (optionIds[option.id] !== undefined) {
          error("Option with id/tag '"+option.id+"' already specified.");
          return false;
        } else {
          optionIds[option.id] = true;
        }
        currentSection.options.options.push({$value:option, $line:i});
      } else {
        // See if we can interpret it as a property.
        option = parseAndValidateProperty(line.substr(1).trim(),
                                          "property or option");
        if (option !== undefined) {
          currentSection.options[option.name] = {$value:option.value, $line:i};
        } else {
          // Error has been raised, just exit.
          return false;
        }
      }
      return true;
    };

    // ......................................................................
    // Parsing algorithm.
    var i;
    var line;
    var lines = content.split(/\n/);
    var context = 'properties';
    var contentLines = [];
    var sectionIds = {};
    var optionIds = {};
    var result = parseFilename(filename);
    if (!result) {
      return error("Cannot extract id or type from filename.");
    }
    var currentSection = result;

    // Interpret lines in sequence.
    for (i = 1; i <= lines.length; ++i) {
      line = lines[i-1];

      // Ignore comments.
      if (line.substring(0, 1) == '#') continue;

      // A blank line transitions between chunk types
      if (line.trim().length === 0) {
        assert.ok(handleBlankLine());
        continue;
      }

      // If we have an id, then create a new section.
      if (line.substring(0, 1) == '@') {
        if (!createNewSection()) return;
        continue;
      }

      // Hyphens separated by content by a blank link begin options.
      if (line.substring(0, 1) == '-' && (context == 'blank-content' ||
                                          context == 'first-content')) {
        assert.ok(beginOptionsBlock());
      }

      // Otherwise deal with the appropriate content.
      switch(context) {
      case null:
        return error("Found content after an options block.");

      case 'blank-content':
        contentLines.push('');
        /* falls through */
      case 'first-content':
      case 'content':
        contentLines.push(line);
        context = 'content';
        break;

      case 'properties':
        if (!handlePropertyLine()) return;
        break;

      case 'options':
        if (!handleOptionLine()) return;
        break;
      }
    }

    finishCurrentSection();
    return callback(null, result);
  };

  // Loads and parses the given file.
  var parseFromFile = function(filename, callback) {
    fs.readFile(filename, function(err, content) {
      if (err) return callback(err);
      parseFromContent(filename, content.toString(), callback);
    });
  };

  // ======================================================================

  // Accessors for property values, which cope with raw property
  // values, or with augmented values containing a line number.
  var propval = function(property) {
    if (property !== undefined && property.$value !== undefined) {
      return property.$value;
    } else {
      return property;
    }
  };

  var properr = function(property, msg) {
    if (property !== undefined && property.$line !== undefined) {
      msg = "Line "+property.$line+": "+msg;
    }
    return new Error(msg);
  };

  var propline = function(property) {
    return property.$line;
  };

  module.exports = {
    parseFromContent: parseFromContent,
    parseFromFile: parseFromFile,

    regexes: {
      id: idre
    },

    propval: propval,
    properr: properr,
    propline: propline
  };

}());
