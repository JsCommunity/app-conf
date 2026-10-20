"use strict";

// Uses the real file system: mock-fs does not reach child processes.

const { afterEach, beforeEach, describe, it } = require("node:test");
const assert = require("assert");
const { execFile } = require("node:child_process");
const { mkdir, mkdtemp, rm, writeFile } = require("node:fs/promises");
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

  describe("--sources", function () {
    beforeEach(async function () {
      await writeFile(join(root, "config.json"), "{}");
      await mkdir(join(root, appName));
      await writeFile(join(root, appName, "config.json.bak"), "");
      await writeFile(join(root, `.${appName}.json`), "{");
    });

    it("lists files in merge order, then env vars", async function () {
      const { code, stdout } = await run(["--sources"], {
        TEST_APP_CONF_CLI_port: "secret",
      });
      assert.strictEqual(code, 1);
      const sources = JSON.parse(stdout);
      // the message depends on the Node version
      assert.match(sources[2].reason, /JSON/);
      assert.deepStrictEqual(sources, [
        {
          entry: "vendor",
          source: join(root, "config.json"),
          status: "loaded",
        },
        {
          entry: "global",
          source: join(root, appName, "config.json.bak"),
          status: "error",
          reason: "unknown format",
        },
        {
          entry: "local",
          source: join(root, `.${appName}.json`),
          status: "error",
          reason: sources[2].reason,
        },
        { entry: "env", source: "TEST_APP_CONF_CLI_port", status: "loaded" },
      ]);
    });

    it("marks unknown formats as skipped with --ignore-unknown-formats", async function () {
      await writeFile(join(root, `.${appName}.json`), "{}");
      const { code, stdout } = await run([
        "--sources",
        "--ignore-unknown-formats",
      ]);
      assert.strictEqual(code, 0);
      assert.deepStrictEqual(JSON.parse(stdout)[1], {
        entry: "global",
        source: join(root, appName, "config.json.bak"),
        status: "skipped",
        reason: "unknown format",
      });
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
