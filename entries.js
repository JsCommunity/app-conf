'use strict'

// ===================================================================

var Bluebird = require('bluebird')

var fs$readFile = Bluebird.promisify(require('fs').readFile)
var j = require('path').join
var realpath = Bluebird.promisify(require('fs').realpath)
var resolvePath = require('path').resolve

var flatten = require('lodash/flatten')
var glob = Bluebird.promisify(require('glob'))
var xdgBasedir = require('xdg-basedir')

// ===================================================================

var realpathCache = {}

function readFile (path) {
  return realpath(path, realpathCache).then(function (path) {
    return fs$readFile(path).then(function (buffer) {
      return {
        path: path,
        content: buffer
      }
    })
  })
}

function ignoreAccessErrors (error) {
  if (error.cause.code !== 'EACCES') {
    throw error
  }

  return []
}

// ===================================================================

// Default configuration entries.
module.exports = [

  // Default vendor configuration.
  {
    name: 'vendor',
    read: function (opts) {
      // It is assumed that app-conf is in the `node_modules`
      // directory of the owner package.
      return Bluebird.map(
        glob(j(opts.appDir, 'config.*')),
        readFile
      )
    }
  },

  // Configuration for the whole system.
  {
    name: 'system',
    read: function (opts) {
      var name = opts.name

      return Bluebird.map(
        glob(j('/etc', name, 'config.*')),
        readFile
      )
    }
  },

  // Configuration for the current user.
  {
    name: 'global',
    read: function (opts) {
      var configDir = xdgBasedir.config
      if (!configDir) {
        return Bluebird.resolve([])
      }

      var name = opts.name

      return Bluebird.map(
        glob(j(configDir, name, 'config.*')),
        readFile
      )
    }
  },

  // Configuration of the current project (local to the file
  // hierarchy).
  {
    name: 'local',
    read: function (opts) {
      var name = opts.name

      // Compute the list of paths from the current directory to the
      // root directory.
      var paths = []
      var dir, prev
      dir = process.cwd()
      while (dir !== prev) {
        paths.push(j(dir, '.' + name + '.*'))
        prev = dir
        dir = resolvePath(dir, '..')
      }

      return Bluebird.map(paths.reverse(), function (path) {
        return glob(path, {
          silent: true
        }).catch(ignoreAccessErrors)
      }).then(flatten).map(readFile)
    }
  }
]
