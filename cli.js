#!/usr/bin/env node

"use strict";

const { load } = require("./index.js");
const { inspect } = require("util");

async function main(args) {
  const { stdout } = process;

  if (args.length === 0 || args.some((_) => _ === "-h" || _ === "--help")) {
    const { name, version } = require("./package.json");
    return stdout.write(`Usage: ${name} <appName> [<appDir>]

${name} v${version}
`);
  }

  const [appName, appDir] = args;

  stdout.write(
    inspect(
      await load(appName, {
        appDir,

        // ignore vendor config (not relevant for this CLI)
        entries:
          appDir === undefined ? ["system", "global", "local"] : undefined,

        ignoreUnknownFormats: true,
      }),
      { colors: true, depth: Infinity, sorted: true }
    )
  );
  stdout.write("\n");
}
main(process.argv.slice(2)).catch(console.error.bind(console, "FATAL:"));
