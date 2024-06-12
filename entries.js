"use strict";

// ===================================================================

const promisify = require("promise-toolbox/promisify");

const j = require("path").join;
const resolvePath = require("path").resolve;

const flatten = require("lodash/flatten");
const glob = promisify(require("glob"));
const xdgBasedir = require("xdg-basedir");

const pMap = require("./_pMap");

// ===================================================================

function ignoreAccessErrors(error) {
  if (error.code !== "EACCES") {
    throw error;
  }

  return [];
}

// ===================================================================

// Default configuration entries.
module.exports = [
  // Default vendor configuration.
  {
    name: "vendor",
    dir: (opts) => opts.appDir,
    list: (_, dir) => dir && glob(j(dir, "config.*")),
  },

  // Configuration for the whole system.
  {
    name: "system",
    dir: (opts) => j("/etc", opts.appName),
    list: (_, dir) => glob(j(dir, "config.*")),
  },

  // Configuration for the current user.
  {
    name: "global",
    dir: (opts) => {
      const configDir = xdgBasedir.config;
      return configDir && j(configDir, opts.appName);
    },
    list: (_, dir) => dir && glob(j(dir, "config.*")),
  },

  // Configuration of the current project (local to the file
  // hierarchy).
  {
    name: "local",
    list(opts) {
      const { appName } = opts;

      // Compute the list of paths from the current directory to the
      // root directory.
      const paths = [];
      let dir, prev;
      dir = process.cwd();
      while (dir !== prev) {
        paths.push(j(dir, "." + appName + ".*"));
        prev = dir;
        dir = resolvePath(dir, "..");
      }

      return pMap(paths.reverse(), (path) =>
        glob(path, {
          silent: true,
        }).catch(ignoreAccessErrors),
      ).then(flatten);
    },
  },
];
