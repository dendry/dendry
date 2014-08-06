/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var _ = require('lodash');
  var assert = require('assert');

  var propstr = function(property) { return property; };
  
  // |f the property is valid, calls back with an integer.
  var parseInteger = function(property, callback) {
    var integer = parseInt(propstr(property));
    if (isNaN(integer)) {
      var err = new Error("Not a valid whole number.");
      err.property = property;
      return callback(err);
    } else {
      return callback(null, integer);
    }
  };
  
  var parseIntegerInRange = function(property, min, max, callback) {
    parseInteger(property, function(err, val) {
      if (err) return callback(err);
      if ((min !== undefined && val < min)||(max !== undefined && val > max)) {
        if (min !== undefined) {
          if (max !== undefined) {
            err = new Error(""+val+" is not in range "+min+"-"+max+".");
          } else {
            err = new Error(""+val+" is not in range "+min+"+.");
          }
        } else {
          err = new Error(""+val+" is not in range -"+max+".");
        }
        err.property = property;
        return callback(err);
      }
      return callback(null, val);
    });
  };
  
  // If the property is valid, calls back with a list of tags, stripped of 
  // any leading hash symbols. Tags can be whitespace, comma or semicolon
  // separated.
  var tagSeparatorRe = /[\s;,]+/;
  var tagRe = /^#?([0-9a-zA-z_-]+)$/;
  var parseTagList = function(property, callback) {
    var tags = propstr(property).split(tagSeparatorRe);
    var result = [];
    for (var i = 0; i < tags.length; ++i) {
      var tag = tags[i].trim();
      if (!tag) continue;
      
      var match = tagRe.exec(tag);
      if (!match) {
        var err = new Error("Tag "+(i+1)+" is not valid.");
        err.property = property;
        return callback(err);
      } else {
        result.push(match[1]);
      }
    }
    return callback(null, result);
  };
  
  module.exports = {
    parseInteger: parseInteger,
    parseIntegerInRange: parseIntegerInRange,
    parseTagList: parseTagList
  };
}());