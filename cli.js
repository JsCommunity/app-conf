#!/usr/bin/env node

"use strict";

const { load } = require("./index.js");
const { inspect } = require("util");

function deepSortObjects(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(deepSortObjects);
  }

  const result = {};
  for (const key of Object.keys(value).sort()) {
    result[key] = deepSortObjects(value[key]);
  }
  return result;
}

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
      deepSortObjects(
        await load(appName, {
          appDir,

          // ignore vendor config (not relevant for this CLI)
          entries:
            appDir === undefined ? ["system", "global", "local"] : undefined,

          ignoreUnknownFormats: true,
        })
      ),
      { depth: Infinity, colors: true }
    )
  );
  stdout.write("\n");
}
main(process.argv.slice(2)).catch(console.error.bind(console, "FATAL:"));
