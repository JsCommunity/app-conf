"use strict";

// ===================================================================

const Bluebird = require("bluebird");

const fs$readFile = Bluebird.promisify(require("fs").readFile);
const j = require("path").join;
const realpath = Bluebird.promisify(require("fs").realpath);
const resolvePath = require("path").resolve;

const flatten = require("lodash/flatten");
const glob = Bluebird.promisify(require("glob"));
const xdgBasedir = require("xdg-basedir");

// ===================================================================

const realpathCache = {};

function readFile(path) {
  return realpath(path, realpathCache).then(function(path) {
    return fs$readFile(path).then(function(buffer) {
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
    read: function(opts) {
      // It is assumed that app-conf is in the `node_modules`
      // directory of the owner package.
      return Bluebird.map(glob(j(opts.appDir, "config.*")), readFile);
    },
  },

  // Configuration for the whole system.
  {
    name: "system",
    read: function(opts) {
      const name = opts.name;

      return Bluebird.map(glob(j("/etc", name, "config.*")), readFile);
    },
  },

  // Configuration for the current user.
  {
    name: "global",
    read: function(opts) {
      const configDir = xdgBasedir.config;
      if (!configDir) {
        return Bluebird.resolve([]);
      }

      const name = opts.name;

      return Bluebird.map(glob(j(configDir, name, "config.*")), readFile);
    },
  },

  // Configuration of the current project (local to the file
  // hierarchy).
  {
    name: "local",
    read: function(opts) {
      const name = opts.name;

      // Compute the list of paths from the current directory to the
      // root directory.
      const paths = [];
      let dir, prev;
      dir = process.cwd();
      while (dir !== prev) {
        paths.push(j(dir, "." + name + ".*"));
        prev = dir;
        dir = resolvePath(dir, "..");
      }

      return Bluebird.map(paths.reverse(), function(path) {
        return glob(path, {
          silent: true,
        }).catch(ignoreAccessErrors);
      })
        .then(flatten)
        .map(readFile);
    },
  },
];
