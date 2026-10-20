#!/usr/bin/env node

"use strict";

const { env } = process;
if (env.DEBUG === undefined) {
  env.DEBUG = "*";
}

const { load, parse, UnknownFormatError, watch } = require("./index.js");
const entries = require("./_entries.js");
const parseValue = require("./_parseValue.js");
const pMap = require("./_pMap.js");
const { listEnvVars, listFiles } = require("./_sources.js");
const { mkdir, readFile, unlink, writeFile } = require("node:fs/promises");
const { join } = require("path");
const { inspect } = require("util");

const { stdout } = process;

let useJson = !stdout.isTTY;

function getPath(config, path) {
  const value = path.split(".").reduce((o, k) => o?.[k], config);
  if (value === undefined) {
    throw new Error("no value at " + path);
  }
  return value;
}

function print(paths, config) {
  if (paths.length !== 0) {
    config =
      paths.length === 1
        ? getPath(config, paths[0])
        : Object.fromEntries(paths.map((p) => [p, getPath(config, p)]));
  }

  stdout.write(
    useJson
      ? JSON.stringify(config, null, 2)
      : inspect(config, {
          colors: true,
          depth: Infinity,
          sorted: true,
        }),
  );
  stdout.write("\n");
}

// Written by --set in the global entry, its name sorts after the other config
// files so it is merged last.
const OVERRIDE_FILE = "config.~override.json";

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function splitPath(path) {
  const keys = path.split(".");
  if (keys.some((key) => key === "" || key === "__proto__")) {
    throw new Error("invalid path: " + path);
  }
  return keys;
}

// Missing or non-object intermediate values are replaced by objects.
function setPath(obj, keys, value) {
  const last = keys.length - 1;
  for (let i = 0; i < last; i++) {
    const key = keys[i];
    if (!Object.hasOwn(obj, key) || !isPlainObject(obj[key])) {
      obj[key] = {};
    }
    obj = obj[key];
  }
  obj[keys[last]] = value;
}

// Deletes the value at `keys` and the objects it leaves empty.
function unsetPath(obj, [key, ...rest]) {
  if (!Object.hasOwn(obj, key)) {
    return;
  }
  if (rest.length !== 0) {
    const child = obj[key];
    if (!isPlainObject(child)) {
      return;
    }
    unsetPath(child, rest);
    if (Object.keys(child).length !== 0) {
      return;
    }
  }
  delete obj[key];
}

// Applies `writes` to the override file, which is deleted when empty.
async function writeOverrides(appName, writes) {
  const dir = entries.find((_) => _.name === "global").dir({ appName });
  if (dir === undefined) {
    throw new Error("the user config directory is unknown");
  }
  const file = join(dir, OVERRIDE_FILE);

  let config = {};
  try {
    config = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new Error("failed to read " + file, { cause: error });
    }
  }
  if (!isPlainObject(config)) {
    throw new Error(file + " does not contain an object");
  }

  writes.forEach((write) => write(config));

  if (Object.keys(config).length === 0) {
    try {
      await unlink(file);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    stdout.write("deleted " + file + "\n");
  } else {
    await mkdir(dir, { recursive: true });
    await writeFile(file, JSON.stringify(config, null, 2) + "\n");
    stdout.write("written " + file + "\n");
  }
}

// Prints the sources load() reads, in merge order, without env var values.
async function printSources(opts) {
  const sources = await pMap(listFiles(opts), async ({ entry, path }) => {
    try {
      await parse(path);
      return { entry, source: path, status: "loaded" };
    } catch (error) {
      const unknownFormat = error instanceof UnknownFormatError;
      return {
        entry,
        source: path,
        status:
          unknownFormat && opts.ignoreUnknownFormats ? "skipped" : "error",
        reason: unknownFormat
          ? "unknown format"
          : (error.cause ?? error).message,
      };
    }
  });
  for (const { name } of listEnvVars(opts)) {
    sources.push({ entry: "env", source: name, status: "loaded" });
  }

  if (sources.some((_) => _.status === "error")) {
    process.exitCode = 1;
  }

  stdout.write(
    useJson
      ? JSON.stringify(sources, null, 2) + "\n"
      : sources
          .map(
            ({ entry, source, status, reason }) =>
              entry.padEnd(7) +
              source +
              (status === "loaded" ? "" : `  (${status}: ${reason})`) +
              "\n",
          )
          .join(""),
  );
}

async function main(args) {
  const cliOpts = {
    _: [],
    envPrefix: undefined,
    help: false,
    ignoreUnknownFormats: false,
    paths: [],
    sources: false,
    watch: false,
    writes: [],
  };
  for (let i = 0, n = args.length; i < n;) {
    const arg = args[i++];
    if (arg[0] === "-") {
      if (arg === "-h" || arg === "--help") {
        cliOpts.help = true;
      } else if (arg === "-j" || arg === "--json") {
        useJson = true;
      } else if (arg === "-w" || arg === "--watch") {
        cliOpts.watch = true;
      } else if (arg === "--set" || arg === "--unset") {
        if (i === n) {
          throw new Error(`missing argument for ${arg} option`);
        }
        const value = args[i++];
        if (arg === "--unset") {
          const keys = splitPath(value);
          cliOpts.writes.push((config) => unsetPath(config, keys));
        } else {
          const j = value.indexOf("=");
          if (j === -1) {
            throw new Error("missing = in --set " + value);
          }
          const keys = splitPath(value.slice(0, j));
          const parsed = parseValue("--set " + value, value.slice(j + 1));
          cliOpts.writes.push((config) => setPath(config, keys, parsed));
        }
      } else if (arg === "--sources") {
        cliOpts.sources = true;
      } else if (arg === "--ignore-unknown-formats") {
        cliOpts.ignoreUnknownFormats = true;
      } else if (arg === "--no-env") {
        cliOpts.envPrefix = false;
      } else if (arg === "--env-prefix") {
        if (i < n) {
          cliOpts.envPrefix = args[i++];
        } else {
          throw new Error("missing argument for --env-prefix option");
        }
      } else if (arg === "-p" || arg === "--path") {
        if (i < n) {
          cliOpts.paths.push(args[i++]);
        } else {
          throw new Error("missing argument for --path option");
        }
      } else {
        throw new Error("unknown option: " + arg);
      }
    } else {
      cliOpts._.push(arg);
    }
  }

  if (cliOpts._.length === 0 || cliOpts.help) {
    const { name, version } = require("./package.json");
    return stdout.write(`Usage: ${name} [--json | -j] [--watch | -w] [--env-prefix <prefix> | --no-env] [--ignore-unknown-formats] [--sources | -p <path>...] <appName> [<appDir>]
       ${name} (--set <path>=<value> | --unset <path>)... <appName>

${name} v${version}
`);
  }

  const [appName, appDir] = cliOpts._;

  const opts = {
    appDir,
    appName,
    envPrefix: cliOpts.envPrefix,
    ignoreUnknownFormats: cliOpts.ignoreUnknownFormats,
    initialLoad: true,
  };
  const printPaths = print.bind(undefined, cliOpts.paths);

  if (cliOpts.writes.length !== 0) {
    if (cliOpts.paths.length !== 0 || cliOpts.sources || cliOpts.watch) {
      throw new Error(
        "--set and --unset cannot be combined with -p, --sources or --watch",
      );
    }
    await writeOverrides(appName, cliOpts.writes);
  } else if (cliOpts.sources) {
    await printSources(opts);
  } else if (cliOpts.watch) {
    await watch(opts, (error, config) => {
      console.log("--", new Date());
      if (error !== undefined) {
        console.warn(error);
        return;
      }
      try {
        printPaths(config);
      } catch (error) {
        console.warn(error.message);
      }
    });
  } else {
    printPaths(await load(appName, opts));
  }
}
main(process.argv.slice(2)).catch((error) => {
  console.error("FATAL:", error);
  process.exitCode = 1;
});
