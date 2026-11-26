#!/usr/bin/env node
// sketchflow <flow.yaml>... [--formats svg,html,mp4,gif] [--out <dir>] [--chrome <path>]
import { render, FORMATS } from "../src/index.js";

const args = process.argv.slice(2);
const flows = [], opts = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--formats") opts.formats = args[++i].split(",").map((s) => s.trim()).filter(Boolean);
  else if (a === "--out") opts.outDir = args[++i];
  else if (a === "--chrome") opts.chrome = args[++i];
  else if (a === "-h" || a === "--help") { usage(); process.exit(0); }
  else if (a.startsWith("-")) { console.error(`unknown option ${a}`); usage(); process.exit(2); }
  else flows.push(a);
}
if (!flows.length) { usage(); process.exit(2); }

function usage() {
  console.error(`usage: sketchflow <flow.yaml>... [--formats ${FORMATS.join(",")}] [--out <dir>] [--chrome <path>]

Compiles each flow over its Excalidraw scene into an animated SVG, and from
it an HTML player, MP4 and GIF (mp4 and gif need ffmpeg). Formats default to
the flow's \`formats\`, else svg,html. Chrome: --chrome, SKETCHFLOW_CHROME,
or an installed Google Chrome.`);
}

for (const f of flows) {
  try {
    const { files } = await render(f, opts);
    for (const out of files) console.log(out);
  } catch (e) {
    console.error(`${f}: ${e.message}`);
    process.exitCode = 1;
  }
}
