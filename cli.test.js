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
});
