"use strict";

// ===================================================================

const chokidar = require("chokidar");
const dirname = require("path").dirname;
const homedir = require("os").homedir;
const resolvePath = require("path").resolve;

const debug = require("debug")("app-conf");
const flatten = require("lodash/flatten");
const merge = require("lodash/merge");

const entries = require("./entries");
const pMap = require("./_pMap");
const UnknownFormatError = require("./unknown-format-error");
const unserialize = require("./serializers").unserialize;

// ===================================================================

const RELATIVE_PATH_RE = /^\.{1,2}[/\\]/;
function resolvePaths(value, base) {
  if (typeof value === "string") {
    return Promise.resolve(
      value[0] === "~" && (value[1] === "/" || value[1] === "\\")
        ? homedir() + value.slice(1)
        : RELATIVE_PATH_RE.test(value)
        ? resolvePath(base, value)
        : value
    );
  }

  if (value !== null && typeof value === "object") {
    return pMap(Object.keys(value), (key) =>
      resolvePaths(value[key], base).then((resolved) => {
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

function load(
  appName,
  {
    appDir = DEFAULT_APP_DIR,
    defaults,
    entries: whitelist,
    ignoreUnknownFormats = false,
  } = {}
) {
  const useWhitelist = whitelist !== undefined;
  if (useWhitelist) {
    whitelist = new Set(whitelist);
  }
  const entryOpts = { appDir, appName };
  return pMap(entries, (entry) => {
    if (useWhitelist && !whitelist.has(entry.name)) {
      return [];
    }

    const dirFn = entry.dir;
    const dir = typeof dirFn === "function" ? dirFn(entryOpts) : dirFn;
    return entry.read(entryOpts, dir);
  })
    .then((files) => {
      files = flatten(files);
      return pMap(files, (file) => {
        try {
          const data = unserialize(file);
          debug(file.path);
          return resolvePaths(data, dirname(file.path));
        } catch (error) {
          if (!(ignoreUnknownFormats && error instanceof UnknownFormatError)) {
            throw error;
          }
        }
      });
    })
    .then((data) =>
      data.reduce((acc, cfg) => {
        if (cfg !== undefined) {
          merge(acc, cfg);
        }
        return acc;
      }, merge({}, defaults))
    );
}
exports.load = load;

// ===================================================================

exports.watch = function watch({ appName, ...opts }, cb) {
  return new Promise((resolve, reject) => {
    const { appDir } = opts;
    if (appDir === undefined) {
      throw new TypeError("appDir must be defined");
    }

    const dirs = [];
    const entryOpts = { appName, appDir };
    entries.forEach((entry) => {
      const dirFn = entry.dir;
      const dir = typeof dirFn === "function" ? dirFn(entryOpts) : dirFn;
      if (dir !== undefined) {
        dirs.push(dir);
      }
    });

    const watcher = chokidar.watch(dirs, {
      depth: 0,
      ignoreInitial: true,
      ignorePermissionErrors: true,
    });

    const loadWrapper = () => {
      load(appName, opts).then((config) => cb(undefined, config), cb);
    };

    watcher
      .on("all", loadWrapper)
      .once("error", reject)
      .once("ready", (...args) => {
        loadWrapper();
        resolve(function unsubscribe() {
          return watcher.close();
        });
      });
  });
};
