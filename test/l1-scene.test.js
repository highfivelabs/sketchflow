// L1 checks for spec/specs/scene.md: naming shapes and finding arrows.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { cli, flowFile, scene, tmp } from "./helpers.js";

// A small scene of its own: shapes and texts built like Excalidraw's.
const base = { angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2,
  strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, seed: 1, version: 1, versionNonce: 1,
  isDeleted: false, boundElements: [], updated: 1, link: null, locked: false };
const shape = (type, id, x, y, w = 160, h = 80, more = {}) =>
  ({ ...base, roundness: null, type, id, x, y, width: w, height: h, ...(type === "frame" ? { name: null } : {}), ...more });
const text = (id, s, x, y, more = {}) =>
  ({ ...base, roundness: null, type: "text", id, x, y, width: 9 * s.length, height: 23, text: s, originalText: s,
    fontSize: 18, fontFamily: 5, textAlign: "left", verticalAlign: "top", containerId: null, lineHeight: 1.25, autoResize: true, ...more });

function own(elements, steps) {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "d.excalidraw"), JSON.stringify({ type: "excalidraw", version: 2, source: "https://excalidraw.com",
    appState: { viewBackgroundColor: "#ffffff" }, elements, files: {} }));
  const f = path.join(dir, "x.flow.yaml");
  fs.writeFileSync(f, `scene: d.excalidraw\nsteps:\n${steps}`);
  return { dir, f };
}
const svgs = (dir) => fs.readdirSync(dir).filter((n) => n.endsWith(".svg"));

// Render the deploy example's diagram with one step zoomed on `name`.
function zoomed(name) {
  const dir = tmp();
  const f = flowFile(dir, "x.flow.yaml", `steps:\n  - caption: One step.\n    zoom: [${JSON.stringify(name)}]\n`);
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 0, r.err);
  return fs.readFileSync(path.join(dir, "x.svg"), "utf8");
}

test("scene.md#B1 a rectangle, an ellipse, a diamond and a frame are named by their labels", () => {
  const { dir, f } = own([
    shape("rectangle", "r", 0, 0), text("rt", "box", 20, 20),
    shape("ellipse", "e", 220, 0), text("et", "oval", 260, 28),
    shape("diamond", "d", 440, 0), text("dt", "gem", 490, 28),
    shape("frame", "fr", 0, 160, 300, 160), text("ft", "area", 20, 180),
  ], "  - caption: All four.\n    focus: [box, oval, gem, area]\n");
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(svgs(dir), ["x.svg"]);
});

test("scene.md#B2 a deleted shape's label names nothing", () => {
  const { f } = own([
    shape("rectangle", "r", 0, 0), text("rt", "kept", 20, 20),
    shape("rectangle", "gone", 220, 0, 160, 80, { isDeleted: true }), text("gt", "gone box", 240, 20),
  ], "  - caption: The gone one.\n    focus: [gone box]\n");
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /no shape "gone box"/);
});

test("scene.md#B3 text bound to a shape labels that shape", () => {
  // The bound text sits outside its container's box: only the binding names it.
  const { dir, f } = own([
    shape("rectangle", "r", 0, 0, 160, 80, { boundElements: [{ type: "text", id: "rt" }] }),
    text("rt", "bound", 400, 400, { containerId: "r" }),
  ], "  - caption: Bound.\n    focus: [bound]\n");
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(svgs(dir), ["x.svg"]);
});

test("scene.md#B4 free text labels the smallest shape it sits in", () => {
  const byLabel = zoomed("deploy agent");
  assert.equal(byLabel, zoomed("agent"));
  assert.notEqual(byLabel, zoomed("g-cluster"));
});

test("scene.md#B5 a label, its first line in any case and spacing, and the id name the same shape", () => {
  const byId = zoomed("agent");
  for (const name of ["deploy agent", "Deploy  Agent", "deploy agent\nwatches the registry"]) {
    assert.equal(zoomed(name), byId, name);
  }
});

test("scene.md#B6 the id of a text or an arrow is not a shape's name", () => {
  for (const id of ["a1", "dev-t"]) {
    const f = flowFile(tmp(), "x.flow.yaml", `steps:\n  - caption: Not a shape.\n    focus: [${id}]\n`);
    const r = cli([f, "--formats", "svg"]);
    assert.equal(r.code, 1, id);
    assert.match(r.err, new RegExp(`no shape "${id}"`));
  }
});

test("scene.md#B7 a name two shapes share fails with where, the count and both ids, and writes nothing", () => {
  const { dir, f } = own([
    shape("rectangle", "left", 0, 0), text("lt", "twin", 20, 20),
    shape("rectangle", "right", 220, 0), text("rt", "twin", 240, 20),
  ], "  - caption: Fine.\n  - caption: Which one?\n    badges:\n      - {at: twin, text: hi}\n");
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /step 2, badge 1: "twin" names 2 shapes/);
  assert.match(r.err, /\bleft\b/);
  assert.match(r.err, /\bright\b/);
  assert.deepEqual(svgs(dir), []);
});

test("scene.md#B8 a name no shape has fails with where and the name, and writes nothing", () => {
  const dir = tmp();
  const f = flowFile(dir, "x.flow.yaml", "steps:\n  - caption: Fine.\n  - caption: Typo.\n    flows:\n      - {path: [ci, registy]}\n");
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /step 2, flow 1: no shape "registy"/);
  assert.deepEqual(svgs(dir), []);
});

test("scene.md#B9 a hop follows the arrow between its shapes, and in reverse the other way", () => {
  // a3 runs from the deploy agent to the registry through four points.
  const json = JSON.parse(fs.readFileSync(scene, "utf8"));
  const a3 = json.elements.find((e) => e.id === "a3");
  const steps = (d) => d.slice(1).map((p, i) => [p[0] - d[i][0], p[1] - d[i][1]]);
  const want = steps(a3.points);

  const dir = tmp();
  const f = flowFile(dir, "x.flow.yaml", "steps:\n  - caption: Out and back.\n    flows:\n" +
    "      - {path: [deploy agent, registry], color: \"#0000aa\"}\n      - {path: [registry, deploy agent], color: \"#00aa00\"}\n");
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 0, r.err);
  const svg = fs.readFileSync(path.join(dir, "x.svg"), "utf8");
  const trail = (color) => {
    const m = svg.match(new RegExp(`<path d="M([^"]+)"[^>]*stroke="${color}"`));
    assert.ok(m, `no trail in ${color}`);
    return m[1].split(" L").map((p) => p.split(" ").map(Number));
  };
  const close = (got, exp) => {
    assert.equal(got.length, exp.length);
    got.forEach(([x, y], i) => assert.ok(Math.abs(x - exp[i][0]) < 0.2 && Math.abs(y - exp[i][1]) < 0.2, `${[x, y]} vs ${exp[i]}`));
  };
  close(steps(trail("#0000aa")), want);
  close(steps(trail("#00aa00")), want.slice().reverse().map(([x, y]) => [-x, -y]));
});
