"use strict";

// Uses the real file system: mock-fs does not support fs.watch.

const { afterEach, beforeEach, describe, it } = require("node:test");
const assert = require("assert");
const { mkdir, mkdtemp, rm, unlink, writeFile } = require("node:fs/promises");
const { tmpdir } = require("os");
const { join } = require("path");
const { setTimeout: delay } = require("timers/promises");

const { watch } = require(".");

// ===================================================================

const appName = "test-app-conf-watch";

// longer than the debounce delay
const SETTLE_DELAY = 500;

describe("watch()", function () {
  let globalDir, root, savedXdg, unsubscribe, vendorDir;
  beforeEach(async function () {
    root = await mkdtemp(join(tmpdir(), "app-conf-"));
    globalDir = join(root, "xdg", appName);
    vendorDir = join(root, "vendor");
    await mkdir(globalDir, { recursive: true });
    await mkdir(vendorDir);

    savedXdg = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = join(root, "xdg");
  });
  afterEach(async function () {
    await unsubscribe?.();
    unsubscribe = undefined;
    if (savedXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = savedXdg;
    await rm(root, { recursive: true });
  });

  // Starts watching and records every callback call.
  async function startWatching(opts) {
    const calls = [];
    unsubscribe = await watch({ appName, ...opts }, (error, config) => {
      calls.push({ error, config });
    });
    return calls;
  }

  it("calls back with the initial config when initialLoad is set", async function () {
    await writeFile(join(globalDir, "config.json"), '{ "foo": "global" }');
    const calls = await startWatching({ initialLoad: true });
    assert.deepStrictEqual(calls, [
      { error: undefined, config: { foo: "global" } },
    ]);
  });

  it("only loads the requested entries", async function () {
    await writeFile(join(vendorDir, "config.json"), '{ "vendor": true }');
    await writeFile(join(globalDir, "config.json"), '{ "global": true }');
    const calls = await startWatching({
      appDir: vendorDir,
      entries: ["global"],
      initialLoad: true,
    });
    assert.deepStrictEqual(calls[0].config, { global: true });
  });

  it("uses defaults when vendor is not watched", async function () {
    await writeFile(join(globalDir, "config.json"), '{ "global": true }');
    const calls = await startWatching({
      defaults: { foo: "default" },
      entries: ["global"],
      initialLoad: true,
    });
    assert.deepStrictEqual(calls[0].config, { foo: "default", global: true });
  });

  it("reloads once for a burst of changes", async function () {
    const calls = await startWatching({});
    // chokidar 5.0.0 emits ready before watching all dirs when one does not exist
    await delay(100);
    await Promise.all([
      writeFile(join(globalDir, "config.json"), '{ "a": 1 }'),
      writeFile(join(globalDir, "config.2.json"), '{ "b": 2 }'),
    ]);
    await delay(SETTLE_DELAY);
    assert.deepStrictEqual(calls, [
      { error: undefined, config: { a: 1, b: 2 } },
    ]);
  });

  it("keeps the vendor config after it is deleted", async function () {
    const vendorFile = join(vendorDir, "config.json");
    await writeFile(vendorFile, '{ "vendor": true }');
    const calls = await startWatching({ appDir: vendorDir });
    await unlink(vendorFile);
    await writeFile(join(globalDir, "config.json"), '{ "global": true }');
    await delay(SETTLE_DELAY);
    assert.deepStrictEqual(calls.at(-1).config, { global: true, vendor: true });
  });

  it("stops calling back once unsubscribed", async function () {
    const calls = await startWatching({});
    await unsubscribe();
    unsubscribe = undefined;
    await writeFile(join(globalDir, "config.json"), '{ "foo": "global" }');
    await delay(SETTLE_DELAY);
    assert.deepStrictEqual(calls, []);
  });

  it("rejects when the initial load fails", async function () {
    await writeFile(join(globalDir, "config.json"), "{ invalid");
    await assert.rejects(
      startWatching({ initialLoad: true }),
      /failed to parse/,
    );
  });
});
