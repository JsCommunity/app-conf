"use strict";

// only arrays and plain objects are merged, others (Date, class instances…) are replaced
function isMergeable(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return Array.isArray(value) || proto === Object.prototype || proto === null;
}

module.exports = function merge(target, source) {
  if (source === undefined) {
    return target;
  }

  if (!isMergeable(target) || !isMergeable(source)) {
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
