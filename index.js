"use strict";

// ===================================================================

const promisify = require("promise-toolbox/promisify");

const dirname = require("path").dirname;
const getFileStats = promisify(require("fs").stat);
const resolvePath = require("path").resolve;

const debug = require("debug")("app-conf");
const flatten = require("lodash/flatten");
const merge = require("lodash/merge");

const entries = require("./entries");
const pMap = require("./_pMap");
const UnknownFormatError = require("./unknown-format-error");
const unserialize = require("./serializers").unserialize;

// ===================================================================

const isPath = path => getFileStats(path).then(() => true, () => false);

const RELATIVE_PATH_RE = /^\.{1,2}[/\\]/;
function resolveRelativePaths(value, base) {
  if (typeof value === "string" && RELATIVE_PATH_RE.test(value)) {
    const path = resolvePath(base, value);
    return isPath(path).then(success => (success ? path : value));
  }

  if (value !== null && typeof value === "object") {
    return pMap(Object.keys(value), key =>
      resolveRelativePaths(value[key], base).then(resolved => {
        value[key] = resolved;
      })
    ).then(() => value);
  }

  return Promise.resolve(value);
}

// ===================================================================

// Does not work properly in many cases (e.g. with pnpm)
//
// It's better for the user to pass an `appDir` option but we need to
// keep this for compatibility.
const DEFAULT_APP_DIR = dirname(dirname(__dirname));

function load(appName, opts) {
  const ignoreUnknownFormats =
    (opts != null && opts.ignoreUnknownFormats) || false;

  return pMap(entries, entry =>
    entry.read({
      appDir: (opts && opts.appDir) || DEFAULT_APP_DIR,
      appName,
    })
  )
    .then(files => {
      files = flatten(files);
      files.forEach(_ => debug(_.path));
      return pMap(files, file => {
        try {
          return resolveRelativePaths(unserialize(file), dirname(file.path));
        } catch (error) {
          if (!(ignoreUnknownFormats && error instanceof UnknownFormatError)) {
            throw error;
          }
        }
      });
    })
    .then(data =>
      data.reduce((acc, cfg) => {
        if (cfg !== undefined) {
          merge(acc, cfg);
        }
        return acc;
      }, merge({}, opts && opts.defaults))
    );
}

// ===================================================================

exports.load = load;
