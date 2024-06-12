"use strict";

const promisify = require("promise-toolbox/promisify");

const fs$readFile = promisify(require("fs").readFile);
const realpath = promisify(require("fs").realpath);

module.exports = function readFile(path) {
  return realpath(path).then(function (path) {
    return fs$readFile(path).then(function (buffer) {
      return {
        path,
        content: buffer,
      };
    });
  });
};
