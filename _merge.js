"use strict";

module.exports = function merge(target, source) {
  if (source === undefined) {
    return target;
  }

  if (
    target === null ||
    source === null ||
    typeof target !== "object" ||
    typeof source !== "object"
  ) {
    return source;
  }

  for (const key of Object.keys(source)) {
    // JSON.parse creates an own __proto__ key, merging it would pollute Object.prototype
    if (key !== "__proto__") {
      target[key] = merge(target[key], source[key]);
    }
  }
  return target;
};
