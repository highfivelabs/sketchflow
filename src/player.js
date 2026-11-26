// The HTML player: the animated SVG inline, and controls that drive its
// own SMIL clock (pauseAnimations, setCurrentTime). Nothing is re-rendered.
export function player(svg, title) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title || "sketchflow")}</title>
<style>
  body{margin:0;background:#fff;font:15px system-ui,sans-serif;display:flex;flex-direction:column;align-items:center}
  #stage{width:100%;max-width:1800px}
  #stage>svg{width:100%;height:auto;display:block}
  #bar{display:flex;gap:8px;align-items:center;width:100%;max-width:1800px;box-sizing:border-box;padding:10px 16px}
  #bar button{font:inherit;padding:6px 12px;border:1px solid #adb5bd;border-radius:8px;background:#fff;cursor:pointer}
  #bar input{flex:1}
  #bar output{min-width:5.5em;text-align:right;color:#495057;font-variant-numeric:tabular-nums}
</style></head><body>
<div id="stage">${svg}</div>
<div id="bar">
  <button id="prev" title="Previous step (←)">◀</button>
  <button id="play" title="Play or pause (space)">Pause</button>
  <button id="next" title="Next step (→)">▶</button>
  <input id="seek" type="range" min="0" step="0.01" value="0" aria-label="Time">
  <output id="step"></output>
</div>
<script>
const svg = document.querySelector("#stage > svg");
const { total, steps } = JSON.parse(svg.dataset.sketchflow);
const seek = document.getElementById("seek"), play = document.getElementById("play"), out = document.getElementById("step");
seek.max = total;
const now = () => svg.getCurrentTime() % total;
const go = (t) => svg.setCurrentTime(Math.max(0, Math.min(total - 0.001, t)));
const pause = () => { svg.pauseAnimations(); play.textContent = "Play"; };
const resume = () => { svg.unpauseAnimations(); play.textContent = "Pause"; };
play.onclick = () => (svg.animationsPaused() ? resume() : pause());
const step = (d) => {
  const t = now();
  let i = 0;
  for (let k = 0; k < steps.length; k++) if (steps[k] <= t + 0.01) i = k;
  go(steps[(i + d + steps.length) % steps.length] + 0.01);
  pause();
};
document.getElementById("prev").onclick = () => step(-1);
document.getElementById("next").onclick = () => step(1);
seek.oninput = () => { go(+seek.value); pause(); };
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") step(1);
  else if (e.key === "ArrowLeft") step(-1);
  else if (e.key === " ") { e.preventDefault(); play.onclick(); }
});
(function tick() {
  const t = now();
  let i = 0;
  for (let k = 0; k < steps.length; k++) if (steps[k] <= t + 0.01) i = k;
  seek.value = t; out.value = (i + 1) + " / " + steps.length;
  requestAnimationFrame(tick);
})();
</script>
</body></html>
`;
}
