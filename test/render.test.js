// Renders the example to an animated SVG and an HTML player, and checks the
// SVG keeps one clock: every animation spans the loop, and seeking to a
// step shows that step. Needs Chrome (SKETCHFLOW_CHROME or Google Chrome).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";
import { render } from "../src/index.js";

const flow = new URL("../examples/deploy/deploy.flow.yaml", import.meta.url).pathname;
const exe = process.env.SKETCHFLOW_CHROME;

test("the example compiles to one animated SVG and a player", async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "sketchflow-test-"));
  const { files } = await render(flow, { formats: ["svg", "html"], outDir: out });
  assert.equal(files.length, 2);
  const svg = fs.readFileSync(files[0], "utf8");
  const meta = JSON.parse(svg.match(/data-sketchflow="([^"]+)"/)[1].replace(/&quot;/g, '"'));
  assert.equal(meta.steps.length, 5);
  assert.ok(!/<svg[^>]*>[\s\S]*<svg/.test(svg.replace(/^<svg/, "")), "no nested <svg>: it would run a clock of its own");
  for (const m of svg.matchAll(/<animate(?:Transform|Motion)?\b[^>]*>/g)) {
    assert.match(m[0], /repeatCount="indefinite"/);
    assert.match(m[0], new RegExp(`dur="${meta.total.toFixed(3)}s"`));
  }
  assert.match(fs.readFileSync(files[1], "utf8"), /setCurrentTime/);

  const browser = await chromium.launch(exe ? { executablePath: exe } : { channel: "chrome" });
  const page = await browser.newPage();
  await page.setContent(`<html><body>${svg}</body></html>`);
  const shownAt = await page.evaluate(async (starts) => {
    const root = document.querySelector("svg");
    root.pauseAnimations();
    const out = [];
    for (const t of starts) {
      root.setCurrentTime(t + 0.5);
      await new Promise((r) => requestAnimationFrame(r));
      out.push([...root.querySelectorAll("g.sf-step")].findIndex((g) => getComputedStyle(g).opacity === "1"));
    }
    return out;
  }, meta.steps);
  await browser.close();
  assert.deepEqual(shownAt, [0, 1, 2, 3, 4]);
});

test("draw: the diagram draws itself in before the first step", async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "sketchflow-test-"));
  const scene = new URL("../examples/deploy/deploy.excalidraw", import.meta.url).pathname;
  const f = path.join(out, "drawn.flow.yaml");
  fs.writeFileSync(f, `scene: ${JSON.stringify(scene)}\ndraw: 2\nsteps:\n  - caption: One step.\n    focus: [developer]\n`);
  const { files } = await render(f, { formats: ["svg"], outDir: out });
  const svg = fs.readFileSync(files[0], "utf8");
  const meta = JSON.parse(svg.match(/data-sketchflow="([^"]+)"/)[1].replace(/&quot;/g, '"'));
  assert.deepEqual(meta.steps, [2]);
  assert.match(svg, /attributeName="stroke-dashoffset"/);
});
