"use strict";

// This should be require first, otherwise fs-promise does not use it.
const mock = require("mock-fs");

const { afterEach, beforeEach, describe, it } = require("tap").mocha;
const assert = require("assert");
const homedir = require("os").homedir;

const loadConfig = require("./").load;

// ===================================================================

describe("appConf", function () {
  beforeEach(function () {
    mock({
      // Vendor config
      "../../config.json": '{ "vendor": true, "foo": "vendor" }',

      // System
      "/etc/test-app-conf/config.json": '{ "system": true, "foo": "system" }',

      // Global (user configuration)
      // TODO

      // Local
      "../.test-app-conf.json": '{ "local.1": true, "foo": "local.1" }',
      ".test-app-conf.json": '{ "local.0": true, "foo": "local.0" }',

      // Special vendor file to test paths resolution.
      "../../config.paths-resolution.json": mock.symlink({
        path: "/etc/paths-resolution.json",
      }),
      "/etc/paths-resolution.json": JSON.stringify({
        pathWithCurrent: "./foo",
        pathWithHome: "~/bar",
        pathWithParent: "../baz",
      }),
    });
  });

  afterEach(function () {
    mock.restore();
  });

  describe("#load()", function () {
    it("works", function () {
      return loadConfig("test-app-conf").then(function (config) {
        assert.deepStrictEqual(config, {
          "local.0": true,
          "local.1": true,
          system: true,
          vendor: true,

          foo: "local.0",

          pathWithCurrent: "/etc/foo",
          pathWithHome: homedir() + "/bar",
          pathWithParent: "/baz",
        });
      });
    });

    it("can load only specific entries", function () {
      return loadConfig("test-app-conf", {
        entries: ["local", "system"],
      }).then(function (config) {
        assert.deepStrictEqual(config, {
          "local.0": true,
          "local.1": true,
          system: true,

          // merging order is still the same though
          foo: "local.0",
        });
      });
    });
  });
});
