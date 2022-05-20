#!/usr/bin/env node

"use strict";

const { env } = process;
if (env.DEBUG === undefined) {
  env.DEBUG = "*";
}

const { load, watch } = require("./index.js");
const { inspect } = require("util");

const { stdout } = process;

function print(config) {
  stdout.write(
    inspect(config, {
      colors: true,
      depth: Infinity,
      sorted: true,
    })
  );
  stdout.write("\n");
}

async function main(args) {
  if (args.length === 0 || args.some((_) => _ === "-h" || _ === "--help")) {
    const { name, version } = require("./package.json");
    return stdout.write(`Usage: ${name} [--watch | -w] <appName> [<appDir>]

${name} v${version}
`);
  }

  const watchChanges = args[0] === "--watch" || args[0] === "-w";
  if (watchChanges) {
    args.shift();
  }

  const [appName, appDir] = args;

  const opts = { appDir, appName, ignoreUnknownFormats: true };

  if (watchChanges) {
    await watch(opts, (error, config) => {
      console.log("--", new Date());
      if (error !== undefined) {
        console.warn(error);
        return;
      }
      print(config);
    });
  } else {
    print(await load(appName, opts));
  }
}
main(process.argv.slice(2)).catch(console.error.bind(console, "FATAL:"));
