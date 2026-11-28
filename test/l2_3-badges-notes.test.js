// L2.3 checks for spec/specs/steps.md R5, R6 and R10: where badges and notes
// sit and how they look. One flow over a small scene of its own is rendered
// once, and each badge and note is measured in Chrome.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { cli, tmp } from "./helpers.js";

const base = { angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2,
  strokeStyle: "solid", roughness: 0, opacity: 100, groupIds: [], frameId: null, seed: 1, version: 1, versionNonce: 1,
  isDeleted: false, boundElements: [], updated: 1, link: null, locked: false };
const rect = (id, x, y) => ({ ...base, roundness: null, type: "rectangle", id, x, y, width: 160, height: 80 });
const text = (id, s, x, y) => ({ ...base, roundness: null, type: "text", id, x, y, width: 9 * s.length, height: 23, text: s,
  originalText: s, fontSize: 18, fontFamily: 5, textAlign: "left", verticalAlign: "top", containerId: null, lineHeight: 1.25, autoResize: true });

// Scene coordinates. A flow s → t runs straight, so its trail starts at the
// middle of s's right side: that gives the SVG's shift.
const BOX = { s: [400, 300], t: [800, 300], u: [400, 600] };
const START = [560, 340];
const ELEMENTS = Object.entries(BOX).flatMap(([n, [x, y]]) => [rect(n, x, y), text(`${n}-t`, n, x + 10, y + 4)]);
const POINT = [100, 120];
const FLOW = `steps:
  - caption: Badges on every side.
    flows:
      - {path: [s, t], color: "#00aa00"}
    badges:
      - {at: s, text: badge-default}
      - {at: t, text: badge-bottom, side: bottom}
      - {at: t, text: badge-top, side: top}
      - {at: t, text: badge-left, side: left}
      - {at: t, text: badge-right, side: right}
  - caption: Notes on every side.
    write:
      - {at: s, text: note-default}
      - {at: t, text: note-bottom, side: bottom}
      - {at: t, text: note-top, side: top}
      - {at: t, text: note-left, side: left}
      - {at: t, text: note-right, side: right}
  - caption: Notes at a point, sized, colored, on two lines.
    write:
      - {at: ${JSON.stringify(POINT)}, text: note-point}
      - {at: u, text: note-styled, size: 30, color: "#c2255c"}
      - {at: s, text: "line-one\\nline-two-longer", side: top}
  - caption: Stacked.
    badges:
      - {at: u, text: stack-1}
      - {at: u, text: stack-2}
    write:
      - {at: u, text: stack-3}
`;

let browser, page, svg, shift;
before(async () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "d.excalidraw"), JSON.stringify({ type: "excalidraw", version: 2, source: "https://excalidraw.com",
    appState: { viewBackgroundColor: "#ffffff" }, elements: ELEMENTS, files: {} }));
  const f = path.join(dir, "x.flow.yaml");
  fs.writeFileSync(f, `scene: d.excalidraw\n${FLOW}`);
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 0, r.err);
  svg = fs.readFileSync(path.join(dir, "x.svg"), "utf8");
  const m = svg.match(/<path d="M([\d.]+) ([\d.]+)[^"]*"[^>]*stroke="#00aa00"/);
  shift = [+m[1] - START[0], +m[2] - START[1]];
  const exe = process.env.SKETCHFLOW_CHROME;
  browser = await chromium.launch(exe ? { executablePath: exe } : { channel: "chrome" });
  page = await browser.newPage();
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.evaluate(() => document.querySelector("svg").pauseAnimations());
});
after(() => browser?.close());

// What a badge or note with this text is, measured in scene coordinates:
// its box (a badge's chip, a note's text), and how it is drawn.
async function item(s) {
  const got = await page.evaluate((s) => {
    const root = document.querySelector("svg"), stage = root.querySelector("g.sf-stage");
    const tx = [...root.querySelectorAll("text")].find((t) => [...t.children].map((c) => c.textContent).join("\n") === s || t.textContent === s);
    if (!tx) return null;
    const chip = tx.previousElementSibling?.tagName === "rect" ? tx.previousElementSibling : null;
    const el = chip ?? tx, b = el.getBBox();
    const m = stage.getCTM().inverse().multiply(el.getCTM());
    const pt = (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
    const [x0, y0] = pt(b.x, b.y), [x1, y1] = pt(b.x + b.width, b.y + b.height);
    const lines = [...tx.children].filter((c) => c.tagName === "tspan").map((c) => {
      const lb = c.getBBox(), [cx, cy] = pt(lb.x + lb.width / 2, lb.y + lb.height / 2);
      return { cx, cy, y: +c.getAttribute("y") };
    });
    return { box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, border: chip?.getAttribute("stroke") ?? null,
      font: tx.getAttribute("font-family"), size: +tx.getAttribute("font-size"), fill: tx.getAttribute("fill"), lines };
  }, s);
  assert.ok(got, `no "${s}" in the SVG`);
  got.box.x -= shift[0]; got.box.y -= shift[1];
  return got;
}
const shape = (n) => ({ x: BOX[n][0], y: BOX[n][1], w: 160, h: 80 });
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
// The box sits `gap` px off the shape on `side`, centered along that side.
function placed(b, n, side, gap = 4) {
  const s = shape(n), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const off = { bottom: b.y - (s.y + s.h), top: s.y - (b.y + b.h), left: s.x - (b.x + b.w), right: b.x - (s.x + s.w) }[side];
  assert.ok(near(off, gap), `${side}: ${off} px off, not ${gap}`);
  if (side === "top" || side === "bottom") assert.ok(near(cx, s.x + s.w / 2), `${side}: not centered, ${cx}`);
  else assert.ok(near(cy, s.y + s.h / 2), `${side}: not centered, ${cy}`);
}

test("steps.md#B29 a badge sits 4 px off its shape on its side, centered; without side, below", async () => {
  placed((await item("badge-default")).box, "s", "bottom");
  for (const side of ["bottom", "top", "left", "right"]) placed((await item(`badge-${side}`)).box, "t", side);
});

test("steps.md#B30 a badge is a chip with a green border around its text", async () => {
  const b = await item("badge-top");
  assert.equal(b.border, "#2f9e44");
  const [l] = b.lines;
  assert.ok(near(l.cx, b.box.x + shift[0] + b.box.w / 2, 1.5) && near(l.cy, b.box.y + shift[1] + b.box.h / 2, 3), "text is not inside its chip");
});

test("steps.md#B31 a note at a shape sits 4 px off it on its side, centered; without side, below", async () => {
  placed((await item("note-default")).box, "s", "bottom");
  for (const side of ["bottom", "top", "left", "right"]) placed((await item(`note-${side}`)).box, "t", side);
});

test("steps.md#B32 a note at [x, y] has its top-left corner at that point", async () => {
  const { box } = await item("note-point");
  assert.ok(near(box.x, POINT[0]) && near(box.y, POINT[1]), `${box.x}, ${box.y}`);
});

test("steps.md#B33 a note is in the diagram's font, 18 and #1971c2 by default, or its size and color", async () => {
  const plain = await item("note-default"), styled = await item("note-styled");
  for (const n of [plain, styled]) assert.match(n.font, /^Excalifont\b/);
  assert.equal(plain.size, 18); assert.equal(plain.fill, "#1971c2");
  assert.equal(styled.size, 30); assert.equal(styled.fill, "#c2255c");
  assert.ok(styled.box.h > plain.box.h * 1.4, `${styled.box.h} vs ${plain.box.h}`);
});

test("steps.md#B34 a note breaks into lines at its newlines, each centered, 1.25 sizes apart", async () => {
  const n = await item("line-one\nline-two-longer");
  assert.equal(n.lines.length, 2);
  assert.ok(near(n.lines[0].cx, n.lines[1].cx), `${n.lines[0].cx} vs ${n.lines[1].cx}`);
  assert.ok(near(n.lines[1].y - n.lines[0].y, 18 * 1.25, 0.01));
  placed(n.box, "s", "top");
});

test("steps.md#B35 two badges and a note at one shape and side stack outward in order, 4 px apart", async () => {
  const [a, b, c] = [await item("stack-1"), await item("stack-2"), await item("stack-3")];
  placed(a.box, "u", "bottom");
  for (const [p, q] of [[a, b], [b, c]]) {
    assert.ok(near(q.box.y - (p.box.y + p.box.h), 4), `gap ${q.box.y - (p.box.y + p.box.h)}`);
    assert.ok(near(q.box.x + q.box.w / 2, p.box.x + p.box.w / 2), "not centered under the one before");
  }
});
