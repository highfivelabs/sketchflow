// L0 checks for spec/specs/svg.md, on the deploy example.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { cli, example, meta, tmp } from "./helpers.js";

let svg, run;
before(() => {
  const out = tmp();
  run = cli([example, "--formats", "svg", "--out", out]);
  assert.equal(run.code, 0, run.err);
  svg = fs.readFileSync(path.join(out, "deploy.svg"), "utf8");
});

test("svg.md#B1 one root <svg> and no nested <svg>", () => {
  assert.match(svg, /^<svg\b/);
  assert.equal((svg.match(/<svg\b/g) ?? []).length, 1);
});

test("svg.md#B2 every animation repeats indefinitely and lasts exactly the loop", () => {
  const { total } = meta(svg);
  const anims = [...svg.matchAll(/<animate(?:Transform|Motion)?\b[^>]*>/g)];
  assert.ok(anims.length > 0);
  for (const [a] of anims) {
    assert.match(a, /repeatCount="indefinite"/);
    assert.match(a, new RegExp(`dur="${total.toFixed(3)}s"`));
  }
});

test("svg.md#B3 paused half a second into each step, that step and only it is shown", async () => {
  const { steps } = meta(svg);
  const exe = process.env.SKETCHFLOW_CHROME;
  const browser = await chromium.launch(exe ? { executablePath: exe } : { channel: "chrome" });
  try {
    const page = await browser.newPage();
    await page.setContent(`<html><body>${svg}</body></html>`);
    const shown = await page.evaluate(async (starts) => {
      const root = document.querySelector("svg");
      root.pauseAnimations();
      const out = [];
      for (const t of starts) {
        root.setCurrentTime(t + 0.5);
        await new Promise((r) => requestAnimationFrame(r));
        out.push([...root.querySelectorAll("g.sf-step")].map((g) => getComputedStyle(g).opacity === "1"));
      }
      return out;
    }, steps);
    shown.forEach((row, i) => assert.deepEqual(row, row.map((_, j) => j === i), `at step ${i + 1}`));
  } finally {
    await browser.close();
  }
});

test("svg.md#B4 rendering twice gives the same SVG, byte for byte", () => {
  const out = tmp();
  const r = cli([example, "--formats", "svg", "--out", out]);
  assert.equal(r.code, 0, r.err);
  assert.equal(fs.readFileSync(path.join(out, "deploy.svg"), "utf8"), svg);
});

test("svg.md#B5 a successful render prints nothing on stderr", () => {
  assert.equal(run.err, "");
});
