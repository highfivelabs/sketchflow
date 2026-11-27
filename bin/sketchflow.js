#!/usr/bin/env node
// sketchflow <flow.yaml>... [--formats svg,html,mp4,webm,gif] [--out <dir>] [--chrome <path>] [--gif-encoder gifski|ffmpeg]
// The contract is spec/specs/cli.md.
import fs from "node:fs";
import { render, FORMATS, GIF_ENCODERS } from "../src/index.js";

const { version } = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const args = process.argv.slice(2);
const flows = [], opts = {};
const fail = (msg) => { console.error(msg); usage(); process.exit(2); };
const value = (i) => {
  const v = args[i + 1];
  if (v === undefined || v.startsWith("--")) fail(`${args[i]} needs a value`);
  return v;
};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--formats") opts.formats = value(i++).split(",").map((s) => s.trim()).filter(Boolean);
  else if (a === "--out") opts.outDir = value(i++);
  else if (a === "--chrome") opts.chrome = value(i++);
  else if (a === "--gif-encoder") opts.gifEncoder = value(i++);
  else if (a === "-h" || a === "--help") { usage(); process.exit(0); }
  else if (a === "--version") { console.log(`sketchflow ${version}`); process.exit(0); }
  else if (a.startsWith("-")) fail(`unknown option ${a}`);
  else flows.push(a);
}
if (!flows.length) { usage(); process.exit(2); }

function usage() {
  console.error(`usage: sketchflow <flow.yaml>... [--formats ${FORMATS.join(",")}] [--out <dir>] [--chrome <path>]
       [--gif-encoder ${GIF_ENCODERS.join("|")}]
       sketchflow --version | --help

Compiles each flow over its Excalidraw scene into an animated SVG, and from
it an HTML player, MP4, WebM and GIF (these three need ffmpeg). Formats
default to the flow's \`formats\`, else svg,html. GIFs use gifski when it is
on the PATH, else ffmpeg. Chrome: --chrome, SKETCHFLOW_CHROME, or an
installed Google Chrome. SKETCHFLOW_DEBUG=1 shows the browser's messages.`);
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
