// L2.2 checks for spec/specs/steps.md R2, R3 and R9: what the camera frames,
// and what is lit. One flow over a small scene of its own is rendered once,
// paused in Chrome at the end of each step, and measured: the camera from
// the stage's transform, lit and dimmed shapes from the pixels on screen.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { cli, meta, tmp } from "./helpers.js";

const base = { angle: 0, strokeColor: "#1e1e1e", backgroundColor: "#1971c2", fillStyle: "solid", strokeWidth: 2,
  strokeStyle: "solid", roughness: 0, opacity: 100, groupIds: [], frameId: null, seed: 1, version: 1, versionNonce: 1,
  isDeleted: false, boundElements: [], updated: 1, link: null, locked: false };
const W = 160, H = 80;
const rect = (id, x, y) => ({ ...base, roundness: null, type: "rectangle", id, x, y, width: W, height: H });
const text = (id, s, x, y) => ({ ...base, backgroundColor: "transparent", roundness: null, type: "text", id, x, y, width: 9 * s.length,
  height: 23, text: s, originalText: s, fontSize: 18, fontFamily: 5, textAlign: "left", verticalAlign: "top", containerId: null,
  lineHeight: 1.25, autoResize: true });
const arrow = (id, x, y, points, from, to) => ({ ...base, backgroundColor: "transparent", type: "arrow", id, x, y, points,
  width: points.at(-1)[0], height: 0, roundness: null, startBinding: { elementId: from, focus: 0, gap: 2 },
  endBinding: { elementId: to, focus: 0, gap: 2 }, startArrowhead: null, endArrowhead: "arrow", lastCommittedPoint: null, elbowed: false });

// Scene coordinates. e sits at the diagram's top-left corner, f at its
// bottom-right; a to d are in the middle.
const BOX = { e: [0, 0], a: [400, 300], b: [700, 300], c: [400, 600], d: [700, 600], f: [1200, 800] };
const AB = [562, 340];
const ELEMENTS = [
  ...Object.entries(BOX).flatMap(([n, [x, y]]) => [rect(n, x, y), text(`${n}-t`, n, x + 10, y + 4)]),
  arrow("ab", AB[0], AB[1], [[0, 0], [136, 0]], "a", "b"),
];
const FLOW = `steps:
  - {caption: All., zoom: all}
  - {caption: One., zoom: [a]}
  - {caption: Tight., zoom: [a], zoomPad: 0}
  - {caption: Roomy., zoom: [a], zoomPad: 120}
  - {caption: Two., zoom: [a, d]}
  - {caption: Corner., zoom: [e]}
  - {caption: Too wide., zoom: [e, f]}
  - {caption: Focus., zoom: all, focus: [a]}
  - caption: Named.
    flows:
      - {path: [a, b], color: "#00aa00"}
    badges:
      - {at: c, text: hi}
    write:
      - {at: d, text: note}
  - caption: Nothing named.
`;

let browser, page, starts, total, shift, size;
const end = (n) => (n < starts.length ? starts[n] : total) - 0.05;

before(async () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "d.excalidraw"), JSON.stringify({ type: "excalidraw", version: 2, source: "https://excalidraw.com",
    appState: { viewBackgroundColor: "#ffffff" }, elements: ELEMENTS, files: {} }));
  const f = path.join(dir, "x.flow.yaml");
  fs.writeFileSync(f, `scene: d.excalidraw\n${FLOW}`);
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 0, r.err);
  const svg = fs.readFileSync(path.join(dir, "x.svg"), "utf8");
  ({ steps: starts, total } = meta(svg));
  // The SVG's coordinates are the scene's shifted; the flow's trail starts
  // where its arrow does.
  const m = svg.match(/<path d="M([\d.]+) ([\d.]+)[^"]*"[^>]*stroke="#00aa00"/);
  shift = [+m[1] - AB[0], +m[2] - AB[1]];
  const exe = process.env.SKETCHFLOW_CHROME;
  browser = await chromium.launch(exe ? { executablePath: exe } : { channel: "chrome" });
  page = await browser.newPage();
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  size = await page.evaluate(() => {
    const root = document.querySelector("svg");
    root.pauseAnimations();
    const r = root.querySelector("#sf-frame rect");
    return [r.width.baseVal.value, r.height.baseVal.value];
  });
  const [, h] = await page.evaluate(() => [0, document.querySelector("svg").getBoundingClientRect().height]);
  await page.setViewportSize({ width: Math.ceil(size[0]), height: Math.ceil(h) });
});
after(() => browser?.close());

// The camera at time t: scale k, and the part of the diagram in view.
async function camera(t) {
  const [k, e, f] = await page.evaluate((t) => {
    const root = document.querySelector("svg");
    root.setCurrentTime(t);
    const m = root.querySelector("g.sf-stage").getCTM();
    return [m.a, m.e, m.f];
  }, t);
  return { k, view: [-e / k, -f / k, size[0] / k, size[1] / k] };
}
// A shape's box in the SVG's diagram coordinates.
const box = (n) => ({ x: BOX[n][0] + shift[0], y: BOX[n][1] + shift[1], w: W, h: H });
const union = (...ns) => {
  const bs = ns.map(box), x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
  return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y };
};
// Room around a box in a view, in diagram px: [left, right, top, bottom].
const room = (b, [x, y, w, h]) => [b.x - x, x + w - b.x - b.w, b.y - y, y + h - b.y - b.h];
const near = (a, b, tol = 0.5) => Math.abs(a - b) < tol;

// A box fitted with `pad`: centered, `pad` on the tighter side, more or
// the same on the other.
function fitted(b, view, pad) {
  const [l, r, t, bt] = room(b, view);
  assert.ok(near(l, r) && near(t, bt), `not centered: ${[l, r, t, bt]}`);
  assert.ok(near(Math.min(l, t), pad), `tighter side has ${Math.min(l, t)}, not ${pad}`);
  assert.ok(Math.max(l, t) >= pad - 0.5);
}

test("steps.md#B20 zoom: all shows the whole diagram, unscaled", async () => {
  const { k, view } = await camera(end(1));
  assert.ok(near(k, 1, 1e-3), `${k}`);
  assert.ok(near(view[0], 0) && near(view[1], 0), `${view}`);
});

test("steps.md#B21 zoom on one shape centers it, 50 px on the tighter side and at least that on the other", async () => {
  const { k, view } = await camera(end(2));
  assert.ok(k > 1.5, `${k}`);
  fitted(box("a"), view, 50);
});

test("steps.md#B22 zoomPad: 0 fits edge to edge on the tighter side; zoomPad: 120 leaves 120 px", async () => {
  fitted(box("a"), (await camera(end(3))).view, 0);
  fitted(box("a"), (await camera(end(4))).view, 120);
});

test("steps.md#B23 zoom on two shapes fits the box around both", async () => {
  fitted(union("a", "d"), (await camera(end(5))).view, 50);
});

test("steps.md#B24 zoom at the diagram's corner shows nothing past its edges, and all of the shape", async () => {
  const { k, view } = await camera(end(6));
  assert.ok(k > 1.5, `${k}`);
  const [x, y, w, h] = view;
  assert.ok(x >= -0.01 && y >= -0.01 && x + w <= size[0] + 0.01 && y + h <= size[1] + 0.01, `${view} in ${size}`);
  assert.ok(room(box("e"), view).every((v) => v >= 0), `${room(box("e"), view)}`);
});

test("steps.md#B25 zoom on shapes whose fit is wider than the diagram shows all of it", async () => {
  const { k, view } = await camera(end(7));
  assert.ok(near(k, 1, 1e-3) && near(view[0], 0) && near(view[1], 0), `${k} ${view}`);
});

// Pixels on screen at time t, at points given in diagram coordinates.
async function pixels(t, pts) {
  const where = await page.evaluate(([t, pts]) => {
    const root = document.querySelector("svg");
    root.setCurrentTime(t);
    const m = root.querySelector("g.sf-stage").getScreenCTM();
    return pts.map(([x, y]) => [m.a * x + m.e, m.d * y + m.f]);
  }, [t, pts]);
  const png = (await page.screenshot()).toString("base64");
  return page.evaluate(async ([png, where]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${png}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    return where.map(([x, y]) => [...g.getImageData(Math.round(x), Math.round(y), 1, 1).data.slice(0, 3)]);
  }, [png, where]);
}
const FILL = [0x19, 0x71, 0xc2], ORANGE = [0xf0, 0x8c, 0x00];
const DIM = FILL.map((v) => v * 0.45 + 255 * 0.55);
const like = (got, want, tol = 14) => got.every((v, i) => Math.abs(v - want[i]) <= tol);
const mid = (n) => { const b = box(n); return [b.x + b.w * 0.75, b.y + b.h * 0.7]; };
const ring = (n) => { const b = box(n); return [b.x + b.w / 2, b.y - 7]; };
async function lit(t, on, off) {
  const ns = [...on, ...off];
  const px = await pixels(t, [...ns.map(mid), ...ns.map(ring)]);
  ns.forEach((n, i) => {
    const [fill, edge] = [px[i], px[ns.length + i]];
    if (on.includes(n)) {
      assert.ok(like(fill, FILL), `${n} is not lit: ${fill}`);
      assert.ok(like(edge, ORANGE, 40), `${n} is not ringed: ${edge}`);
    } else {
      assert.ok(like(fill, DIM), `${n} is not dimmed: ${fill}`);
      assert.ok(!like(edge, ORANGE, 40), `${n} is ringed: ${edge}`);
    }
  });
}

test("steps.md#B26 with focus, its shapes are lit and ringed, and the others dimmed", async () => {
  await lit(end(8), ["a"], ["b", "c", "d", "e", "f"]);
});

test("steps.md#B27 without focus, the shapes named by flows, badges and notes are lit and ringed, the others dimmed", async () => {
  await lit(end(9), ["a", "b", "c", "d"], ["e", "f"]);
});

test("steps.md#B28 a step that names no shape dims nothing", async () => {
  const px = await pixels(end(10), Object.keys(BOX).map(mid));
  px.forEach((p, i) => assert.ok(like(p, FILL), `${Object.keys(BOX)[i]} is dimmed: ${p}`));
});
