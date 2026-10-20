#!/usr/bin/env node

"use strict";

const { env } = process;
if (env.DEBUG === undefined) {
  env.DEBUG = "*";
}

const { load, parse, UnknownFormatError, watch } = require("./index.js");
const pMap = require("./_pMap.js");
const { listEnvVars, listFiles } = require("./_sources.js");
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

  if (cliOpts.sources) {
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
