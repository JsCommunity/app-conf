'use strict'

// ===================================================================

var Bluebird = require('bluebird')

var dirname = require('path').dirname
var getFileStats = Bluebird.promisify(require('fs').stat)
var resolvePath = require('path').resolve

var debug = require('debug')('app-conf')
var flatten = require('lodash/flatten')
var isObject = require('lodash/isObject')
var isString = require('lodash/isString')
var map = require('lodash/map')
var merge = require('lodash/merge')

var entries = require('./entries')
var UnknownFormatError = require('./unknown-format-error')
var unserialize = require('./serializers').unserialize

// ===================================================================

function isPath (path) {
  return getFileStats(path).then(function () {
    return true
  }).catch(function () {
    return false
  })
}

var RELATIVE_PATH_RE = /^\.{1,2}[/\\]/
function resolveRelativePaths (value, base) {
  var path

  if (isString(value) && RELATIVE_PATH_RE.test(value)) {
    path = resolvePath(base, value)

    return isPath(path).then(function (isPath) {
      if (isPath) {
        return path
      }
      return value
    })
  }

  if (isObject(value)) {
    var promises = map(value, function (item, key) {
      return resolveRelativePaths(item, base).then(function (item) {
        value[key] = item
      })
    })
    return Bluebird.all(promises).return(value)
  }

  return Bluebird.resolve(value)
}

function noop () {}

function rethrow (error) {
  throw error
}

// ===================================================================

// Does not work properly in many cases (e.g. with pnpm)
//
// It's better for the user to pass an `appDir` option but we need to
// keep this for compatibility.
var DEFAULT_APP_DIR = dirname(dirname(__dirname))

function load (name, opts) {
  var defaults = merge({}, opts && opts.defaults)
  var unknownFormatHandler = opts && opts.ignoreUnknownFormats ? noop : rethrow

  return Bluebird.map(entries, function (entry) {
    return entry.read({
      name: name,
      appDir: (opts && opts.appDir) || DEFAULT_APP_DIR
    })
  }).then(flatten).each(function (file) {
    debug(file.path)
    return file
  }).map(function (file) {
    return new Bluebird(function (resolve) {
      resolve(unserialize(file))
    }).then(function (value) {
      return resolveRelativePaths(value, dirname(file.path))
    }).catch(UnknownFormatError, unknownFormatHandler)
  }).each(function (value) {
    if (value) {
      merge(defaults, value)
    }
  }).return(defaults)
}

// ===================================================================

exports.load = load
