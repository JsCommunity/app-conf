"use strict";

/* eslint-env jest */

// ===================================================================

// This should be require first, otherwise fs-promise does not use it.
const mock = require("mock-fs");

const homedir = require("os").homedir;

const loadConfig = require("./").load;

// ===================================================================

describe("appConf", function() {
  beforeAll(function() {
    const unreadable = mock.file({
      content: "",
      mode: 0,
    });

    mock({
      // Vendor config
      "../../config.json": '{ "vendor": true, "foo": "vendor" }',
      "../../config.unreadable.json": unreadable,

      // System
      "/etc/test-app-conf/config.json": '{ "system": true, "foo": "system" }',
      "/etc/test-app-conf/config.unreadable.json": unreadable,

      // Global (user configuration)
      // TODO

      // Local
      "../.test-app-conf.json": '{ "local.1": true, "foo": "local.1" }',
      ".test-app-conf.json": '{ "local.0": true, "foo": "local.0" }',
      ".test-app-conf.unreadable.json": unreadable,

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

  afterAll(function() {
    mock.restore();
  });

  it("#load()", function() {
    return loadConfig("test-app-conf").then(function(config) {
      expect(config).toEqual({
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
});
