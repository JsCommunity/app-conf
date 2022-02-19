"use strict";

// ===================================================================

const promisify = require("promise-toolbox/promisify");

const fs$readFile = promisify(require("fs").readFile);
const j = require("path").join;
const realpath = promisify(require("fs").realpath);
const resolvePath = require("path").resolve;

const flatten = require("lodash/flatten");
const glob = promisify(require("glob"));
const xdgBasedir = require("xdg-basedir");

const pMap = require("./_pMap");

// ===================================================================

function readFile(path) {
  return realpath(path).then(function (path) {
    return fs$readFile(path).then(function (buffer) {
      return {
        path: path,
        content: buffer,
      };
    });
  });
}

function ignoreAccessErrors(error) {
  if (error.cause.code !== "EACCES") {
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
    read: (_, dir) => dir && pMap(glob(j(dir, "config.*")), readFile),
  },

  // Configuration for the whole system.
  {
    name: "system",
    dir: (opts) => j("/etc", opts.appName),
    read: (_, dir) => pMap(glob(j(dir, "config.*")), readFile),
  },

  // Configuration for the current user.
  {
    name: "global",
    dir: (opts) => {
      const configDir = xdgBasedir.config;
      return configDir && j(configDir, opts.appName);
    },
    read: (_, dir) => dir && pMap(glob(j(dir, "config.*")), readFile),
  },

  // Configuration of the current project (local to the file
  // hierarchy).
  {
    name: "local",
    read(opts) {
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

      return pMap(
        pMap(paths.reverse(), (path) =>
          glob(path, {
            silent: true,
          }).catch(ignoreAccessErrors)
        ).then(flatten),
        readFile
      );
    },
  },
];
