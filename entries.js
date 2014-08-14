'use strict';

//====================================================================

var Promise = require('bluebird');

var fs$readFile = Promise.promisify(require('fs').readFile);
var resolvePath = require('path').resolve;

var flatten = require('lodash.flatten');
var glob = Promise.promisify(require('glob'));

//====================================================================

var readFile = function (path) {
  return fs$readFile(path).then(function (buffer) {
    return {
      path: path,
      content: buffer,
    };
  });
};

//====================================================================

// Default configuration entries.
module.exports = [
  {
    name: 'local',
    read: function (opts) {
      var name = opts.name;

      // Compute the list of paths from the current directory to the
      // root directory.
      var paths = [];
      var dir, prev;
      dir = process.cwd();
      while (dir !== prev) {
        paths.push(dir +'/.'+ name +'.*');
        prev = dir;
        dir = resolvePath(dir, '..');
      }

      return Promise.map(paths, function (path) {
        return glob(path);
      }).then(flatten).map(readFile);
    }
  },

  {
    name: 'global',
    read: function (opts) {
      var name = opts.name;
      var home = process.env.HOME;

      return Promise.map(
        glob(home +'/.config/'+ name +'/config.*'),
        readFile
      );
    }
  },

  {
    name: 'system',
    read: function (opts) {
      var name = opts.name;

      return Promise.map(
        glob('/etc/'+ name +'/config.*'),
        readFile
      );
    }
  },
];
