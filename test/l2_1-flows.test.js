// L2.1 checks for spec/specs/steps.md R4: the way a token goes. One flow over
// a small scene of its own is rendered once; its trails are read from the
// SVG, and the label is watched moving in Chrome.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { cli, flowFile, meta, tmp } from "./helpers.js";

// Shapes, texts and arrows built like Excalidraw's.
const base = { angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2,
  strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, seed: 1, version: 1, versionNonce: 1,
  isDeleted: false, boundElements: [], updated: 1, link: null, locked: false };
const rect = (id, x, y) => ({ ...base, roundness: null, type: "rectangle", id, x, y, width: 160, height: 80 });
const text = (id, s, x, y) => ({ ...base, roundness: null, type: "text", id, x, y, width: 9 * s.length, height: 23, text: s,
  originalText: s, fontSize: 18, fontFamily: 5, textAlign: "left", verticalAlign: "top", containerId: null, lineHeight: 1.25, autoResize: true });
const bind = (id) => (id ? { elementId: id, focus: 0, gap: 2 } : null);
const arrow = (id, x, y, points, from, to, curved) => {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  return { ...base, type: "arrow", id, x, y, points, width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys),
    roundness: curved ? { type: 2 } : null, startBinding: bind(from), endBinding: bind(to), startArrowhead: null, endArrowhead: "arrow",
    lastCommittedPoint: null, elbowed: false };
};

// Scene coordinates. a is above c, b is right of a, d is right of c.
const BOX = { a: [0, 0], b: [400, 100], c: [0, 300], d: [400, 400] };
const AC = [[80, 82], [80, 298]];
const CD = [[162, 340], [280, 340], [280, 440], [398, 440]];
const ELEMENTS = [
  ...Object.entries(BOX).flatMap(([n, [x, y]]) => [rect(n, x, y), text(`${n}-t`, n, x + 20, y + 20)]),
  arrow("ac", 80, 82, [[0, 0], [0, 216]], "a", "c", true),
  arrow("cd", 162, 340, [[0, 0], [118, 0], [118, 100], [236, 100]], "c", "d", false),
  // Drawn near shapes but bound to one of them, or to neither: not followed.
  arrow("bd", 500, 182, [[0, 0], [0, 216]], "b", null, true),
  arrow("ab", 162, 50, [[0, 0], [236, 80]], null, null, true),
];
const BENDS = [[250, -50], [300, 250]];
const FLOW = `steps:
  - caption: Every way a token goes.
    flows:
      - {path: [a, c], label: push}
      - {path: [a, b], color: "#000001"}
      - {path: [a, b], color: "#000002", via: ${JSON.stringify(BENDS)}}
      - {path: [a, c], color: "#000003", via: [[300, 200]]}
      - {path: [a, c, d], color: "#000004"}
      - {path: [b, d], color: "#000005"}
`;
const RED = "#e03131";

let svg, browser, page;
before(async () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "d.excalidraw"), JSON.stringify({ type: "excalidraw", version: 2, source: "https://excalidraw.com",
    appState: { viewBackgroundColor: "#ffffff" }, elements: ELEMENTS, files: {} }));
  const f = path.join(dir, "x.flow.yaml");
  fs.writeFileSync(f, `scene: d.excalidraw\n${FLOW}`);
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 0, r.err);
  svg = fs.readFileSync(path.join(dir, "x.svg"), "utf8");
  const exe = process.env.SKETCHFLOW_CHROME;
  browser = await chromium.launch(exe ? { executablePath: exe } : { channel: "chrome" });
  page = await browser.newPage();
  await page.setContent(`<html><body>${svg}</body></html>`);
});
after(() => browser?.close());

// A trail's points, in scene coordinates: the SVG's, less the shift that the
// first (default red) flow shows against the arrow it follows.
const raw = (color) => {
  const m = svg.match(new RegExp(`<path d="M([^"]+)"[^>]*stroke="${color}"`));
  assert.ok(m, `no trail in ${color}`);
  return m[1].split(" L").map((p) => p.split(" ").map(Number));
};
const trail = (color) => {
  const [x0, y0] = raw(RED)[0], [dx, dy] = [x0 - AC[0][0], y0 - AC[0][1]];
  return raw(color).map(([x, y]) => [x - dx, y - dy]);
};
const near = (p, q, tol = 0.2) => Math.hypot(p[0] - q[0], p[1] - q[1]) < tol;
const same = (got, want) => {
  assert.equal(got.length, want.length, `${JSON.stringify(got)} vs ${JSON.stringify(want)}`);
  got.forEach((p, i) => assert.ok(near(p, want[i]), `point ${i}: ${p} vs ${want[i]}`));
};
const box = (n) => ({ x: BOX[n][0], y: BOX[n][1], w: 160, h: 80 });
const mid = (n) => [BOX[n][0] + 80, BOX[n][1] + 40];
const onEdge = ([x, y], b, tol = 0.2) => {
  const inX = x >= b.x - tol && x <= b.x + b.w + tol, inY = y >= b.y - tol && y <= b.y + b.h + tol;
  const side = Math.min(Math.abs(x - b.x), Math.abs(x - b.x - b.w), Math.abs(y - b.y), Math.abs(y - b.y - b.h));
  return inX && inY && side < tol;
};
const onLine = (p, a, b, tol = 0.2) => {
  const [ux, uy] = [b[0] - a[0], b[1] - a[1]];
  return Math.abs(ux * (p[1] - a[1]) - uy * (p[0] - a[0])) / Math.hypot(ux, uy) < tol;
};
const straight = (pts, from, to) => {
  assert.equal(pts.length, 2, JSON.stringify(pts));
  assert.ok(onEdge(pts[0], box(from)) && onLine(pts[0], mid(from), mid(to)), `start ${pts[0]}`);
  assert.ok(onEdge(pts[1], box(to)) && onLine(pts[1], mid(from), mid(to)), `end ${pts[1]}`);
};

test("steps.md#B13 a flow of three shapes runs along both hops' arrows, through every point of both", () => {
  same(trail("#000004"), [...AC, ...CD]);
});

test("steps.md#B14 a hop with no arrow runs straight from edge to edge on the line between the centers", () => {
  straight(trail("#000001"), "a", "b");
});

test("steps.md#B15 a hop with via runs from edge through each bend in order to edge, each end aimed at its bend", () => {
  const pts = trail("#000002");
  assert.equal(pts.length, BENDS.length + 2, JSON.stringify(pts));
  same(pts.slice(1, -1), BENDS);
  assert.ok(onEdge(pts[0], box("a")) && onLine(pts[0], mid("a"), BENDS[0]), `start ${pts[0]}`);
  assert.ok(onEdge(pts.at(-1), box("b")) && onLine(pts.at(-1), mid("b"), BENDS.at(-1)), `end ${pts.at(-1)}`);
});

test("steps.md#B16 a hop with via follows the bends even where an arrow is drawn", () => {
  const pts = trail("#000003");
  assert.equal(pts.length, 3, JSON.stringify(pts));
  assert.ok(near(pts[1], [300, 200]), `${pts[1]}`);
});

test("steps.md#B17 an arrow bound to one of the shapes, or to neither, is not followed", () => {
  straight(trail("#000005"), "b", "d");
  straight(trail("#000001"), "a", "b");
});

test("steps.md#B18 a flow's label moves with its token, the same distance above it", async () => {
  const { total } = meta(svg);
  const seen = await page.evaluate((total) => {
    const root = document.querySelector("svg");
    root.pauseAnimations();
    const stage = root.querySelector("g.sf-stage");
    const token = document.querySelector('circle[fill="#e03131"]');
    const label = [...root.querySelectorAll("text")].find((t) => t.textContent === "push");
    const shown = (el) => { for (let e = el; e && e !== root; e = e.parentElement) if (+getComputedStyle(e).opacity === 0) return false; return true; };
    const at = (el, x, y) => { const m = stage.getCTM().inverse().multiply(el.getCTM()); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; };
    const out = [];
    for (let t = 0; t < total; t += 0.05) {
      root.setCurrentTime(t);
      if (!shown(token)) continue;
      const b = label.getBBox();
      out.push({ token: at(token, 0, 0), label: at(label, b.x + b.width / 2, b.y + b.height / 2), labelShown: shown(label) });
    }
    return out;
  }, total);
  const moved = seen.filter((s, i) => i && !(Math.abs(s.token[0] - seen[0].token[0]) < 1 && Math.abs(s.token[1] - seen[0].token[1]) < 1));
  assert.ok(seen.length > 5 && moved.length > 3, `${seen.length} moments, ${moved.length} moved`);
  const off = (s) => [s.label[0] - s.token[0], s.label[1] - s.token[1]];
  for (const s of seen) {
    assert.ok(s.labelShown);
    assert.ok(near(off(s), off(seen[0]), 0.5), `${off(s)} vs ${off(seen[0])}`);
  }
  assert.ok(off(seen[0])[1] < -10, `label ${off(seen[0])} is not above`);
});

test("steps.md#B19 a token and its trail are its color, or red without one", () => {
  for (const c of [RED, "#000004"]) {
    assert.match(svg, new RegExp(`<path d="M[^"]+"[^>]*stroke="${c}"`), `trail ${c}`);
    assert.match(svg, new RegExp(`<circle[^>]*fill="${c}"`), `token ${c}`);
  }
});

test("flow-file.md#B18 via on a path of three shapes fails", () => {
  const dir = tmp();
  const f = flowFile(dir, "x.flow.yaml", "steps:\n  - caption: One.\n    flows:\n      - {path: [developer, ci, registry], via: [[1, 2]]}\n");
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 1, r.err);
  assert.match(r.err, /step 1, flow 1: via needs a path of two shapes/);
});
