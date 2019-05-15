"use strict";

/* eslint-env jest */

// ===================================================================

// This should be require first, otherwise fs-promise does not use it.
const mock = require("mock-fs");

const homedir = require("os").homedir;

const loadConfig = require("./").load;

// ===================================================================

describe("appConf.load()", function() {
  beforeAll(function() {
    mock({
      // Vendor
      "../../config.json": mock.file({
        content: '{ "vendor": true, "foo": "vendor" }',
      }),
      "../../production.config.json": mock.file({
        content: '{ "production.vendor": true }',
      }),

      // System
      "/etc/test-app-conf/config.json": mock.file({
        content: '{ "system": true, "foo": "system" }',
      }),
      "/etc/test-app-conf/production.config.json": mock.file({
        content: '{ "production.system": true }',
      }),

      // Global (user configuration)
      // TODO

      // Local
      "../.test-app-conf.json": mock.file({
        content: '{ "local.1": true, "foo": "local.1" }',
      }),
      "../.production.test-app-conf.json": mock.file({
        content: '{ "production.local.1": true }',
      }),
      ".test-app-conf.json": mock.file({
        content: '{ "local.0": true, "foo": "local.0" }',
      }),
      ".production.test-app-conf.json": mock.file({
        content: '{ "production.local.0": true }',
      }),

      // Special vendor file to test paths resolution.
      "../../config.paths-resolution.json": mock.symlink({
        path: "/etc/paths-resolution.json",
      }),
      "/etc/paths-resolution.json": mock.file({
        content: JSON.stringify({
          pathWithCurrent: "./foo",
          pathWithHome: "~/bar",
          pathWithParent: "../baz",
        }),
      }),
    });
  });

  afterAll(function() {
    mock.restore();
  });

  it("loads and merges the config files", function() {
    return loadConfig("test-app-conf").then(function(config) {
      expect(config).toEqual({
        "local.0": true,
        "local.1": true,
        system: true,
        vendor: true,

        foo: "local.0",

        file: "/etc/any-file",
      });
    });
  });

  it("supports environments", function() {
    process.env.APP_CONF_ENV = "production";
    return loadConfig("test-app-conf").then(function(config) {
      delete process.env.APP_CONF_ENV;
      expect(config).toEqual({
        "local.0": true,
        "production.local.0": true,
        "local.1": true,
        "production.local.1": true,
        system: true,
        "production.system": true,
        vendor: true,
        "production.vendor": true,

        foo: "local.0",

        pathWithCurrent: "/etc/foo",
        pathWithHome: homedir() + "/bar",
        pathWithParent: "/baz",
      });
    });
  });
});
