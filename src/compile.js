// The compiler: a timeline over an exported diagram, written out as one
// animated SVG (SMIL). It runs in the browser, which measures text, and must
// not reach anything outside itself: index.js passes it as source.
//
// Every animation spans the whole loop (begin 0, dur = the loop, repeating),
// with its own keyTimes, so the loop stays in step and setCurrentTime(t)
// shows exactly the frame at t: the player and the frame grabber rely on it.
export function compile({ svgText, tl, W, H }) {
  const NS = "http://www.w3.org/2000/svg";
  const T = tl.total;
  const mk = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    if (parent) parent.appendChild(el);
    return el;
  };
  const LOOP = { begin: "0s", dur: `${T.toFixed(3)}s`, repeatCount: "indefinite" };
  const kt = (t) => (Math.min(T, Math.max(0, t)) / T).toFixed(5);
  const EASE = "0.42 0 0.58 1", LINEAR = "0 0 1 1";

  // A value that jumps at given times: pairs [[t, v], ...], the first at 0.
  const steps = (target, attr, pairs) => {
    const ps = [];
    for (const [t, v] of pairs) {
      if (t >= T) continue;
      if (ps.length && Math.abs(ps[ps.length - 1][0] - t) < 1e-4) ps[ps.length - 1] = [t, v];
      else ps.push([t, v]);
    }
    if (ps[0][0] > 0) ps.unshift([0, ps[0][1]]);
    mk("animate", { attributeName: attr, calcMode: "discrete", keyTimes: ps.map(([t]) => kt(t)).join(";"),
      values: ps.map(([, v]) => v).join(";"), ...LOOP }, target);
  };
  // Shown from t0 until t1 (or the loop's end).
  const shown = (target, t0, t1 = T, on = 1) => {
    target.setAttribute("opacity", "0");
    steps(target, "opacity", t0 <= 1e-4 ? [[0, on], [t1, 0]] : [[0, 0], [t0, on], [t1, 0]]);
  };
  // A value that moves between keyframes [[t, v, eased], ...], eased or not
  // on the way into each.
  const moves = (target, attr, frames, tag = "animate", key = "values") => {
    const fs = [...frames];
    if (fs[0][0] > 0) fs.unshift([0, fs[0][1], false]);
    if (fs[fs.length - 1][0] < T) fs.push([T, fs[fs.length - 1][1], false]);
    const a = { calcMode: "spline", keyTimes: fs.map(([t]) => kt(t)).join(";"), [key]: fs.map(([, v]) => v).join(";"),
      keySplines: fs.slice(1).map(([, , e]) => (e ? EASE : LINEAR)).join(";"), ...LOOP };
    if (tag === "animate") a.attributeName = attr;
    return mk(tag, a, target);
  };

  // Layout: the diagram on top, a caption bar under it.
  const src = new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement;
  const root = mk("svg", { xmlns: NS, width: W });
  document.body.appendChild(root);
  // The diagram sits in a clipped group, not a nested <svg>: browsers give
  // a nested <svg> a clock of its own, which pausing and seeking the outer
  // one does not move. The camera is a transform on the group inside.
  const rootDefs = mk("defs", {}, root);
  const frame = mk("clipPath", { id: "sf-frame" }, rootDefs);
  mk("rect", { x: 0, y: 0, width: W, height: H }, frame);
  const view = mk("g", { "clip-path": "url(#sf-frame)" }, root);
  const stage = mk("g", { class: "sf-stage" }, view);
  for (const child of [...src.childNodes]) stage.appendChild(document.importNode(child, true));

  // The draw-in (excalidraw-animate's idea): before the first step, each
  // element in turn has its strokes drawn along their length, and its fills,
  // text and images faded in.
  if (tl.draw) {
    const els = [...stage.children].filter((e) => e.tagName === "g");
    const d = Math.min(0.8, tl.draw / 3), gap = (tl.draw - d) / Math.max(1, els.length - 1);
    els.forEach((el, i) => {
      const t0 = i * gap, t1 = t0 + d;
      for (const leaf of el.querySelectorAll("path, text, image, use, rect, ellipse, line, polyline, polygon")) {
        const stroked = leaf.tagName === "path" && (leaf.getAttribute("stroke") ?? "none") !== "none" && !leaf.getAttribute("stroke-dasharray");
        if (stroked) {
          leaf.setAttribute("pathLength", 1); leaf.setAttribute("stroke-dasharray", "1 1");
          moves(leaf, "stroke-dashoffset", [[t0, 1, false], [t1, 0, true]]);
        } else moves(leaf, "opacity", [[t0, 0, false], [t1, 1, true]]);
      }
    });
  }

  const FONT = "Excalifont, Virgil, 'Comic Sans MS', cursive";
  const text = (parent, attrs, content) => { const t = mk("text", { "font-family": FONT, ...attrs }, parent); t.textContent = content; return t; };
  const chip = (parent, text_, stroke, fill) => {
    const g = mk("g", {}, parent);
    const r = mk("rect", { rx: 8, fill, stroke, "stroke-width": 2 }, g);
    const tx = mk("text", { "font-family": FONT, "font-size": 17, fill: "#1e1e1e", "text-anchor": "middle" }, g);
    text_.split("\n").forEach((line, k) => { const s = mk("tspan", { x: 0, dy: k ? 21 : 0 }, tx); s.textContent = line; });
    const bb = tx.getBBox();
    r.setAttribute("x", bb.x - 9); r.setAttribute("y", bb.y - 5);
    r.setAttribute("width", bb.width + 18); r.setAttribute("height", bb.height + 10);
    tx.setAttribute("transform", `translate(0 ${-bb.y - bb.height / 2})`);
    r.setAttribute("transform", `translate(0 ${-bb.y - bb.height / 2})`);
    return { g, w: bb.width + 18, h: bb.height + 10 };
  };
  const anchor = (b, side, w, h) => ({
    bottom: [b.x + b.w / 2, b.y + b.h + 4 + h / 2], top: [b.x + b.w / 2, b.y - 4 - h / 2],
    left: [b.x - 4 - w / 2, b.y + b.h / 2], right: [b.x + b.w + 4 + w / 2, b.y + b.h / 2],
  })[side];
  let clipN = 0;
  // Text that types itself out: each line clipped by a rect that widens one
  // character at a time, from t0, at dt a character.
  const typed = (parent, lines, size, lh, anchorMid, t0, dt) => {
    const defs = mk("defs", {}, parent);
    const clip = mk("clipPath", { id: `sf-clip-${clipN++}` }, defs);
    const tx = mk("text", { "font-family": FONT, "font-size": size, "text-anchor": anchorMid ? "middle" : "start",
      "clip-path": `url(#${clip.id})` }, parent);
    let g = 0;
    lines.forEach((line, i) => {
      const sp = mk("tspan", { x: 0, y: i * lh }, tx);
      sp.textContent = line;
      const lw = sp.getComputedTextLength();
      const x0 = anchorMid ? -lw / 2 : 0;
      const rect = mk("rect", { x: x0 - 2, y: i * lh - size * 1.05, width: 0, height: lh + size * 0.35 }, clip);
      const pairs = [[0, 0]];
      for (let k = 1; k <= line.length; k++) {
        const w = k === line.length ? lw + 4 : sp.getSubStringLength(0, k) + 2;
        pairs.push([t0 + (g + k) * dt, w.toFixed(1)]);
      }
      g += line.length + 1;
      steps(rect, "width", pairs);
    });
    return tx;
  };

  // The camera: a view [x, y, w, h] of the diagram is translate(-x·k,
  // -y·k) scale(k), k = W / w (views keep the diagram's aspect).
  const tr = [], sc = [];
  for (const s of tl.steps) {
    for (const [t, v, e] of [[s.start, s.from, false], [s.start + 0.9, s.view, true]]) {
      const k = W / v[2];
      tr.push([t, `${(-v[0] * k).toFixed(2)} ${(-v[1] * k).toFixed(2)}`, e]);
      sc.push([t, k.toFixed(5), e]);
    }
  }
  const camT = moves(stage, null, tr, "animateTransform");
  camT.setAttribute("attributeName", "transform"); camT.setAttribute("type", "translate");
  const camS = moves(stage, null, sc, "animateTransform");
  camS.setAttribute("attributeName", "transform"); camS.setAttribute("type", "scale"); camS.setAttribute("additive", "sum");

  const notesLayer = mk("g", { class: "sf-notes" }, stage);
  tl.steps.forEach((s, i) => {
    const g = mk("g", { class: "sf-step" }, stage);
    shown(g, s.start, s.end);
    // Dim everything but the focus, and ring the focus. A step that names
    // no shape has nothing to set apart, so it dims nothing.
    if (s.focus.length) {
      const defs = mk("defs", {}, g);
      const mask = mk("mask", { id: `sf-focus-${i}` }, defs);
      mk("rect", { x: -W, y: -H, width: 3 * W, height: 3 * H, fill: "white" }, mask);
      for (const b of s.focus) mk("rect", { x: b.x - 8, y: b.y - 8, width: b.w + 16, height: b.h + 16, rx: 14, fill: "black" }, mask);
      mk("rect", { x: -W, y: -H, width: 3 * W, height: 3 * H, fill: "white", opacity: 0.55, mask: `url(#sf-focus-${i})` }, g);
    }
    for (const b of s.focus) mk("rect", { x: b.x - 7, y: b.y - 7, width: b.w + 14, height: b.h + 14, rx: 14, fill: "none", stroke: "#f08c00", "stroke-width": 4 }, g);
    // Tokens: a trail drawn behind each, and the token with its label.
    s.flows.forEach((f, k) => {
      const d = "M" + f.pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join(" L");
      const trail = mk("path", { d, fill: "none", stroke: f.color, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round",
        pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 }, g);
      steps(trail, "opacity", [[0, 0], [f.t0, 0.85], [f.t1, 0.45]]);
      trail.setAttribute("opacity", "0");
      moves(trail, "stroke-dashoffset", [[f.t0, 1, false], [f.t1, 0, true]]);
      const last = k === s.flows.length - 1;
      const token = mk("g", {}, g);
      shown(token, f.t0, last ? s.end : f.t1);
      mk("circle", { cx: 0, cy: 0, r: 10, fill: f.color, stroke: "white", "stroke-width": 3 }, token);
      if (f.label) { const c = chip(token, f.label, f.color, "#fff5f5"); c.g.setAttribute("transform", "translate(0 -30)"); }
      mk("animateMotion", { path: d, calcMode: "spline", keyPoints: "0;0;1;1", keyTimes: `0;${kt(f.t0)};${kt(f.t1)};1`,
        keySplines: `${LINEAR};${EASE};${LINEAR}`, ...LOOP }, token);
    });
    for (const b of s.badges) {
      const c = chip(g, b.text, "#2f9e44", "#ebfbee");
      const [x, y] = anchor(b.box, b.side, c.w, c.h);
      c.g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      shown(c.g, b.t0, s.end);
    }
    // Notes may outlive their step, so they sit on a layer of their own.
    for (const n of s.notes) {
      const ng = mk("g", {}, notesLayer);
      const lines = n.text.split("\n"), lh = n.size * 1.25;
      const chars = n.text.replace(/\n/g, "").length || 1;
      const tx = typed(ng, lines, n.size, lh, true, n.t0, (n.t1 - n.t0) / chars);
      tx.setAttribute("fill", n.color);
      const bb = tx.getBBox();
      const [x, y] = n.box ? anchor(n.box, n.side, bb.width, bb.height) : [n.xy[0] + bb.width / 2, n.xy[1] + bb.height / 2];
      ng.setAttribute("transform", `translate(${x.toFixed(1)} ${(y - bb.y - bb.height / 2).toFixed(1)})`);
      shown(ng, n.t0, n.until);
    }
  });
  stage.appendChild(notesLayer);

  // The caption bar: the title, then each step's caption, typed out.
  const PADX = 28, TITLE = 20, CAP = 27, CLH = 34, avail = W - 2 * PADX;
  const measure = text(root, { "font-size": CAP }, "");
  const width = (s) => { measure.textContent = s; return measure.getComputedTextLength(); };
  const counters = tl.steps.map((_, i) => `${i + 1}/${tl.steps.length}`);
  const wrapped = tl.steps.map((s, i) => {
    const lines = [""], first = width(counters[i]) + 14; // trailing spaces measure as nothing
    for (const word of s.caption.split(/\s+/)) {
      const cur = lines[lines.length - 1], next = cur ? cur + " " + word : word;
      if (width(next) > avail - (lines.length === 1 ? first : 0) && cur) lines.push(word); else lines[lines.length - 1] = next;
    }
    return { lines, first };
  });
  measure.remove();
  const maxLines = Math.max(...wrapped.map((w) => w.lines.length));
  const barH = 16 + TITLE + 14 + maxLines * CLH + 14;
  root.setAttribute("height", H + barH);
  root.setAttribute("viewBox", `0 0 ${W} ${H + barH}`);
  const bar = mk("g", { transform: `translate(0 ${H})` }, root);
  mk("rect", { x: 0, y: 0, width: W, height: barH, fill: "#f8f9fa" }, bar);
  mk("line", { x1: 0, y1: 1, x2: W, y2: 1, stroke: "#dee2e6", "stroke-width": 2 }, bar);
  if (tl.title) text(bar, { x: PADX, y: 16 + TITLE, "font-size": TITLE, fill: "#495057" }, tl.title);
  tl.steps.forEach((s, i) => {
    const g = mk("g", { transform: `translate(${PADX} ${16 + TITLE + 14 + CAP})` }, bar);
    shown(g, s.start, s.end);
    text(g, { x: 0, y: 0, "font-size": CAP, fill: "#e8590c" }, counters[i]);
    const { lines, first } = wrapped[i];
    const body = mk("g", {}, g);
    const dt = tl.typing ? 1 / tl.typing : 0;
    const tx = dt ? typed(body, lines, CAP, CLH, false, s.start, dt) : text(body, { "font-size": CAP }, "");
    if (!dt) lines.forEach((l, k) => { const sp = mk("tspan", { x: 0, y: k * CLH }, tx); sp.textContent = l; });
    tx.setAttribute("fill", "#1e1e1e");
    // The first line starts after the counter; the rest hang under it.
    const sp0 = tx.querySelector("tspan");
    if (sp0) sp0.setAttribute("x", first);
    const r0 = body.querySelector("clipPath rect");
    if (r0) r0.setAttribute("x", first - 2);
  });

  root.setAttribute("data-sketchflow", JSON.stringify({ version: 1, total: T, steps: tl.steps.map((s) => +s.start.toFixed(3)) }));
  const out = new XMLSerializer().serializeToString(root);
  root.remove();
  return out;
}
