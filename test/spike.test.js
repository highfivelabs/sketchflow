// v0.1 checks not yet tied to a behavior. Each moves to a level's check
// file when that level writes its behavior (draw-in: steps.md, L2.4), and
// this file goes away. harness/guard.js reports these as untagged.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { render } from "../src/index.js";
import { meta, scene, tmp } from "./helpers.js";

test("draw: the diagram draws itself in before the first step", async () => {
  const out = tmp();
  const f = path.join(out, "drawn.flow.yaml");
  fs.writeFileSync(f, `scene: ${JSON.stringify(scene)}\ndraw: 2\nsteps:\n  - caption: One step.\n    focus: [developer]\n`);
  const { files } = await render(f, { formats: ["svg"], outDir: out });
  const svg = fs.readFileSync(files[0], "utf8");
  assert.deepEqual(meta(svg).steps, [2]);
  assert.match(svg, /attributeName="stroke-dashoffset"/);
});
