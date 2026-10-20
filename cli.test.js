"use strict";

// Uses the real file system: mock-fs does not reach child processes.

const { afterEach, beforeEach, describe, it } = require("node:test");
const assert = require("assert");
const { execFile } = require("node:child_process");
const { mkdtemp, rm, writeFile } = require("node:fs/promises");
const { tmpdir } = require("os");
const { join } = require("path");

// ===================================================================

const appName = "test-app-conf-cli";
const cliPath = join(__dirname, "cli.js");

describe("cli", function () {
  let root;
  beforeEach(async function () {
    root = await mkdtemp(join(tmpdir(), "app-conf-"));
  });
  afterEach(async function () {
    await rm(root, { recursive: true });
  });

  // Runs the CLI with `root` as app dir, cwd and XDG config home.
  function run(args, env = {}) {
    return new Promise((resolve) => {
      execFile(
        process.execPath,
        [cliPath, ...args, appName, root],
        {
          cwd: root,
          env: { ...process.env, DEBUG: "", XDG_CONFIG_HOME: root, ...env },
        },
        (error, stdout, stderr) => {
          resolve({ code: error?.code ?? 0, stdout, stderr });
        },
      );
    });
  }

  it("exits with 1 on failure", async function () {
    await writeFile(join(root, "config.json"), "{");
    const { code, stderr } = await run([]);
    assert.strictEqual(code, 1);
    assert.match(stderr, /FATAL/);
  });

  describe("unknown formats", function () {
    beforeEach(async function () {
      await writeFile(join(root, "config.json"), '{ "port": 80 }');
      await writeFile(join(root, "config.json.bak"), "");
    });

    it("fail like the library does by default", async function () {
      const { code, stderr } = await run([]);
      assert.strictEqual(code, 1);
      assert.match(
        stderr,
        /no compatible format found for .*config\.json\.bak/,
      );
    });

    it("are skipped with --ignore-unknown-formats", async function () {
      const { code, stdout } = await run(["--ignore-unknown-formats"]);
      assert.strictEqual(code, 0);
      assert.deepStrictEqual(JSON.parse(stdout), { port: 80 });
    });
  });

  describe("-p", function () {
    beforeEach(async function () {
      await writeFile(
        join(root, "config.json"),
        '{ "db": { "host": "h", "pool": 2 }, "port": 80 }',
      );
    });

    it("fails on a missing path", async function () {
      const { code, stderr } = await run(["-p", "db.nope"]);
      assert.strictEqual(code, 1);
      assert.match(stderr, /no value at db\.nope/);
    });

    it("supports dotted paths when repeated", async function () {
      const { stdout } = await run(["-p", "db.pool", "-p", "port"]);
      assert.deepStrictEqual(JSON.parse(stdout), { "db.pool": 2, port: 80 });
    });
  });
});
