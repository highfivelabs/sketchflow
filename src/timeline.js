// A flow, worked out into a timeline: when each step starts and ends, where
// the camera is, when each token moves along which points, and when each
// badge and note appears. Times are seconds; coordinates are the exported
// SVG's (the scene's, shifted by `shift`).
import { boxOf, center, edge } from "./scene.js";

const SPEED = 520, MIN_HOP = 0.7, GAP = 0.25, HOLD = 2.2, LEAD = 0.3;
export const ZOOM = 0.9;

export function timeline(flow, scene, shift, size) {
  const [sx, sy] = shift, [W, H] = size;
  const toSvg = ([x, y]) => [x + sx, y + sy];
  const box = (ref) => { const b = boxOf(scene.find(ref)); return { x: b.x + sx, y: b.y + sy, w: b.w, h: b.h }; };
  const len = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

  const hop = (from, to, via) => {
    const a = scene.find(from).id, b = scene.find(to).id;
    if (!via) {
      const drawn = scene.arrowBetween(a, b);
      if (drawn) return drawn.map(toSvg);
    }
    const A = box(from), B = box(to), bends = (via ?? []).map(toSvg);
    const first = bends[0] ?? center(B), last = bends[bends.length - 1] ?? center(A);
    return [edge(A, first), ...bends, edge(B, last)];
  };

  const FULL = [0, 0, W, H];
  const view = (zoom, pad = 50) => {
    if (zoom === "all") return FULL;
    const bs = [].concat(zoom).map(box);
    let x0 = Math.min(...bs.map((b) => b.x)) - pad, y0 = Math.min(...bs.map((b) => b.y)) - pad;
    const x1 = Math.max(...bs.map((b) => b.x + b.w)) + pad, y1 = Math.max(...bs.map((b) => b.y + b.h)) + pad;
    let w = x1 - x0, h = y1 - y0;
    if (w / h < W / H) { const nw = (h * W) / H; x0 -= (nw - w) / 2; w = nw; } else { const nh = (w * H) / W; y0 -= (nh - h) / 2; h = nh; }
    if (w >= W) return FULL;
    return [Math.max(0, Math.min(x0, W - w)), Math.max(0, Math.min(y0, H - h)), w, h];
  };

  const typing = flow.typing ?? 55, writing = flow.writing ?? 28;
  // `draw: true` (or seconds) draws the diagram in before the first step.
  const draw = flow.draw === true ? 3 : Number(flow.draw) || 0;
  let t = draw, cam = FULL;
  const steps = (flow.steps ?? []).map((st, i) => {
    if (!st.caption) throw new Error(`step ${i + 1} has no caption`);
    const start = t, from = cam;
    if (st.zoom) cam = view(st.zoom, st.zoomPad);
    const moved = from.join() !== cam.join();
    const ready = start + LEAD + (moved ? ZOOM : 0);
    let ft = ready;
    const flows = (st.flows ?? []).map((f) => {
      const nodes = f.path;
      const pts = [];
      for (let k = 0; k + 1 < nodes.length; k++) {
        const seg = hop(nodes[k], nodes[k + 1], nodes.length === 2 ? f.via : undefined);
        pts.push(...(pts.length ? seg.slice(1) : seg));
      }
      const dur = Math.max(MIN_HOP * (nodes.length - 1), len(pts) / SPEED);
      const out = { pts, label: f.label ?? "", t0: ft, t1: ft + dur, color: f.color ?? "#e03131" };
      ft += dur + GAP;
      return out;
    });
    const badges = (st.badges ?? []).map((b) => ({ text: b.text, side: b.side ?? "bottom", box: box(b.at), t0: ft }));
    let wt = ft;
    const notes = (st.write ?? []).map((n) => {
      const t0 = n.when === "start" ? ready : wt, t1 = t0 + n.text.length / writing;
      if (n.when !== "start") wt = t1 + GAP;
      return { text: n.text, size: n.size ?? 18, color: n.color ?? "#1971c2", side: n.side ?? "bottom",
        box: typeof n.at === "string" ? box(n.at) : null, xy: typeof n.at === "string" ? null : toSvg(n.at),
        t0, t1, keep: !!n.keep };
    });
    const named = [...(st.flows ?? []).flatMap((f) => f.path), ...(st.badges ?? []).map((b) => b.at),
      ...(st.write ?? []).filter((n) => typeof n.at === "string").map((n) => n.at)];
    const focus = [...new Set(st.focus ?? named)].map(box);
    const end = Math.max(start + (st.seconds ?? 3), ft + HOLD, wt + HOLD, start + (typing ? st.caption.length / typing : 0) + 1.6);
    t = end;
    return { start, end, caption: st.caption, focus, flows, badges, notes, from, view: cam };
  });
  if (!steps.length) throw new Error("a flow needs at least one step");
  const total = t;
  for (const s of steps) for (const n of s.notes) n.until = n.keep ? total : s.end;
  // The last step's camera eases back to the first's; after a draw-in, the
  // first step starts from the whole diagram.
  if (!draw) steps[0].from = cam;
  return { steps, total, draw, typing, writing, title: flow.title ?? "" };
}

// Every character the flow will draw, so the exported font carries them.
export function glyphs(flow) {
  const s = new Set(" 0123456789/·…✓");
  const add = (x) => { for (const c of String(x ?? "")) s.add(c); };
  add(flow.title);
  for (const st of flow.steps ?? []) {
    add(st.caption);
    for (const f of st.flows ?? []) add(f.label);
    for (const b of st.badges ?? []) add(b.text);
    for (const n of st.write ?? []) add(n.text);
  }
  return [...s].filter((c) => c !== "\n").join("");
}
