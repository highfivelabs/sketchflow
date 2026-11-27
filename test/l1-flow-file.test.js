// L1 checks for spec/specs/flow-file.md: every key checked, errors in the
// flow's terms.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { cli, flowFile, tmp } from "./helpers.js";

const ONE = "  - caption: One step.\n";

// The flow fails with exit 1 and a message matching `want`.
function fails(body, want, args = []) {
  const dir = tmp();
  const f = flowFile(dir, "x.flow.yaml", body);
  const r = cli([f, "--formats", "svg", ...args]);
  assert.equal(r.code, 1, r.err);
  assert.match(r.err, want);
  return { dir, r };
}

test("flow-file.md#B7 an unknown top-level key fails naming it", () => {
  fails(`titel: Oops\nsteps:\n${ONE}`, /unknown key titel/);
});

test("flow-file.md#B8 an unknown key in a step fails naming the step and the key", () => {
  fails(`steps:\n${ONE}${ONE}  - caption: Three.\n    focuss: [ci]\n`, /step 3: unknown key focuss/);
});

test("flow-file.md#B9 an unknown key in a flow, a badge or a note names the entry", () => {
  fails(`steps:\n${ONE}  - caption: Two.\n    flows:\n      - {path: [developer, ci], colour: blue}\n`,
    /step 2, flow 1: unknown key colour/);
  fails("steps:\n  - caption: One.\n    badges:\n      - {at: ci, txt: hi}\n", /step 1, badge 1: unknown key txt/);
  fails("steps:\n  - caption: One.\n    write:\n      - {at: ci, text: hi, colour: red}\n", /step 1, note 1: unknown key colour/);
});

test("flow-file.md#B10 a value that is not a number, or not true, fails naming the kind", () => {
  fails(`typing: fast\nsteps:\n${ONE}`, /typing must be a number/);
  fails(`draw: soon\nsteps:\n${ONE}`, /draw must be true or a number of seconds/);
});

test("flow-file.md#B11 a value that is not a list fails naming the key", () => {
  fails(`formats: svg\nsteps:\n${ONE}`, /formats must be a list/);
  fails("steps: go\n", /steps must be a list/);
});

test("flow-file.md#B12 a zoom that is not all, a shape or shapes fails", () => {
  fails(`steps:\n${ONE}  - caption: Two.\n    zoom: 3\n`, /step 2: zoom must be all, a shape or a list of shapes/);
});

test("flow-file.md#B13 a side that is not one of the four fails", () => {
  fails("steps:\n  - caption: One.\n    badges:\n      - {at: ci, text: hi, side: middle}\n",
    /step 1, badge 1: side must be bottom, top, left or right/);
});

test("flow-file.md#B14 a path of one shape fails", () => {
  fails("steps:\n  - caption: One.\n    flows:\n      - {path: [ci]}\n", /step 1, flow 1: path needs two or more shapes/);
});

test("flow-file.md#B15 a badge with no text, or a note with no at, fails", () => {
  fails("steps:\n  - caption: One.\n    badges:\n      - {at: ci}\n", /step 1, badge 1 has no text/);
  fails("steps:\n  - caption: One.\n    write:\n      - {text: hi}\n", /step 1, note 1 has no at/);
});

test("flow-file.md#B16 a mistake fails before Chrome opens and writes nothing", () => {
  const { dir } = fails(`steps:\n${ONE}${ONE}  - caption: Three.\n    focus: [nowhere]\n`, /step 3, focus: no shape "nowhere"/,
    ["--chrome", path.join(tmp(), "no-such-chrome")]);
  assert.deepEqual(fs.readdirSync(dir), ["x.flow.yaml"]);
});

test("flow-file.md#B17 a flow that uses every key in the README's tables renders", () => {
  const dir = tmp();
  const f = flowFile(dir, "x.flow.yaml", `title: Every key
output: every
formats: [svg, html]
draw: 1
typing: 0
writing: 40
fps: 10
mp4: {width: 800}
webm: {width: 800}
gif: {width: 600, fps: 6}
steps:
  - caption: Every step key.
    seconds: 4
    zoom: [developer, ci]
    zoomPad: 30
    focus: [developer]
    flows:
      - {path: [developer, ci], label: push, color: "#2f9e44"}
      - {path: [ci, deploy agent], via: [[600, 400]]}
    badges:
      - {at: ci, text: built, side: right}
    write:
      - {at: ci, side: top, text: a note, size: 14, color: "#e8590c", when: start, keep: true}
      - {at: [100, 400], text: at a point}
  - caption: Back out.
    zoom: all
`);
  const r = cli([f]);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(fs.readdirSync(dir).filter((n) => n.startsWith("every.")).sort(), ["every.html", "every.svg"]);
});
