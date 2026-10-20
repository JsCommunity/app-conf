"use strict";

// Parses a value given as a string, as JSON if prefixed by `json:`; `name`
// identifies its origin in the error.
module.exports = function parseValue(name, value) {
  if (!value.startsWith("json:")) {
    return value;
  }
  try {
    return JSON.parse(value.slice(5));
  } catch (cause) {
    throw new Error("invalid JSON in " + name, { cause });
  }
};
