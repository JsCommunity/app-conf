"use strict";

// ===================================================================

const chokidar = require("chokidar");
const dirname = require("path").dirname;
const homedir = require("os").homedir;
const resolvePath = require("path").resolve;

const debug = require("debug")("app-conf");
const flatten = require("lodash/flatten");

const entries = require("./entries");
const merge = require("./_merge");
const pMap = require("./_pMap");
const readFile = require("./_readFile");
const UnknownFormatError = require("./unknown-format-error");
const unserialize = require("./serializers").unserialize;

// ===================================================================

const clone = (value) => JSON.parse(JSON.stringify(value));

const RELATIVE_PATH_RE = /^\.{1,2}[/\\]/;
function resolvePaths(value, base) {
  if (typeof value === "string") {
    return value[0] === "~" && (value[1] === "/" || value[1] === "\\")
      ? homedir() + value.slice(1)
      : RELATIVE_PATH_RE.test(value)
        ? resolvePath(base, value)
        : value;
  }

  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      value[key] = resolvePaths(value[key], base);
    }
    return value;
  }

  return value;
}

// ===================================================================

function load(
  appName,
  { appDir, defaults, entries: whitelist, ignoreUnknownFormats = false } = {},
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
    return entry.list(entryOpts, dir) || [];
  })
    .then((files) => {
      files = flatten(files);
      return pMap(files, async (file) => {
        try {
          return await parse(file);
        } catch (error) {
          if (!(ignoreUnknownFormats && error instanceof UnknownFormatError)) {
            throw error;
          }
        }
      });
    })
    .then((data) =>
      data.reduce(
        (acc, cfg) => {
          if (cfg !== undefined) {
            merge(acc, cfg);
          }
          return acc;
        },
        defaults === undefined ? {} : clone(defaults),
      ),
    );
}
exports.load = load;

// ===================================================================

async function parse(path) {
  const file = await readFile(path);
  const data = unserialize(file);
  debug(file.path);
  return resolvePaths(data, dirname(file.path));
}
exports.parse = parse;

// ===================================================================

exports.watch = function watch({ appName, initialLoad = false, ...opts }, cb) {
  return new Promise((resolve, reject) => {
    const dirs = [];
    const entryOpts = { appName, appDir: opts.appDir };
    entries.forEach((entry) => {
      // vendor config should not change and is therefore not watched
      //
      // otherwise it could interfere if the program is running during
      // uninstall/reinstall
      if (entry.name === "vendor") {
        return;
      }

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
      .once("ready", () => {
        function unsubscribe() {
          return watcher.close();
        }

        if (initialLoad) {
          load(appName, opts).then(
            (config) => {
              cb(undefined, config);
              resolve(unsubscribe);
            },
            (error) => {
              const rejectOriginal = () => reject(error);
              unsubscribe().then(rejectOriginal, rejectOriginal);
            },
          );
        } else {
          resolve(unsubscribe);
        }
      });
  });
};
