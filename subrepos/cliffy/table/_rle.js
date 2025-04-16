// https://deno.land/std@0.196.0/assert/assertion_error.ts
var AssertionError = class extends Error {
  name = "AssertionError";
  constructor(message) {
    super(message);
  }
};

// https://deno.land/std@0.196.0/assert/assert.ts
function assert(expr, msg = "") {
  if (!expr) {
    throw new AssertionError(msg);
  }
}

// https://deno.land/std@0.196.0/console/_rle.ts
function runLengthEncode(arr) {
  const data = [];
  const runLengths = [];
  let prev = Symbol("none");
  for (const x of arr) {
    if (x === prev) {
      ++runLengths[runLengths.length - 1];
    } else {
      prev = x;
      data.push(x);
      runLengths.push(1);
    }
  }
  assert(runLengths.every((r) => r < 256));
  return {
    d: btoa(String.fromCharCode(...data)),
    r: btoa(String.fromCharCode(...runLengths))
  };
}
function runLengthDecode({ d, r }) {
  const data = atob(d);
  const runLengths = atob(r);
  let out = "";
  for (const [i, ch] of [...runLengths].entries()) {
    out += data[i].repeat(ch.codePointAt(0));
  }
  return Uint8Array.from([...out].map((x) => x.codePointAt(0)));
}
export {
  runLengthDecode,
  runLengthEncode
};
