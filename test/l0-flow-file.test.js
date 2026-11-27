// L0 checks for spec/specs/flow-file.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { cli, flowFile, scene, tmp } from "./helpers.js";

const STEP = "steps:\n  - caption: One step.\n    focus: [developer]\n";

test("flow-file.md#B1 a flow without scene says it has no scene", () => {
  const dir = tmp();
  const f = path.join(dir, "x.flow.yaml");
  fs.writeFileSync(f, STEP);
  const r = cli([f]);
  assert.equal(r.code, 1);
  assert.match(r.err, /no scene/);
});

test("flow-file.md#B2 scene is found relative to the flow file, not the working folder", () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, "flows"));
  fs.copyFileSync(scene, path.join(dir, "d.excalidraw"));
  const f = path.join(dir, "flows", "x.flow.yaml");
  fs.writeFileSync(f, `scene: ../d.excalidraw\n${STEP}`);
  const r = cli([f, "--formats", "svg"], { cwd: tmp() });
  assert.equal(r.code, 0, r.err);
  assert.ok(fs.existsSync(path.join(dir, "flows", "x.svg")));
});

test("flow-file.md#B3 an empty steps list fails with 'a flow needs at least one step'", () => {
  const f = flowFile(tmp(), "x.flow.yaml", "steps: []\n");
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /a flow needs at least one step/);
});

test("flow-file.md#B4 a second step with no caption fails with 'step 2 has no caption'", () => {
  const f = flowFile(tmp(), "x.flow.yaml", `${STEP}  - focus: [ci]\n`);
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /step 2 has no caption/);
});

test("flow-file.md#B5 output files are named by output, else by the flow file's name", () => {
  const dir = tmp();
  const a = flowFile(dir, "a.flow.yaml", STEP);
  const b = flowFile(dir, "b.yaml", STEP);
  const c = flowFile(dir, "c.flow.yaml", `output: y\n${STEP}`);
  const r = cli([a, b, c, "--formats", "svg"]);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(fs.readdirSync(dir).filter((n) => n.endsWith(".svg")).sort(), ["a.svg", "b.svg", "y.svg"]);
});

test("flow-file.md#B6 with no formats anywhere, a flow writes exactly an SVG and an HTML file", () => {
  const dir = tmp();
  const f = flowFile(dir, "x.flow.yaml", STEP);
  const r = cli([f]);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(fs.readdirSync(dir).filter((n) => n !== "x.flow.yaml").sort(), ["x.html", "x.svg"]);
});
