// Shared by the checks: run the real CLI, make scratch folders, read an
// SVG's recorded timing. No mocks (decisions.md, D3).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const root = new URL("..", import.meta.url).pathname;
export const example = path.join(root, "examples/deploy/deploy.flow.yaml");
export const scene = path.join(root, "examples/deploy/deploy.excalidraw");

export const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "sketchflow-check-"));

// sketchflow <args>, as a person runs it.
export function cli(args, opts = {}) {
  const r = spawnSync(process.execPath, [path.join(root, "bin/sketchflow.js"), ...args],
    { encoding: "utf8", timeout: 120_000, ...opts });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// A flow file in `dir` over the example's diagram.
export function flowFile(dir, name, body) {
  const f = path.join(dir, name);
  fs.writeFileSync(f, `scene: ${JSON.stringify(scene)}\n${body}`);
  return f;
}

export const meta = (svg) => JSON.parse(svg.match(/data-sketchflow="([^"]+)"/)[1].replace(/&quot;/g, '"'));
