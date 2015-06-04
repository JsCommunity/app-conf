'use strict'

// ===================================================================

var appconf = require('./')

// ===================================================================

appconf.load('my-application').then(function (config) {
  console.log(config)
})
