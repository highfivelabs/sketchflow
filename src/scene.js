// Reading an Excalidraw scene: where every node and arrow is, and how a flow
// names them. Coordinates here are the scene's own, as Excalidraw stores them.

export function loadScene(scene) {
  const live = scene.elements.filter((e) => !e.isDeleted);
  const byId = new Map(live.map((e) => [e.id, e]));
  const shapes = live.filter((e) => ["rectangle", "ellipse", "diamond", "frame"].includes(e.type));
  const texts = live.filter((e) => e.type === "text");
  const arrows = live.filter((e) => e.type === "arrow" || e.type === "line");

  // A shape's label: its bound text, or else the text that sits inside it
  // and inside no smaller shape.
  const inside = (t, s) => t.x >= s.x - 1 && t.y >= s.y - 1 && t.x + t.width <= s.x + s.width + 1 && t.y + t.height <= s.y + s.height + 1;
  const labels = new Map();
  for (const t of texts) {
    if (t.containerId && byId.has(t.containerId)) { labels.set(t.containerId, t.text); continue; }
    const holders = shapes.filter((s) => inside(t, s)).sort((a, b) => a.width * a.height - b.width * b.height);
    if (holders[0] && !labels.has(holders[0].id)) labels.set(holders[0].id, t.text);
  }

  const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
  // A node is named by its element id, or by its label: the whole label,
  // or its first line.
  const find = (ref) => {
    if (byId.has(ref) && byId.get(ref).type !== "arrow" && byId.get(ref).type !== "text") return byId.get(ref);
    const want = norm(ref);
    const hits = shapes.filter((s) => {
      const l = labels.get(s.id);
      return l && (norm(l) === want || norm(l.split("\n")[0]) === want);
    });
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) throw new Error(`"${ref}" names ${hits.length} shapes (${hits.map((h) => h.id).join(", ")}); use one of their element ids`);
    throw new Error(`no shape "${ref}": name it by its element id or its label`);
  };

  // The drawn arrow between two shapes, either way round, as its points.
  const arrowBetween = (a, b) => {
    for (const r of arrows) {
      const s = r.startBinding?.elementId, e = r.endBinding?.elementId;
      const pts = r.points.map(([px, py]) => [r.x + px, r.y + py]);
      if (s === a && e === b) return pts;
      if (s === b && e === a) return pts.reverse();
    }
    return null;
  };

  let minX = Infinity, minY = Infinity;
  for (const e of live) {
    for (const [px, py] of e.points ?? [[0, 0]]) { minX = Math.min(minX, e.x + px); minY = Math.min(minY, e.y + py); }
  }
  return { live, find, arrowBetween, minX, minY };
}

export const boxOf = (e) => ({ x: e.x, y: e.y, w: e.width, h: e.height });
export const center = (b) => [b.x + b.w / 2, b.y + b.h / 2];

// Where the line from a box's center toward a point leaves the box.
export function edge(b, [tx, ty]) {
  const [cx, cy] = center(b), ex = tx - cx, ey = ty - cy;
  if (!ex && !ey) return [cx, cy];
  const s = Math.min(Math.abs(b.w / 2 / (ex || 1e-9)), Math.abs(b.h / 2 / (ey || 1e-9)));
  return [cx + ex * s, cy + ey * s];
}
