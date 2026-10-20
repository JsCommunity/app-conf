"use strict";

// ===================================================================

const entries = require("./_entries");
const pMap = require("./_pMap");

// ===================================================================

function deriveEnvPrefix(appName) {
  return appName.toUpperCase().replace(/[^A-Z0-9]/g, "_") + "_";
}

// ===================================================================

// Lists the config files of the entries in `whitelist` (a Set, all entries if
// undefined), in merge order.
exports.listFiles = async function listFiles({ appDir, appName }, whitelist) {
  const entryOpts = { appDir, appName };
  const files = await pMap(entries, async (entry) => {
    if (whitelist !== undefined && !whitelist.has(entry.name)) {
      return [];
    }

    const dirFn = entry.dir;
    const dir = typeof dirFn === "function" ? dirFn(entryOpts) : dirFn;
    const paths = (await entry.list(entryOpts, dir)) || [];
    return paths.map((path) => ({ entry: entry.name, path }));
  });
  return files.flat();
};

// Lists the env vars overriding the config, as `{ name, keys, value }`.
exports.listEnvVars = function listEnvVars({ appName, envPrefix }, whitelist) {
  if (
    envPrefix === false ||
    (whitelist !== undefined && !whitelist.has("env"))
  ) {
    return [];
  }

  const prefix = envPrefix !== undefined ? envPrefix : deriveEnvPrefix(appName);
  const vars = [];
  for (const [name, value] of Object.entries(process.env)) {
    if (!name.startsWith(prefix)) continue;
    const keys = name.slice(prefix.length).split("__");
    if (keys.some((_) => _ === "")) continue;
    vars.push({ name, keys, value });
  }
  return vars;
};
