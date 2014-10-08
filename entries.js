'use strict';

//====================================================================

var Bluebird = require('bluebird');

var fs$readFile = Bluebird.promisify(require('fs').readFile);
var resolvePath = require('path').resolve;

var flatten = require('lodash.flatten');
var glob = Bluebird.promisify(require('glob'));

//====================================================================

function readFile(path) {
  return fs$readFile(path).then(function (buffer) {
    return {
      path: path,
      content: buffer,
    };
  });
}

function ignoreAccessErrors(error) {
  if (error.cause.code !== 'EACCES') {
    throw error;
  }

  return [];
}

//====================================================================

// Default configuration entries.
module.exports = [

  // Configuration of the current project (local to the file
  // hierarchy).
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

      return Bluebird.map(paths, function (path) {
        return glob(path, {
          silent: true,
        }).catch(ignoreAccessErrors);
      }).then(flatten).map(readFile);
    }
  },

  // Configuration for the current user.
  {
    name: 'global',
    read: function (opts) {
      var name = opts.name;
      var home = process.env.HOME;

      return Bluebird.map(
        glob(home +'/.config/'+ name +'/config.*'),
        readFile
      );
    }
  },

  // Configuration for the whole system.
  {
    name: 'system',
    read: function (opts) {
      var name = opts.name;

      return Bluebird.map(
        glob('/etc/'+ name +'/config.*'),
        readFile
      );
    }
  },

  // Default vendor configuration.
  {
    name: 'vendor',
    read: function () {
      // It is assumed that app-conf is in the `node_modules`
      // directory of the owner package.
      return Bluebird.map(
        glob(__dirname +'/../../config.*'),
        readFile
      );
    },
  },
];
