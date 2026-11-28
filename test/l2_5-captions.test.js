// L2.5 checks for spec/specs/steps.md R1 and R11: the caption bar. Two flows
// over a small scene of their own are rendered, one with a title and the
// default typing speed, one with neither; each is paused in Chrome, and its
// captions, counters and title are measured, as laid out and as on screen.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { cli, meta, tmp } from "./helpers.js";

const base = { angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2,
  strokeStyle: "solid", roughness: 0, opacity: 100, groupIds: [], frameId: null, seed: 1, version: 1, versionNonce: 1,
  isDeleted: false, boundElements: [], updated: 1, link: null, locked: false };
const rect = (id, x, y) => ({ ...base, roundness: null, type: "rectangle", id, x, y, width: 160, height: 80 });
const ELEMENTS = [rect("a", 0, 0), rect("b", 900, 0)];

const TITLE = "A title for the whole flow";
const SHORT = "Short one.";
const LONG = "So it is a long one: it has to go on and on, and on to a new line, and on to one more, as it is too long to fit in one row of the bar, so it is cut at its spaces, and each row is as full as it can be, up to its edge, with no word cut in two.";
const TYPED = "Typed one character at a time.";
const CAPTIONS = [SHORT, LONG, TYPED];
const WITH = `title: ${JSON.stringify(TITLE)}
draw: 1
steps:
${CAPTIONS.map((c) => `  - caption: ${JSON.stringify(c)}`).join("\n")}
`;
const WITHOUT = `typing: 0
steps:
  - caption: ${JSON.stringify(SHORT)}
`;
const INK = 120; // how far from the bar's color a pixel is to count as ink
const PAD = 28;

let browser, a, b, A, B;

async function open(svg) {
  const page = await browser.newPage();
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  const size = await page.evaluate(() => { const r = document.querySelector("svg").getBoundingClientRect(); return { width: Math.ceil(r.width), height: Math.ceil(r.height) }; });
  await page.setViewportSize(size);
  await page.evaluate(() => {
    const root = document.querySelector("svg");
    root.pauseAnimations();
    const shown = (el) => { for (let e = el; e && e !== root; e = e.parentElement) if (+getComputedStyle(e).opacity === 0) return false; return true; };
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; };
    // A text by what it says: its lines joined with spaces.
    const find = (s) => [...root.querySelectorAll("text")].find((t) => {
      const spans = [...t.children].filter((c) => c.tagName === "tspan");
      return (spans.length ? spans.map((c) => c.textContent).join(" ") : t.textContent) === s;
    });
    window.probe = (t, s) => {
      root.setCurrentTime(t);
      const tx = find(s);
      if (!tx) return null;
      const spans = [...tx.children].filter((c) => c.tagName === "tspan");
      const lines = spans.map((sp) => ({ text: sp.textContent, ...box(sp) }));
      // Where each character of the first line ends, on screen.
      const sp = spans[0] ?? tx, m = sp.getScreenCTM(), x0 = sp.getStartPositionOfChar(0).x;
      const ends = [...sp.textContent].map((_, k) => m.a * (x0 + sp.getSubStringLength(0, k + 1)) + m.e);
      const start = m.a * x0 + m.e;
      return { shown: shown(tx), box: box(tx), lines, ends, start, size: +getComputedStyle(tx).fontSize.replace("px", ""), fill: tx.getAttribute("fill") };
    };
    // The width a line of caption text takes.
    window.width = (s, like) => {
      const tx = find(like), t = tx.cloneNode(false);
      t.removeAttribute("clip-path");
      t.textContent = s;
      tx.parentNode.appendChild(t);
      const w = t.getComputedTextLength() * tx.getScreenCTM().a;
      t.remove();
      return w;
    };
    window.frame = () => {
      const r = root.querySelector("#sf-frame rect");
      return { H: r.height.baseVal.value * root.getScreenCTM().a, W: root.getBoundingClientRect().width, total: root.getBoundingClientRect().height };
    };
  });
  return page;
}
const probe = (page, t, s) => page.evaluate(([t, s]) => window.probe(t, s), [t, s]);

// The rightmost ink on screen at time t within a box: where typing has got to.
async function inkRight(page, t, bx) {
  await page.evaluate((t) => document.querySelector("svg").setCurrentTime(t), t);
  const png = (await page.screenshot()).toString("base64");
  return page.evaluate(async ([png, bx]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${png}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const x0 = Math.floor(bx.x), y0 = Math.floor(bx.y), w = Math.ceil(bx.w), h = Math.ceil(bx.h);
    const d = g.getImageData(x0, y0, w, h).data;
    let right = null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (Math.abs(d[i] - 0xf8) + Math.abs(d[i + 1] - 0xf9) + Math.abs(d[i + 2] - 0xfa) > 120) right = Math.max(right ?? 0, x0 + x + 1);
    }
    return right;
  }, [png, bx]);
}

before(async () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "d.excalidraw"), JSON.stringify({ type: "excalidraw", version: 2, source: "https://excalidraw.com",
    appState: { viewBackgroundColor: "#ffffff" }, elements: ELEMENTS, files: {} }));
  const render = (name, flow) => {
    const f = path.join(dir, `${name}.flow.yaml`);
    fs.writeFileSync(f, `scene: d.excalidraw\n${flow}`);
    const r = cli([f, "--formats", "svg"]);
    assert.equal(r.code, 0, r.err);
    return fs.readFileSync(path.join(dir, `${name}.svg`), "utf8");
  };
  const sa = render("with", WITH), sb = render("without", WITHOUT);
  A = meta(sa); B = meta(sb);
  const exe = process.env.SKETCHFLOW_CHROME;
  browser = await chromium.launch(exe ? { executablePath: exe } : { channel: "chrome" });
  a = await open(sa); b = await open(sb);
});
after(() => browser?.close());

const S = (n) => ({ start: A.steps[n - 1], end: n < A.steps.length ? A.steps[n] : A.total });

test("steps.md#B44 a caption types itself out from its step's start, 55 characters a second by default", async () => {
  const { start } = S(3);
  const p = await probe(a, start + 0.01, TYPED);
  const band = { x: p.box.x - 4, y: p.box.y, w: p.box.w + 12, h: p.box.h };
  assert.equal(await inkRight(a, start + 0.005, band), null, "ink before the first character's time");
  for (const k of [6, 14, 24]) {
    const right = await inkRight(a, start + (k + 0.5) / 55, band);
    assert.ok(right !== null && right > p.ends[k - 3] && right <= p.ends[k] + 3, `${k} characters in: ink to ${right}, characters end at ${p.ends.slice(k - 3, k + 1)}`);
  }
  const done = await inkRight(a, start + TYPED.length / 55 + 0.05, band);
  assert.ok(Math.abs(done - p.ends.at(-1)) <= 3, `${done} vs ${p.ends.at(-1)}`);
});

test("steps.md#B45 with typing: 0 the whole caption shows from its step's start", async () => {
  const p = await probe(b, B.steps[0] + 0.01, SHORT);
  assert.ok(p.shown);
  const right = await inkRight(b, B.steps[0] + 0.01, { x: p.box.x - 4, y: p.box.y, w: p.box.w + 12, h: p.box.h });
  assert.ok(Math.abs(right - p.ends.at(-1)) <= 3, `${right} vs ${p.ends.at(-1)}`);
});

test("steps.md#B46 each step shows its number and the step count in orange before its caption, which starts after it", async () => {
  for (const n of [1, 2, 3]) {
    const t = S(n).start + 0.01, c = await probe(a, t, `${n}/3`), cap = await probe(a, t, CAPTIONS[n - 1]);
    assert.ok(c?.shown, `no ${n}/3 at step ${n}`);
    assert.equal(c.fill, "#e8590c");
    assert.ok(cap.lines[0].x >= c.box.right + 6, `caption at ${cap.lines[0].x}, counter ends at ${c.box.right}`);
    assert.ok(Math.abs(cap.lines[0].y + cap.lines[0].h / 2 - (c.box.y + c.box.h / 2)) < 4, "not on the counter's line");
  }
});

test("steps.md#B47 a long caption wraps at its spaces, each line as full as fits inside the bar, later lines under the counter", async () => {
  const { W } = await a.evaluate(() => window.frame());
  const p = await probe(a, S(2).start + 0.01, LONG), c = await probe(a, S(2).start + 0.01, "2/3");
  assert.ok(p.lines.length >= 3, `${p.lines.length} lines`);
  assert.equal(p.lines.map((l) => l.text).join(" "), LONG);
  for (const l of p.lines) assert.ok(l.right <= W - PAD + 1, `"${l.text}" ends at ${l.right}, past ${W - PAD}`);
  for (const l of p.lines.slice(1)) assert.ok(Math.abs(l.x - c.box.x) < 3, `"${l.text}" starts at ${l.x}, the counter at ${c.box.x}`);
  p.lines.slice(1).forEach((l, i) => assert.ok(l.y >= p.lines[i].bottom - 2, "lines overlap"));
  // Each line is as full as fits: its next word would not have.
  for (let i = 0; i < p.lines.length - 1; i++) {
    const next = p.lines[i + 1].text.split(" ")[0];
    const w = await a.evaluate(([s, like]) => window.width(s, like), [`${p.lines[i].text} ${next}`, LONG]);
    assert.ok(p.lines[i].x + w > W - PAD - 1, `"${next}" would fit after "${p.lines[i].text}"`);
  }
});

test("steps.md#B48 the bar is as tall as the longest caption needs, for every step", async () => {
  const { total } = await a.evaluate(() => window.frame());
  const p = await probe(a, S(2).start + 0.01, LONG);
  const bottom = p.lines.at(-1).bottom;
  assert.ok(bottom <= total - 4 && total - bottom < 40, `last line ends at ${bottom}, the bar at ${total}`);
  for (const n of [1, 3]) {
    const q = await probe(a, S(n).start + 0.01, CAPTIONS[n - 1]);
    assert.ok(q.box.bottom <= total, `step ${n}'s caption past the bar`);
  }
});

test("steps.md#B49 title shows above the captions, in a smaller size, all through the loop, the draw-in too", async () => {
  const { H } = await a.evaluate(() => window.frame());
  for (const t of [0.01, S(2).start + 0.01, A.total - 0.01]) {
    const p = await probe(a, t, TITLE);
    assert.ok(p?.shown, `no title at ${t}`);
    assert.ok(p.box.y >= H, "title not in the bar");
  }
  const title = await probe(a, S(1).start + 0.01, TITLE), cap = await probe(a, S(1).start + 0.01, SHORT);
  assert.ok(title.box.bottom <= cap.box.y, `title ends at ${title.box.bottom}, caption starts at ${cap.box.y}`);
  assert.ok(title.size < cap.size, `${title.size} vs ${cap.size}`);
});

test("steps.md#B50 without title, the bar has no title row: the caption sits at its top", async () => {
  const { H } = await b.evaluate(() => window.frame());
  const p = await probe(b, B.steps[0] + 0.01, SHORT);
  assert.ok(p.box.y - H < 30, `caption ${p.box.y - H} px below the bar's top`);
});

test("steps.md#B51 a caption and its counter show only during their step; during the draw-in, none does", async () => {
  for (const s of [...CAPTIONS, "1/3", "2/3", "3/3"]) assert.equal((await probe(a, 0.5, s)).shown, false, `${s} during the draw-in`);
  for (const n of [1, 2]) {
    const t = S(n + 1).start + 0.01;
    assert.equal((await probe(a, t, CAPTIONS[n - 1])).shown, false, `step ${n}'s caption in step ${n + 1}`);
    assert.equal((await probe(a, t, `${n}/3`)).shown, false, `${n}/3 in step ${n + 1}`);
  }
  assert.equal((await probe(a, A.total - 0.01, "3/3")).shown, true);
});
