'use strict'

/* eslint-env jest */

// ===================================================================

// This should be require first, otherwise fs-promise does not use it.
var mock = require('mock-fs')

var loadConfig = require('./').load

// ===================================================================

describe('appConf', function () {
  beforeAll(function () {
    mock({
      // Vendor config
      '../../config.json': mock.file({
        content: '{ "vendor": true, "foo": "vendor" }'
      }),

      // System
      '/etc/test-app-conf/config.json': mock.file({
        content: '{ "system": true, "foo": "system" }'
      }),

      // Global (user configuration)
      // TODO

      // Local
      '../.test-app-conf.json': mock.file({
        content: '{ "local.1": true, "foo": "local.1" }'
      }),
      '.test-app-conf.json': mock.file({
        content: '{ "local.0": true, "foo": "local.0" }'
      }),

      // Special vendor file to test paths resolution.
      '../../config.paths-resolution.json': mock.symlink({
        path: '/etc/paths-resolution.json'
      }),
      '/etc/paths-resolution.json': mock.file({
        content: '{ "file": "./any-file" }'
      }),
      '/etc/any-file': ''
    })
  })

  afterAll(function () {
    mock.restore()
  })

  it('#load()', function () {
    return loadConfig('test-app-conf').then(function (config) {
      expect(config).toEqual({
        'local.0': true,
        'local.1': true,
        system: true,
        vendor: true,

        foo: 'local.0',

        file: '/etc/any-file'
      })
    })
  })
})
