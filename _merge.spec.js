"use strict";

const t = require("tap");
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
        }
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
  t.test(title, function (t) {
    const [target, source, expected] = data;
    t.strictSame(merge(target, source), expected);
    t.end();
  });
});
