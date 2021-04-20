"use strict";

// ===================================================================

const findKey = require("lodash/findKey");

const formatJson = JSON.stringify;
const parseJson = (function () {
  try {
    // eslint-disable-next-line node/no-extraneous-require
    return require("json5").parse;
  } catch (_) {}

  try {
    // eslint-disable-next-line node/no-extraneous-require
    const stripJsonComments = require("strip-json-comments");
    return function parseJson(json) {
      return JSON.parse(stripJsonComments(json));
    };
  } catch (_) {}

  return JSON.parse;
})();

const UnknownFormatError = require("./unknown-format-error");

// ===================================================================

const serializers = Object.create(null);

serializers.json = {
  // Test whether this “file” seems to be on the correct format.
  test: function (file) {
    return file.path && /\.json5?$/i.test(file.path);
  },

  // Unserialize the content of the file.
  unserialize: function (file) {
    return parseJson(String(file.content));
  },

  // Serialize the value to a string/buffer.
  serialize: function (value, opts) {
    opts || (opts = {});
    const indent = "indent" in opts ? opts.indent : 2;

    return formatJson(value, null, indent);
  },
};

// Optional dependency.
try {
  // eslint-disable-next-line node/no-missing-require
  const ini = require("ini");

  serializers.ini = {
    test: function (file) {
      return file.path && /\.ini$/i.test(file.path);
    },
    unserialize: function (file) {
      return ini.decode(String(file.content));
    },
    serialize: function (value) {
      return ini.encode(value);
    },
  };
} catch (error) {}

try {
  // eslint-disable-next-line node/no-missing-require
  const { parse, stringify } = require("@iarna/toml");

  serializers.toml = {
    serialize: stringify,
    test: ({ path }) => path !== undefined && /\.toml$/i.test(path),
    unserialize: ({ content }) => parse(String(content)),
  };
} catch (error) {}

// Optional dependency.
try {
  // eslint-disable-next-line node/no-extraneous-require
  const yaml = require("js-yaml");

  let { dump, load } = yaml;

  // compat with js-yaml < 4
  if ("DEFAULT_SAFE_SCHEMA" in yaml) {
    dump = yaml.safeDump;
    load = yaml.safeLoad;
  }

  serializers.yaml = {
    test: function (file) {
      return file.path && /\.yaml$/i.test(file.path);
    },
    unserialize: function (file) {
      return load(String(file.content));
    },
    serialize: function (value, opts) {
      opts || (opts = {});
      const indent = "indent" in opts ? opts.indent : 2;

      return dump(value, {
        indent: indent,
      });
    },
  };
} catch (error) {}

// --------------------------------------------------------------------

const detectFormat = function (file) {
  return findKey(serializers, function (serializer) {
    return serializer.test(file);
  });
};

const serialize = function (value, format, opts) {
  let buffer = serializers[format].serialize(value, opts);

  if (!(buffer instanceof Buffer)) {
    buffer = Buffer.from(buffer);
  }

  return buffer;
};

const unserialize = function (file, format) {
  format || (format = detectFormat(file));

  if (!format) {
    throw new UnknownFormatError("no compatible format found for " + file.path);
  }

  return serializers[format].unserialize(file);
};

// ===================================================================

exports.detectFormat = detectFormat;
exports.serialize = serialize;
exports.unserialize = unserialize;
