// sketchflow: a flow over an Excalidraw diagram, compiled to one animated
// SVG; the HTML player, MP4, WebM and GIF are made from that SVG.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import YAML from "yaml";
import { loadScene } from "./scene.js";
import { timeline, glyphs } from "./timeline.js";
import { compile } from "./compile.js";
import { player } from "./player.js";
import { openBrowser, exportScene } from "./browser.js";

export const FORMATS = ["svg", "html", "mp4", "webm", "gif"];
export const GIF_ENCODERS = ["gifski", "ffmpeg"];
const PADDING = 24;

// render("deploy.flow.yaml", { formats, outDir, chrome, gifEncoder }) writes
// <outDir>/<output>.<format> for each format and returns their paths.
export async function render(flowPath, opts = {}) {
  // Errors name what is wrong in the flow's terms; the CLI names the flow.
  const flow = YAML.parse(readText(flowPath, "no such file")) ?? {};
  const dir = path.dirname(path.resolve(flowPath));
  if (!flow.scene) throw new Error("no scene (the .excalidraw file, relative to the flow)");
  const scenePath = path.resolve(dir, flow.scene);
  const sceneJson = JSON.parse(readText(scenePath, `no scene file ${flow.scene}`));
  const formats = opts.formats ?? flow.formats ?? ["svg", "html"];
  for (const f of formats) if (!FORMATS.includes(f)) throw new Error(`unknown format "${f}": ${FORMATS.join(", ")}`);
  const gifEncoder = opts.gifEncoder ?? (onPath("gifski") ? "gifski" : "ffmpeg");
  if (!GIF_ENCODERS.includes(gifEncoder)) throw new Error(`unknown gif encoder "${gifEncoder}": ${GIF_ENCODERS.join(", ")}`);
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
    if (["mp4", "webm", "gif"].some((f) => formats.includes(f))) {
      const fps = flow.fps ?? 12;
      const frames = await grab(b.page, svg, tl.total, fps);
      try {
        const input = ["-v", "error", "-y", "-framerate", String(fps), "-i", path.join(frames, "f%05d.png")];
        const video = (ext, codec) => {
          ffmpeg([...input, "-vf", `scale=${flow[ext]?.width ?? 1600}:-2:flags=lanczos`, ...codec, "-pix_fmt", "yuv420p", `${outBase}.${ext}`]);
          written.push(`${outBase}.${ext}`);
        };
        if (formats.includes("mp4")) video("mp4", ["-c:v", "libx264", "-crf", "24", "-preset", "slow", "-tune", "animation", "-movflags", "+faststart"]);
        if (formats.includes("webm")) video("webm", ["-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-row-mt", "1"]);
        if (formats.includes("gif")) {
          const gfps = flow.gif?.fps ?? 8, gw = flow.gif?.width ?? 1100;
          if (gifEncoder === "gifski") {
            // gifski plays the frames it is given at --fps, so take every
            // (fps / gif fps)th frame. --quality 100: below it, gifski's
            // lossy inter-frame compression leaves faint ghosts of text that
            // has faded out (seen on the deploy example's draw-in).
            const all = fs.readdirSync(frames).filter((f) => f.endsWith(".png")).sort();
            const pick = [...new Set(Array.from({ length: Math.ceil((all.length * gfps) / fps) }, (_, i) => all[Math.min(all.length - 1, Math.round((i * fps) / gfps))]))];
            run("gifski", ["--quiet", "--quality", "100", "--fps", String(gfps), "--width", String(gw), "-o", `${outBase}.gif`, ...pick.map((f) => path.join(frames, f))]);
          } else {
            ffmpeg([...input, "-vf", `fps=${gfps},scale=${gw}:-1:flags=lanczos,split[a][b];` +
              "[a]palettegen=max_colors=96:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle", "-loop", "0", `${outBase}.gif`]);
          }
          written.push(`${outBase}.gif`);
        }
      } finally {
        fs.rmSync(frames, { recursive: true, force: true });
      }
    }
  } catch (e) {
    // The browser's own messages help only when something went wrong.
    if (!process.env.SKETCHFLOW_DEBUG) for (const m of b.logs) console.error("browser:", m);
    throw e;
  } finally {
    await b.close();
  }
  return { files: written };
}

function readText(p, missing) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") throw new Error(missing);
    throw e;
  }
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

const onPath = (cmd) => !spawnSync(cmd, ["--version"], { stdio: "ignore" }).error;
const ffmpeg = (args) => run("ffmpeg", args);

function run(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: ["ignore", "inherit", "inherit"] });
  } catch (e) {
    if (e.code === "ENOENT") throw new Error(cmd === "ffmpeg" ? "mp4, webm and gif need ffmpeg on the PATH" : `${cmd} is not on the PATH`);
    throw e;
  }
}
