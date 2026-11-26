// sketchflow: a flow over an Excalidraw diagram, compiled to one animated
// SVG; the HTML player, MP4 and GIF are made from that SVG.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import YAML from "yaml";
import { loadScene } from "./scene.js";
import { timeline, glyphs } from "./timeline.js";
import { compile } from "./compile.js";
import { player } from "./player.js";
import { openBrowser, exportScene } from "./browser.js";

export const FORMATS = ["svg", "html", "mp4", "gif"];
const PADDING = 24;

// render("deploy.flow.yaml", { formats, outDir, chrome }) writes
// <outDir>/<output>.<format> for each format and returns their paths.
export async function render(flowPath, opts = {}) {
  const flow = YAML.parse(fs.readFileSync(flowPath, "utf8"));
  const dir = path.dirname(path.resolve(flowPath));
  if (!flow.scene) throw new Error(`${flowPath}: no scene (the .excalidraw file, relative to the flow)`);
  const scenePath = path.resolve(dir, flow.scene);
  const sceneJson = JSON.parse(fs.readFileSync(scenePath, "utf8"));
  const formats = opts.formats ?? flow.formats ?? ["svg", "html"];
  for (const f of formats) if (!FORMATS.includes(f)) throw new Error(`unknown format "${f}": ${FORMATS.join(", ")}`);
  const outDir = path.resolve(opts.outDir ?? dir);
  const name = flow.output ?? path.basename(flowPath).replace(/(\.flow)?\.ya?ml$/, "");
  const outBase = path.join(outDir, name);
  fs.mkdirSync(outDir, { recursive: true });

  const scene = loadScene(sceneJson);
  const b = await openBrowser({ chrome: opts.chrome });
  const written = [];
  try {
    const ex = await exportScene(b.page, b.base, sceneJson, glyphs(flow), PADDING);
    const shift = [PADDING - ex.minX, PADDING - ex.minY];
    const tl = timeline(flow, scene, shift, [ex.W, ex.H]);
    const svg = await b.page.evaluate(`(${compile.toString()})(${JSON.stringify({ svgText: ex.svg, tl, W: ex.W, H: ex.H })})`);
    const write = (ext, data) => { fs.writeFileSync(`${outBase}.${ext}`, data); written.push(`${outBase}.${ext}`); };
    if (formats.includes("svg")) write("svg", svg + "\n");
    if (formats.includes("html")) write("html", player(svg, flow.title));
    if (formats.includes("mp4") || formats.includes("gif")) {
      const frames = await grab(b.page, svg, tl.total, flow.fps ?? 12);
      try {
        const input = ["-v", "error", "-y", "-framerate", String(flow.fps ?? 12), "-i", path.join(frames, "f%05d.png")];
        if (formats.includes("mp4")) {
          ffmpeg([...input, "-vf", `scale=${flow.mp4?.width ?? 1600}:-2:flags=lanczos`, "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-crf", "24", "-preset", "slow", "-tune", "animation", "-movflags", "+faststart", `${outBase}.mp4`]);
          written.push(`${outBase}.mp4`);
        }
        if (formats.includes("gif")) {
          ffmpeg([...input, "-vf", `fps=${flow.gif?.fps ?? 8},scale=${flow.gif?.width ?? 1100}:-1:flags=lanczos,split[a][b];` +
            "[a]palettegen=max_colors=96:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle", "-loop", "0", `${outBase}.gif`]);
          written.push(`${outBase}.gif`);
        }
      } finally {
        fs.rmSync(frames, { recursive: true, force: true });
      }
    }
  } finally {
    await b.close();
  }
  return { files: written };
}

// Frames of the animated SVG itself: paused, set to each frame's time by its
// own SMIL clock, and screenshotted.
async function grab(page, svg, total, fps) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sketchflow-"));
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:#fff}svg{display:block}</style></head><body>${svg}</body></html>`);
  const [w, h] = await page.evaluate(() => { const s = document.querySelector("svg"); s.pauseAnimations(); return [s.width.baseVal.value, s.height.baseVal.value]; });
  await page.setViewportSize({ width: Math.ceil(w), height: Math.ceil(h) });
  await page.evaluate(() => document.fonts.ready);
  const el = await page.$("svg");
  const n = Math.ceil(total * fps);
  for (let i = 0; i < n; i++) {
    await page.evaluate((t) => new Promise((r) => { document.querySelector("svg").setCurrentTime(t); requestAnimationFrame(r); }), i / fps);
    await el.screenshot({ path: path.join(dir, `f${String(i).padStart(5, "0")}.png`) });
  }
  return dir;
}

function ffmpeg(args) {
  try {
    execFileSync("ffmpeg", args, { stdio: ["ignore", "inherit", "inherit"] });
  } catch (e) {
    if (e.code === "ENOENT") throw new Error("mp4 and gif need ffmpeg on the PATH");
    throw e;
  }
}
