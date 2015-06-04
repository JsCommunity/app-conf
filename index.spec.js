'use strict'

/* eslint-env mocha */

// ===================================================================

var loadConfig = require('./').load

var mock = require('mock-fs')

// ===================================================================

describe('appConf', function () {
  before(function () {
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
      })
    })
  })

  after(function () {
    mock.restore()
  })

  it('#load()', function () {
    return loadConfig('test-app-conf').then(function (config) {
      config.must.eql({
        'local.0': true,
        'local.1': true,
        system: true,
        vendor: true,

        foo: 'local.0'
      })
    })
  })
})
