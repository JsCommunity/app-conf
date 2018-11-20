"use strict";

// ===================================================================

const Bluebird = require("bluebird");

const dirname = require("path").dirname;
const getFileStats = Bluebird.promisify(require("fs").stat);
const resolvePath = require("path").resolve;

const debug = require("debug")("app-conf");
const flatten = require("lodash/flatten");
const isObject = require("lodash/isObject");
const isString = require("lodash/isString");
const map = require("lodash/map");
const merge = require("lodash/merge");

const entries = require("./entries");
const UnknownFormatError = require("./unknown-format-error");
const unserialize = require("./serializers").unserialize;

// ===================================================================

function isPath(path) {
  return getFileStats(path)
    .then(function() {
      return true;
    })
    .catch(function() {
      return false;
    });
}

const RELATIVE_PATH_RE = /^\.{1,2}[/\\]/;
function resolveRelativePaths(value, base) {
  let path;

  if (isString(value) && RELATIVE_PATH_RE.test(value)) {
    path = resolvePath(base, value);

    return isPath(path).then(function(isPath) {
      if (isPath) {
        return path;
      }
      return value;
    });
  }

  if (isObject(value)) {
    const promises = map(value, function(item, key) {
      return resolveRelativePaths(item, base).then(function(item) {
        value[key] = item;
      });
    });
    return Bluebird.all(promises).return(value);
  }

  return Bluebird.resolve(value);
}

function noop() {}

function rethrow(error) {
  throw error;
}

// ===================================================================

// Does not work properly in many cases (e.g. with pnpm)
//
// It's better for the user to pass an `appDir` option but we need to
// keep this for compatibility.
const DEFAULT_APP_DIR = dirname(dirname(__dirname));

function load(name, opts) {
  const defaults = merge({}, opts && opts.defaults);
  const unknownFormatHandler = opts && opts.ignoreUnknownFormats ? noop : rethrow;

  return Bluebird.map(entries, function(entry) {
    return entry.read({
      name: name,
      appDir: (opts && opts.appDir) || DEFAULT_APP_DIR,
    });
  })
    .then(flatten)
    .each(function(file) {
      debug(file.path);
      return file;
    })
    .map(function(file) {
      return new Bluebird(function(resolve) {
        resolve(unserialize(file));
      })
        .then(function(value) {
          return resolveRelativePaths(value, dirname(file.path));
        })
        .catch(UnknownFormatError, unknownFormatHandler);
    })
    .each(function(value) {
      if (value) {
        merge(defaults, value);
      }
    })
    .return(defaults);
}

// ===================================================================

exports.load = load;
