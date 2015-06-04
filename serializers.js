'use strict'

// ===================================================================

var findKey = require('lodash.findkey')

var stripJsonComments
try {
  stripJsonComments = require('strip-json-comments')
} catch (error) {
  stripJsonComments = function identity (val) {
    return val
  }
}

var UnknownFormatError = require('./unknown-format-error')

// ===================================================================

var serializers = Object.create(null)

serializers.json = {
  // Test whether this “file” seems to be on the correct format.
  test: function (file) {
    return (file.path && /\.json$/i.test(file.path))
  },

  // Unserialize the content of the file.
  unserialize: function (file) {
    return JSON.parse(stripJsonComments(String(file.content)))
  },

  // Serialize the value to a string/buffer.
  serialize: function (value, opts) {
    opts || (opts = {})
    var indent = 'indent' in opts ? opts.indent : 2

    return JSON.stringify(value, null, indent)
  }
}

// Optional dependency.
try {
  var ini = require('ini')

  serializers.ini = {
    test: function (file) {
      return (file.path && /\.ini$/i.test(file.path))
    },
    unserialize: function (file) {
      return ini.decode(String(file.content))
    },
    serialize: function (value) {
      return ini.encode(value)
    }
  }
} catch (error) {}

// Optional dependency.
try {
  var yaml = require('js-yaml')

  serializers.yaml = {
    test: function (file) {
      return (file.path && /\.yaml$/i.test(file.path))
    },
    unserialize: function (file) {
      return yaml.safeLoad(String(file.content))
    },
    serialize: function (value, opts) {
      opts || (opts = {})
      var indent = 'indent' in opts ? opts.indent : 2

      return yaml.safeDump(value, {
        indent: indent
      })
    }
  }
} catch (error) {}

// --------------------------------------------------------------------

var detectFormat = function (file) {
  return findKey(serializers, function (serializer) {
    return serializer.test(file)
  })
}

var serialize = function (value, format, opts) {
  var buffer = serializers[format].serialize(value, opts)

  if (!(buffer instanceof Buffer)) {
    buffer = new Buffer(buffer)
  }

  return buffer
}

var unserialize = function (file, format) {
  format || (format = detectFormat(file))

  if (!format) {
    throw new UnknownFormatError('no compatible format found for ' + file.path)
  }

  return serializers[format].unserialize(file)
}

// ===================================================================

exports.detectFormat = detectFormat
exports.serialize = serialize
exports.unserialize = unserialize
