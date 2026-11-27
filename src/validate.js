// Checking a flow file whole, names included, before anything is rendered
// (spec/specs/flow-file.md R8, R9, R11 to R14). Errors say what is wrong in
// the flow's terms: the key, and where it is ("step 2, flow 1").

const TOP = ["scene", "title", "output", "formats", "draw", "typing", "writing", "fps", "mp4", "webm", "gif", "steps"];
const STEP = ["caption", "zoom", "zoomPad", "focus", "flows", "badges", "write", "seconds"];
const FLOW = ["path", "label", "color", "via"];
const BADGE = ["at", "text", "side"];
const NOTE = ["at", "text", "side", "size", "color", "when", "keep"];
const SIDES = ["bottom", "top", "left", "right"];

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isText = (v) => typeof v === "string" || isNum(v);
const isPoint = (v) => Array.isArray(v) && v.length === 2 && v.every(isNum);

// validate(flow, scene) throws on the first mistake. `scene()` returns the
// loaded diagram (scene.js), and is called only once a name needs it, so a
// mistake in the flow's own keys is reported before the scene is read.
export function validate(flow, scene) {
  const fail = (where, msg) => { throw new Error(where ? `${where}: ${msg}` : msg); };
  const keys = (o, known, where) => {
    for (const k of Object.keys(o)) if (!known.includes(k)) fail(where, `unknown key ${k}`);
  };
  const num = (o, k, where) => { if (o[k] !== undefined && !(isNum(o[k]) && o[k] >= 0)) fail(where, `${k} must be a number`); };
  const pos = (o, k, where) => { if (o[k] !== undefined && !(isNum(o[k]) && o[k] > 0)) fail(where, `${k} must be a number above 0`); };
  // Text may be written as a bare number in YAML (`text: 404`); it is text.
  const str = (o, k, where) => {
    if (o[k] === undefined) return;
    if (!isText(o[k])) fail(where, `${k} must be text`);
    o[k] = String(o[k]);
  };
  const list = (o, k, where) => { if (o[k] !== undefined && !Array.isArray(o[k])) fail(where, `${k} must be a list`); };
  const obj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const shape = (ref, where) => {
    if (typeof ref !== "string") fail(where, `${JSON.stringify(ref)} is not a shape's name`);
    try { scene().find(ref); } catch (e) { fail(where, e.message); }
  };
  const shapes = (v, k, where) => {
    const refs = [].concat(v);
    if (!refs.length) fail(where, `${k} needs at least one shape`);
    for (const r of refs) shape(r, `${where}, ${k}`);
  };

  if (!obj(flow)) fail("", "a flow file is a set of keys: scene, steps, ...");
  keys(flow, TOP, "");
  if (!flow.scene) fail("", "no scene (the .excalidraw file, relative to the flow)");
  str(flow, "scene", ""); str(flow, "title", ""); str(flow, "output", "");
  list(flow, "formats", "");
  if (flow.draw !== undefined && flow.draw !== true && flow.draw !== false && !(isNum(flow.draw) && flow.draw >= 0)) {
    fail("", "draw must be true or a number of seconds");
  }
  num(flow, "typing", ""); pos(flow, "writing", ""); pos(flow, "fps", "");
  for (const k of ["mp4", "webm", "gif"]) {
    if (flow[k] === undefined) continue;
    if (!obj(flow[k])) fail("", `${k} must be a set of keys: ${k === "gif" ? "width, fps" : "width"}`);
    keys(flow[k], k === "gif" ? ["width", "fps"] : ["width"], k);
    pos(flow[k], "width", k); pos(flow[k], "fps", k);
  }
  if (flow.steps === undefined) fail("", "a flow needs at least one step");
  list(flow, "steps", "");
  if (!flow.steps.length) fail("", "a flow needs at least one step");

  flow.steps.forEach((st, i) => {
    const at = `step ${i + 1}`;
    if (!obj(st)) fail(at, "a step is a set of keys: caption, flows, ...");
    keys(st, STEP, at);
    if (st.caption === undefined || st.caption === null || st.caption === "") fail("", `${at} has no caption`);
    str(st, "caption", at); pos(st, "seconds", at); num(st, "zoomPad", at);
    if (st.zoom !== undefined && st.zoom !== "all") {
      if (!(typeof st.zoom === "string" || (Array.isArray(st.zoom) && st.zoom.every((z) => typeof z === "string")))) {
        fail(at, "zoom must be all, a shape or a list of shapes");
      }
      shapes(st.zoom, "zoom", at);
    }
    if (st.focus !== undefined) {
      if (!(typeof st.focus === "string" || Array.isArray(st.focus))) fail(at, "focus must be a shape or a list of shapes");
      shapes(st.focus, "focus", at);
    }
    for (const k of ["flows", "badges", "write"]) list(st, k, at);

    (st.flows ?? []).forEach((f, j) => {
      const w = `${at}, flow ${j + 1}`;
      if (!obj(f)) fail(w, "a flow is a set of keys: path, label, ...");
      keys(f, FLOW, w);
      if (f.path === undefined) fail("", `${w} has no path`);
      if (!Array.isArray(f.path) || f.path.length < 2) fail(w, "path needs two or more shapes");
      for (const r of f.path) shape(r, w);
      str(f, "label", w); str(f, "color", w);
      if (f.via !== undefined && !(Array.isArray(f.via) && f.via.every(isPoint))) fail(w, "via must be a list of [x, y] points");
    });
    (st.badges ?? []).forEach((b, j) => {
      const w = `${at}, badge ${j + 1}`;
      if (!obj(b)) fail(w, "a badge is a set of keys: at, text, side");
      keys(b, BADGE, w);
      if (b.at === undefined) fail("", `${w} has no at`);
      if (b.text === undefined || b.text === "") fail("", `${w} has no text`);
      shape(b.at, w); str(b, "text", w); side(b, w);
    });
    (st.write ?? []).forEach((n, j) => {
      const w = `${at}, note ${j + 1}`;
      if (!obj(n)) fail(w, "a note is a set of keys: at, text, ...");
      keys(n, NOTE, w);
      if (n.at === undefined) fail("", `${w} has no at`);
      if (n.text === undefined || n.text === "") fail("", `${w} has no text`);
      if (!isPoint(n.at)) shape(n.at, w);
      str(n, "text", w); str(n, "color", w); pos(n, "size", w); side(n, w);
      if (n.when !== undefined && n.when !== "start") fail(w, "when must be start (or left out: after the flows)");
      if (n.keep !== undefined && typeof n.keep !== "boolean") fail(w, "keep must be true or false");
    });
  });

  function side(o, w) {
    if (o.side !== undefined && !SIDES.includes(o.side)) fail(w, "side must be bottom, top, left or right");
  }
}
