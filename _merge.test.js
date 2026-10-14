"use strict";

const assert = require("assert").strict;
const test = require("node:test");

const merge = require("./_merge.js");

Object.entries({
  "source value takes precedence": ["foo", "bar", "bar"],
  "undefined in source is ignored": ["foo", undefined, "foo"],
  "if both are objects, enumerable properties on source are assigned to target":
    [
      { foo: "source", bar: "source" },
      Object.defineProperties(
        { bar: "target" },
        {
          baz: {
            value: "target",
          },
          qux: {
            enumerable: true,
            get() {
              return "target";
            },
          },
        },
      ),
      { foo: "source", bar: "target", qux: "target" },
    ],
  "merging arrays works like objects": [
    ["source", "source"],
    [undefined, "target"],
    ["source", "target"],
  ],
  "an array can be merged into an object": [
    { 1: "target" },
    ["source"],
    { 0: "source", 1: "target" },
  ],
  "an object can be merged into an array": [
    ["target"],
    { 1: "source" },
    ["target", "source"],
  ],
}).forEach(([title, data]) => {
  test(title, function () {
    const [target, source, expected] = data;
    assert.deepEqual(merge(target, source), expected);
  });
});

test("null-prototype objects are merged", function () {
  const source = Object.assign(Object.create(null), { foo: "source" });
  assert.deepEqual(merge({ bar: "target" }, source), {
    bar: "target",
    foo: "source",
  });
});

test("non-plain objects are replaced, not merged", function () {
  const target = new Date(0);
  const source = new Date(1e12);
  assert.equal(merge({ d: target }, { d: source }).d, source);
});

test("__proto__ in source does not pollute Object.prototype", function () {
  merge({}, JSON.parse('{ "__proto__": { "polluted": true } }'));
  assert.equal({}.polluted, undefined);
});
