"use strict";

// ===================================================================

const j = require("path").join;
const resolvePath = require("path").resolve;

const { readdir, stat } = require("node:fs/promises");
const { homedir } = require("os");

const pMap = require("./_pMap");

// ===================================================================

// Lists the files in `dir` whose name starts with `prefix`.
async function listFiles(dir, prefix) {
  let names;
  try {
    names = await readdir(dir);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      return [];
    }
    throw error;
  }

  // libuv sorts on Unix but not on Windows, sort for a merge order everywhere
  const paths = names
    .filter((name) => name.startsWith(prefix))
    .sort()
    .map((name) => j(dir, name));
  const isFile = await pMap(paths, (path) =>
    stat(path).then(
      (stats) => stats.isFile(),
      // broken symlink
      (error) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
        return false;
      },
    ),
  );
  return paths.filter((_, i) => isFile[i]);
}

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
    list: (_, dir) => dir && listFiles(dir, "config."),
  },

  // Configuration for the whole system.
  {
    name: "system",
    dir: (opts) => j("/etc", opts.appName),
    list: (_, dir) => listFiles(dir, "config."),
  },

  // Configuration for the current user.
  {
    name: "global",
    dir: (opts) => {
      const configDir =
        process.platform === "win32"
          ? process.env.APPDATA
          : process.env.XDG_CONFIG_HOME || j(homedir(), ".config");
      return configDir && j(configDir, opts.appName);
    },
    list: (_, dir) => dir && listFiles(dir, "config."),
  },

  // Configuration of the current project (local to the file
  // hierarchy).
  {
    name: "local",
    list(opts) {
      const { appName } = opts;

      // Compute the list of directories from the current directory to the
      // root directory.
      const dirs = [];
      let dir, prev;
      dir = process.cwd();
      while (dir !== prev) {
        dirs.push(dir);
        prev = dir;
        dir = resolvePath(dir, "..");
      }

      return pMap(dirs.reverse(), (dir) =>
        listFiles(dir, "." + appName + ".").catch(ignoreAccessErrors),
      ).then((results) => results.flat());
    },
  },
];
