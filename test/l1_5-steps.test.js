// L1.5 checks for spec/specs/steps.md: when things happen. One flow over the
// deploy example's diagram is rendered once; its SVG is paused in Chrome and
// set to the moments each check asks about.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { cli, flowFile, meta, tmp } from "./helpers.js";

const LONG = "This caption is long on purpose, so that typing it out at the default speed of fifty-five characters a second takes well over three seconds, which is the default length of a step.";
const FLOW = `steps:
  - caption: Start wide.
    zoom: all
  - caption: Hi.
  - caption: Six.
    seconds: 6
  - caption: ${JSON.stringify(LONG)}
  - caption: Two tokens, a badge and three notes.
    zoom: [ci, registry]
    flows:
      - {path: [developer, ci], color: "#aa0000"}
      - {path: [ci, registry], color: "#00aa00"}
    badges:
      - {at: registry, text: badged}
    write:
      - {at: ci, text: after the flows, color: "#0000a1"}
      - {at: developer, text: from the start, color: "#0000a2", when: start}
      - {at: [100, 420], text: kept to the end, color: "#0000a3", keep: true}
  - caption: Still.
  - caption: Last.
    zoom: [developer]
`;

let browser, page, starts, total;
const S = (n) => ({ start: starts[n - 1], end: n < starts.length ? starts[n] : total });
const len = (n) => S(n).end - S(n).start;

before(async () => {
  const dir = tmp();
  const f = flowFile(dir, "x.flow.yaml", FLOW);
  const r = cli([f, "--formats", "svg"]);
  assert.equal(r.code, 0, r.err);
  const svg = fs.readFileSync(path.join(dir, "x.svg"), "utf8");
  ({ steps: starts, total } = meta(svg));
  const exe = process.env.SKETCHFLOW_CHROME;
  browser = await chromium.launch(exe ? { executablePath: exe } : { channel: "chrome" });
  page = await browser.newPage();
  await page.setContent(`<html><body>${svg}</body></html>`);
  await page.evaluate(() => {
    const root = document.querySelector("svg");
    root.pauseAnimations();
    const stage = root.querySelector("g.sf-stage");
    const shown = (el) => { for (let e = el; e && e !== root; e = e.parentElement) if (+getComputedStyle(e).opacity === 0) return false; return true; };
    const inStage = (el) => { const m = stage.getCTM().inverse().multiply(el.getCTM()); return [m.e, m.f]; };
    const tokenOf = (color) => document.querySelector(`circle[fill="${color}"]`).parentElement;
    const textOf = (s) => [...root.querySelectorAll("text")].find((t) => t.textContent === s);
    // Everything the checks read at one moment.
    window.probe = (t, colors, texts) => {
      root.setCurrentTime(t);
      const m = stage.getCTM();
      const out = { cam: [m.a, m.e, m.f], tokens: {}, texts: {} };
      for (const c of colors) {
        const g = tokenOf(c), d = root.querySelector(`path[stroke="${c}"]`).getAttribute("d");
        const end = d.split(" L").pop().replace(/^M/, "").split(" ").map(Number);
        const [x, y] = inStage(g);
        out.tokens[c] = { shown: shown(g), at: [x, y], arrived: Math.hypot(x - end[0], y - end[1]) < 1 };
      }
      for (const s of texts) {
        const tx = textOf(s);
        const rects = tx.getAttribute("clip-path") ? [...document.querySelectorAll(`${tx.getAttribute("clip-path").slice(4, -1)} rect`)] : [];
        const written = rects.length ? rects.every((r, i) => r.width.animVal.value >= tx.children[i].getComputedTextLength()) : true;
        const begun = rects.length ? rects[0].width.animVal.value > 0 : true;
        out.texts[s] = { shown: shown(tx), begun, written };
      }
      return out;
    };
  });
});
after(() => browser?.close());

const at = (t, colors = [], texts = []) => page.evaluate(([t, c, x]) => window.probe(t, c, x), [t, colors, texts]);
// Samples every 50 ms over [t0, t1).
async function samples(t0, t1, colors = [], texts = []) {
  const out = [];
  for (let t = t0; t < t1; t += 0.05) out.push({ t, ...(await at(t, colors, texts)) });
  return out;
}
const first = (ss, pred) => ss.find(pred)?.t;
const sameCam = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 0.01);
const RED = "#aa0000", GREEN = "#00aa00";
const NOTES = ["after the flows", "from the start", "kept to the end"];

let busy;
async function step5() {
  busy ??= samples(S(5).start, S(5).end, [RED, GREEN], [...NOTES, "badged"]);
  return busy;
}

test("steps.md#B1 a short step with nothing else and no seconds lasts 3 s", () => {
  assert.ok(Math.abs(len(2) - 3) < 0.01, `${len(2)}`);
});

test("steps.md#B2 seconds: 6 makes the same step last 6 s", () => {
  assert.ok(Math.abs(len(3) - 6) < 0.01, `${len(3)}`);
});

test("steps.md#B3 a step lasts until its caption is typed, plus at least 1 s", () => {
  assert.ok(len(4) >= LONG.length / 55 + 1, `${len(4)}`);
  assert.ok(len(4) > 3);
});

test("steps.md#B4 a step lasts until its last token has arrived and its last note is written, plus 1 s", async () => {
  const ss = await step5();
  const arrived = first(ss, (s) => s.tokens[GREEN].arrived);
  const written = first(ss, (s) => NOTES.every((n) => s.texts[n].written));
  assert.ok(arrived !== undefined && written !== undefined);
  assert.ok(S(5).end - Math.max(arrived, written) >= 1, `${S(5).end} vs ${arrived}, ${written}`);
});

test("steps.md#B5 a step with zoom moves the camera for 0.9 s, then holds it", async () => {
  const { start, end } = S(5);
  const before = (await at(start - 0.01)).cam, mid = (await at(start + 0.45)).cam;
  const arrived = (await at(start + 0.9)).cam, later = (await at(end - 0.01)).cam;
  assert.ok(sameCam(arrived, later));
  assert.ok(!sameCam(mid, before) && !sameCam(mid, arrived));
  assert.ok(!sameCam(before, arrived));
});

test("steps.md#B6 a step without zoom keeps the camera where the step before left it", async () => {
  const left = (await at(S(5).end - 0.01)).cam;
  for (const t of [S(6).start + 0.01, S(6).start + 0.45, S(6).end - 0.01]) assert.ok(sameCam((await at(t)).cam, left), `at ${t}`);
});

test("steps.md#B7 without draw, the camera ends the loop where it begins it", async () => {
  assert.ok(sameCam((await at(total - 0.001)).cam, (await at(0)).cam));
});

test("steps.md#B8 no token moves until the camera has arrived", async () => {
  const ss = await step5();
  const moved = first(ss, (s) => s.tokens[RED].shown);
  assert.ok(moved >= S(5).start + 0.9, `${moved}`);
});

test("steps.md#B9 the second token appears only once the first has arrived", async () => {
  const ss = await step5();
  const second = first(ss, (s) => s.tokens[GREEN].shown);
  const firstArrived = first(ss, (s) => s.tokens[RED].arrived && s.tokens[RED].shown);
  assert.ok(second !== undefined && firstArrived !== undefined);
  assert.ok(second >= firstArrived, `${second} vs ${firstArrived}`);
});

test("steps.md#B10 a badge appears once the last token has arrived, and stays to the step's end", async () => {
  const ss = await step5();
  const arrived = first(ss, (s) => s.tokens[GREEN].arrived);
  const shown = first(ss, (s) => s.texts.badged.shown);
  assert.ok(shown >= arrived - 0.05, `${shown} vs ${arrived}`);
  assert.ok(ss.filter((s) => s.t >= shown).every((s) => s.texts.badged.shown));
});

test("steps.md#B11 a note starts writing after the last token arrives; with when: start, before", async () => {
  const ss = await step5();
  const arrived = first(ss, (s) => s.tokens[GREEN].arrived);
  const after = first(ss, (s) => s.texts["after the flows"].shown && s.texts["after the flows"].begun);
  const early = first(ss, (s) => s.texts["from the start"].shown && s.texts["from the start"].begun);
  assert.ok(after >= arrived - 0.05, `${after} vs ${arrived}`);
  assert.ok(early < arrived, `${early} vs ${arrived}`);
});

test("steps.md#B12 a note is gone once its step ends; with keep: true it stays to the loop's end", async () => {
  for (const t of [S(6).start + 0.05, S(7).start + 0.05, total - 0.01]) {
    const s = await at(t, [], NOTES);
    assert.equal(s.texts["after the flows"].shown, false, `at ${t}`);
    assert.equal(s.texts["from the start"].shown, false, `at ${t}`);
    assert.equal(s.texts["kept to the end"].shown, true, `at ${t}`);
  }
});
