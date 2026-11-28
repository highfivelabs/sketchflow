// L2.4 checks for spec/specs/steps.md R8: the draw-in. One flow over a small
// scene of its own is rendered with `draw: 2`, and the same scene without
// `draw` for reference. Both are paused in Chrome, and each element's pixels
// on screen are compared, moment by moment, with how it looks fully drawn.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { cli, meta, tmp } from "./helpers.js";

const base = { angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2,
  strokeStyle: "solid", roughness: 0, opacity: 100, groupIds: [], frameId: null, seed: 1, version: 1, versionNonce: 1,
  isDeleted: false, boundElements: [], updated: 1, link: null, locked: false };
const rect = (id, x, y, o = {}) => ({ ...base, roundness: null, type: "rectangle", id, x, y, width: 160, height: 80, ...o });
const text = (id, s, x, y) => ({ ...base, roundness: null, type: "text", id, x, y, width: 20 * s.length, height: 45, text: s,
  originalText: s, fontSize: 36, fontFamily: 5, textAlign: "left", verticalAlign: "top", containerId: null, lineHeight: 1.25, autoResize: true });

// Scene coordinates, in the scene's order (Excalidraw's z-order). Each
// element has a region of the screen to itself.
const ELEMENTS = [
  rect("line", 0, 0),
  rect("fill", 300, 0, { backgroundColor: "#1971c2" }),
  rect("dash", 0, 200, { strokeStyle: "dashed" }),
  text("word", "Drawn", 300, 210),
  rect("last", 600, 200),
];
// Where each is measured: around a rectangle's stroke, inside the filled
// one's (its fill only), around the text; and the first rectangle's top and
// bottom sides on their own.
const REGIONS = {
  line: [-6, -6, 172, 92], top: [20, -6, 120, 12], bottom: [20, 74, 120, 12], fill: [310, 10, 140, 60], dash: [-6, 194, 172, 92],
  word: [290, 200, 200, 70], last: [594, 194, 172, 92],
};
const EMPTY = [500, 120];
const BG = [0xff, 0xf9, 0xdb];
const DRAW = 2;
const START = [160, 40]; // the flow line → fill runs straight from here
const steps = `steps:
  - caption: Zoomed.
    zoom: [fill]
  - caption: Flow.
    zoom: [line]
    flows:
      - {path: [line, fill], color: "#00aa00"}
`;

let browser, drawn, ref, svg, total, regions, shift;

async function open(svgText, size) {
  const page = await browser.newPage();
  if (size) await page.setViewportSize(size);
  await page.setContent(`<html><body style="margin:0">${svgText}</body></html>`);
  await page.evaluate(() => document.querySelector("svg").pauseAnimations());
  return page;
}
function render(dir, name, flow) {
  const f = path.join(dir, `${name}.flow.yaml`);
  fs.writeFileSync(f, `scene: d.excalidraw\n${flow}`);
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 0, r.err);
  return fs.readFileSync(path.join(dir, `${name}.svg`), "utf8");
}

before(async () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "d.excalidraw"), JSON.stringify({ type: "excalidraw", version: 2, source: "https://excalidraw.com",
    appState: { viewBackgroundColor: "#fff9db" }, elements: ELEMENTS, files: {} }));
  svg = render(dir, "drawn", `draw: ${DRAW}\n${steps}`);
  const plain = render(dir, "plain", "steps:\n  - {caption: Reference., zoom: all}\n");
  ({ total } = meta(svg));
  const m = svg.match(/<path d="M([\d.]+) ([\d.]+)[^"]*"[^>]*stroke="#00aa00"/);
  shift = [+m[1] - START[0], +m[2] - START[1]];
  const exe = process.env.SKETCHFLOW_CHROME;
  browser = await chromium.launch(exe ? { executablePath: exe } : { channel: "chrome" });
  ref = await open(plain);
  const size = await ref.evaluate(() => { const b = document.querySelector("svg").getBoundingClientRect(); return { width: Math.ceil(b.width), height: Math.ceil(b.height) }; });
  await ref.setViewportSize(size);
  drawn = await open(svg, size);
  // Each region in screen pixels, and how it looks fully drawn.
  regions = await ref.evaluate(([R, shift]) => {
    const root = document.querySelector("svg");
    root.setCurrentTime(0.5);
    const m = root.querySelector("g.sf-stage").getScreenCTM();
    return Object.fromEntries(Object.entries(R).map(([n, [x, y, w, h]]) =>
      [n, [Math.round(m.a * (x + shift[0]) + m.e), Math.round(m.d * (y + shift[1]) + m.f), Math.round(w * m.a), Math.round(h * m.d)]]));
  }, [REGIONS, shift]);
  const full = await grab(ref, 0.5);
  await drawn.evaluate((full) => { window.FULL = full; }, full);
});
after(() => browser?.close());

// The screen at time t, as each region's pixels (and the empty spot's), or,
// once FULL is known, how far along each region is.
async function grab(page, t) {
  await page.evaluate((t) => document.querySelector("svg").setCurrentTime(t), t);
  const png = (await page.screenshot()).toString("base64");
  const empty = [EMPTY[0] + shift[0], EMPTY[1] + shift[1]];
  return page.evaluate(async ([png, regions, empty, BG]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${png}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    // How far each pixel is from the background.
    const ink = (d) => { const out = []; for (let i = 0; i < d.length; i += 4) out.push(Math.abs(d[i] - BG[0]) + Math.abs(d[i + 1] - BG[1]) + Math.abs(d[i + 2] - BG[2])); return out; };
    const px = Object.fromEntries(Object.entries(regions).map(([n, [x, y, w, h]]) => [n, ink(g.getImageData(x, y, w, h).data)]));
    const bg = [...g.getImageData(Math.round(empty[0]), Math.round(empty[1]), 1, 1).data.slice(0, 3)];
    if (!window.FULL) return { px, bg };
    // p: how much of the region's ink shows; f: the share of its pixels
    // shown in full; seen: the share shown at all.
    const stats = Object.fromEntries(Object.entries(px).map(([n, now]) => {
      const want = window.FULL.px[n];
      let sum = 0, got = 0, inked = 0, full = 0, seen = 0;
      want.forEach((v, i) => {
        if (v < 60) return;
        inked++; sum += v; got += Math.min(now[i], v);
        if (now[i] >= 0.85 * v) full++;
        if (now[i] >= 0.1 * v) seen++;
      });
      return [n, { p: got / sum, f: full / inked, seen: seen / inked }];
    }));
    return { stats, bg };
  }, [png, regions, empty, BG]);
}
const NAMES = ELEMENTS.map((e) => e.id);
let samples;
async function draw() {
  samples ??= (async () => {
    const out = [];
    for (let t = 0; t <= DRAW + 1e-9; t += 0.05) out.push({ t: Math.min(t, DRAW - 0.01), ...(await grab(drawn, Math.min(t, DRAW - 0.01))) });
    return out;
  })();
  return samples;
}
// The camera at time t: scale and translation.
const camera = (t) => drawn.evaluate((t) => {
  const root = document.querySelector("svg");
  root.setCurrentTime(t);
  const m = root.querySelector("g.sf-stage").getCTM();
  return [m.a, m.e, m.f];
}, t);

test("steps.md#B36 draw: 2 takes the loop's first 2 s, and the first step starts then; draw: true takes 3 s; without draw, 0", () => {
  assert.equal(meta(svg).steps[0], DRAW);
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "d.excalidraw"), JSON.stringify({ type: "excalidraw", version: 2, source: "https://excalidraw.com",
    appState: { viewBackgroundColor: "#ffffff" }, elements: ELEMENTS, files: {} }));
  assert.deepEqual(meta(render(dir, "t", "draw: true\nsteps:\n  - caption: One.\n")).steps, [3]);
  assert.deepEqual(meta(render(dir, "n", "steps:\n  - caption: One.\n")).steps, [0]);
});

test("steps.md#B37 at the loop's start only the background shows; by the first step every element is drawn as without draw", async () => {
  const ss = await draw();
  const [first, last] = [ss[0], ss.at(-1)];
  assert.deepEqual(first.bg, BG);
  for (const n of NAMES) {
    assert.ok(first.stats[n].p < 0.03, `${n} shows at 0: ${first.stats[n].p}`);
    assert.ok(last.stats[n].p > 0.97 && last.stats[n].f > 0.9, `${n} is not drawn at ${last.t}: ${JSON.stringify(last.stats[n])}`);
  }
});

test("steps.md#B38 elements start one after another in the scene's order; the first at once, the last done as the first step starts", async () => {
  const ss = await draw();
  const begins = NAMES.map((n) => ss.find((s) => s.stats[n].p > 0.03)?.t);
  const done = ss.find((s) => s.stats.last.p > 0.97)?.t;
  assert.ok(begins.every((t) => t !== undefined), `${begins}`);
  assert.ok(begins[0] <= 0.1, `first starts at ${begins[0]}`);
  begins.slice(1).forEach((t, i) => assert.ok(t > begins[i], `${NAMES[i + 1]} at ${t}, ${NAMES[i]} at ${begins[i]}`));
  assert.ok(done > DRAW - 0.2, `the last is done at ${done}, the first step starts at ${DRAW}`);
});

// A moment partway through, when some of it shows. Drawn along its length,
// what shows is in full (f near p); faded, little is (f well under p). Text
// antialiases a little differently while it fades, so not none.
const partway = (ss, n) => ss.map((s) => s.stats[n]).filter((s) => s.p > 0.2 && s.p < 0.8);

test("steps.md#B39 a solid stroke draws along its length, one line after another: partway, a box's top is drawn and its bottom not yet", async () => {
  const ss = await draw();
  for (const n of ["line", "last"]) {
    const mid = partway(ss, n);
    assert.ok(mid.length, `${n} has no moment partway`);
    assert.ok(mid.every((s) => s.f >= 0.6 * s.p && s.seen < 0.95), `${n}: ${JSON.stringify(mid)}`);
  }
  const at = ss.map((s) => [s.t, s.stats.top.p, s.stats.bottom.p]);
  assert.ok(at.some(([, top, bottom]) => top > 0.9 && bottom < 0.1), JSON.stringify(at));
});

test("steps.md#B40 a solid fill and text fade in: partway, all of it shows, lighter", async () => {
  const ss = await draw();
  for (const n of ["fill", "word"]) {
    const mid = partway(ss, n);
    assert.ok(mid.length, `${n} has no moment partway`);
    assert.ok(mid.every((s) => s.f < 0.3 * s.p && s.seen > 0.9), `${n}: ${JSON.stringify(mid)}`);
  }
});

test("steps.md#B41 a dashed stroke fades in, keeping its dashes", async () => {
  const ss = await draw();
  const mid = partway(ss, "dash");
  assert.ok(mid.length, "no moment partway");
  assert.ok(mid.every((s) => s.f < 0.3 * s.p && s.seen > 0.9), JSON.stringify(mid));
  assert.ok(ss.at(-1).stats.dash.f > 0.9);
});

test("steps.md#B42 during the draw-in the camera shows the whole diagram, unscaled, and the first step's zoom starts from there", async () => {
  for (let t = 0; t < DRAW; t += 0.25) {
    const [k, e, f] = await camera(t);
    assert.ok(Math.abs(k - 1) < 1e-3 && Math.abs(e) < 0.01 && Math.abs(f) < 0.01, `at ${t}: ${k} ${e} ${f}`);
  }
  assert.ok((await camera(DRAW + 0.05))[0] < 1.05);
  assert.ok((await camera(DRAW + 0.9))[0] > 1.3);
});

test("steps.md#B43 the draw-in plays again at the start of every loop", async () => {
  const s = await grab(drawn, total + 0.01);
  for (const n of NAMES) assert.ok(s.stats[n].p < 0.05, `${n} shows at the second loop's start: ${s.stats[n].p}`);
  assert.deepEqual(s.bg, BG);
});
