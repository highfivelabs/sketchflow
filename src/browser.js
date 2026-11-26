// Headless Chrome, with @excalidraw/utils served to it from node_modules:
// Excalidraw's own export, and the page the compiler and frame grabber use.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
// The node_modules folder holding @excalidraw/utils (its package.json is not
// exported, so found from its entry point).
const entry = require.resolve("@excalidraw/utils");
const modules = entry.slice(0, entry.lastIndexOf("node_modules") + "node_modules".length);
const types = { ".js": "text/javascript", ".ttf": "font/ttf", ".woff2": "font/woff2" };

export async function openBrowser({ chrome } = {}) {
  const server = http.createServer((req, res) => {
    if (req.url === "/") { res.setHeader("content-type", "text/html"); return res.end("<!doctype html><html><body></body></html>"); }
    const p = path.join(modules, decodeURIComponent(req.url.split("?")[0]));
    if (!p.startsWith(modules) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; return res.end(); }
    res.setHeader("content-type", types[path.extname(p)] ?? "application/octet-stream");
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const exe = chrome ?? process.env.SKETCHFLOW_CHROME;
  let browser;
  try {
    browser = await chromium.launch(exe ? { executablePath: exe } : { channel: "chrome" });
  } catch (e) {
    server.close();
    throw new Error("sketchflow needs Chrome or Chromium: install Google Chrome, or pass --chrome <path> " +
      "(or SKETCHFLOW_CHROME), such as a binary from `npx playwright install chromium-headless-shell`.\n" + e.message);
  }
  const page = await browser.newPage();
  page.on("console", (m) => { if (m.type() === "error") console.error("browser:", m.text()); });
  await page.goto(base + "/");
  return { browser, page, base, close: async () => { await browser.close(); server.close(); } };
}

// Excalidraw's own SVG export of a scene, fonts embedded. `glyphs` are
// characters the animation will draw that the scene may not: Excalidraw
// embeds only the glyphs a scene uses, so an invisible text element carries
// them into the font.
export async function exportScene(page, base, scene, glyphs, padding) {
  return page.evaluate(async ({ scene, glyphs, base, padding }) => {
    window.EXCALIDRAW_ASSET_PATH = base + "/@excalidraw/utils/dist/prod/";
    const m = await import(base + "/@excalidraw/utils/dist/prod/index.js");
    const live = scene.elements.filter((e) => !e.isDeleted);
    const first = live.find((e) => e.type === "text") ?? live[0];
    let minX = Infinity, minY = Infinity;
    for (const e of live) for (const [px, py] of e.points ?? [[0, 0]]) { minX = Math.min(minX, e.x + px); minY = Math.min(minY, e.y + py); }
    const carrier = {
      ...first, type: "text", id: "sketchflow-glyphs", x: minX, y: minY, width: 1, height: 1, angle: 0,
      text: glyphs, originalText: glyphs, fontSize: 1, fontFamily: 5, opacity: 0, containerId: null,
      boundElements: [], groupIds: [], frameId: null, lineHeight: 1.25, textAlign: "left", verticalAlign: "top",
      autoResize: false, strokeColor: "#000000", backgroundColor: "transparent", isDeleted: false, link: null, locked: false,
    };
    const appState = { viewBackgroundColor: scene.appState?.viewBackgroundColor ?? "#ffffff", exportBackground: true, exportWithDarkMode: false };
    const svg = await m.exportScene({ type: "svg", data: { elements: [...live, carrier], appState, files: scene.files ?? {} },
      config: { embedScene: false, padding } });
    const vb = svg.getAttribute("viewBox").split(/\s+/).map(Number);
    return { svg: svg.outerHTML, W: vb[2], H: vb[3], minX, minY };
  }, { scene, glyphs, base, padding });
}
