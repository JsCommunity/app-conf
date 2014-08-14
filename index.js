'use strict';

//====================================================================

var Promise = require('bluebird');
Promise.longStackTraces();

var dirname = require('path').dirname;
var getFileStats = Promise.promisify(require('fs').stat);
var resolvePath = require('path').resolve;

var merge = require('lodash.merge');
var isObject = require('lodash.isobject');
var isString = require('lodash.isstring');
var map = require('lodash.map');

var entries = require('./entries');
var serializers = require('./serializers');

//====================================================================

var isPath = function (path) {
  return getFileStats(path).then(function () {
    return true;
  }).catch(function () {
    return false;
  });
};

var fixPath = function fixPath(value, base) {
  var path;

  if (isString(value)) {
    path = resolvePath(base, value);

    return isPath(path).then(function (isPath) {
      if (isPath) {
        return path;
      }
      return value;
    });
  }

  if (isObject(value)) {
    var promises = map(value, function (item, key) {
      return fixPath(item, base).then(function (item) {
        value[key] = item;
      });
    });
    return Promise.all(promises).return(value);
  }

  return Promise.resolve(value);
};


//====================================================================

var load = function (name, defaults) {
  defaults || (defaults = {});

  return Promise.each(entries, function (entry) {
    return entry.read({
      name: name,
    }).each(function (file) {
      return Promise.try(
        serializers.unserialize,
        [file]
      ).then(function (value) {
        return fixPath(value, dirname(file.path));
      }).then(function (value) {
        defaults = merge(value, defaults);
      });
    });
  }).then(function () {
    return defaults;
  });
};

//====================================================================

exports.load = load;
