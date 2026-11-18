import { esc } from "../util.js";
import { state, getDeck, record, view } from "../core.js";
import { rotZone, rotOverlay, inZone, zoneCenter, f1 } from "../geometry.js";
import { sceneSVG, drawOverlay, drawBoss, zoneSVG } from "../arena.js";
import { PUDDLE_R } from "../data/drills.js";
import { tabHead, renderRoundDone } from "./common.js";

export function drawFeedback(){
  const c = state.cur, svg = document.getElementById("arena-svg");
  if(!svg) return;
  const sc = c.scene, n = c.results.length, showLast = c.waiting || n >= sc.steps.length;
  let drops = "", fb = "", rev = "";
  c.results.forEach((r, i) => {
    const step = sc.steps[i], z = r.z || rotZone(step.z, c.k), ctr = zoneCenter(z);
    if(r.drop) drops += '<circle class="drop" cx="' + f1(r.drop[0]) + '" cy="' + f1(r.drop[1]) + '" r="' + PUDDLE_R + '"/>';
    if(step.leave) drops += drawOverlay(step.leave);
    if(i === n - 1 && showLast){
      const cls = r.ok ? "ok" : "bad";
      if(step.reveal) rev = step.reveal.map(o => drawOverlay(rotOverlay(o, c.k))).join("");
      fb += '<g clip-path="url(#arenaClip)">' + zoneSVG(z, cls) + "</g>";
      const top = z.c ? z.c[1] - z.r : z.rect ? z.rect[1] : ctr[1] + 1, bottom = z.c ? z.c[1] + z.r : z.rect ? z.rect[3] : ctr[1] - 1;
      const ly = z.fn ? ctr[1] : (top - 3 >= -3 ? top - 3 : bottom + 3);
      fb += '<g class="zlabel"><rect x="' + f1(ctr[0] - 3.2) + '" y="' + f1(ly - 2.1) + '" width="6.4" height="4.2" rx=".9"/><text x="' + f1(ctr[0]) + '" y="' + f1(ly) + '">' + state.slot + "</text></g>";
      fb += '<g class="pick ' + cls + '" transform="translate(' + f1(r.p[0]) + " " + f1(r.p[1]) + ')"><circle class="halo" r="2.6"/><circle class="dot" r="1.1"/></g>';
    }
  });
  const boss = sc.bossAt ? sc.bossAt(n) : (sc.boss ? rotOverlay(sc.boss, c.k) : null);
  svg.querySelector("#reveal-layer").innerHTML = rev;
  svg.querySelector("#drops").innerHTML = drops;
  svg.querySelector("#boss-layer").innerHTML = boss ? drawBoss(boss) : "";
  svg.querySelector("#fb-layer").innerHTML = fb;
  svg.classList.toggle("locked", n >= sc.steps.length || c.waiting);
  // Weapons that already resolved fade out. The one just answered stays until the next step.
  const gone = showLast ? n - 1 : n;
  svg.querySelectorAll("[data-spawn]").forEach(g => g.classList.toggle("gone", Number(g.dataset.spawn) < gone));
}

/* Restart the spawn animation so the player can watch the order again. */
function replaySpawns(){
  const svg = document.getElementById("arena-svg");
  if(!svg) return;
  svg.classList.remove("play");
  void svg.getBoundingClientRect();
  svg.classList.add("play");
}

/* ---------- map drill view ---------- */
export function renderMap(fresh){
  const d = getDeck("map");
  if(d.i >= d.items.length) return renderRoundDone("map", d);
  const item = d.items[d.i];
  if(fresh !== false || !state.cur || state.cur.item !== item){
    const v = item.variants ? item.variants[Math.floor(Math.random() * item.variants.length)] : null;
    state.cur = {kind:"map", item, scene:item.build(state.slot, v), k:item.rotate ? Math.floor(Math.random() * 4) : 0, results:[], counted:false};
  }
  const c = state.cur;
  view.innerHTML = tabHead(true) +
    '<div class="stage"><div class="arena">' + sceneSVG(c) +
    '<div class="legend"><span><i style="background:var(--ring)"></i>Boss hitbox and facing</span><span><i style="background:var(--aoe)"></i>AoE</span><span><i style="background:var(--tank)"></i>Tank</span><span><i style="background:var(--dps)"></i>DPS</span></div></div>' +
    '<div class="panel" id="map-panel"></div></div>';
  document.getElementById("arena-svg").addEventListener("click", onArenaClick);
  drawFeedback();
  drawMapPanel();
}
export function drawMapPanel(){
  const c = state.cur, d = getDeck("map"), sc = c.scene, done = c.results.length >= sc.steps.length;
  let h = '<div class="eyebrow"><b>' + esc(c.item.phase) + "</b><span>" + esc(c.item.time) + '</span><span class="progress">Drill ' + (d.i + 1) + " of " + d.items.length + "</span></div>";
  h += "<h2>" + esc(c.item.title) + "</h2><p class=\"setup\">" + esc(sc.setup) + "</p>";
  h += '<ol class="steps">' + sc.steps.map((st, i) => {
    const r = c.results[i];
    if(r) return '<li class="' + (r.ok ? "ok" : "bad") + '"><span class="tag">' + (r.ok ? "Right" : "Not there") + "</span>" + esc(st.q) + '<span class="ans">' + esc(st.a) + "</span></li>";
    if(i === c.results.length) return '<li class="now">' + (sc.steps.length > 1 ? "Step " + (i + 1) + ": " : "") + esc(st.q) + "</li>";
    return "<li>" + (sc.steps.length > 1 ? "Step " + (i + 1) + ": " : "") + "&hellip;</li>";
  }).join("") + "</ol>";
  if(done){
    h += '<div class="rule"><span>Rule</span><strong>' + esc(sc.rule) + "</strong></div>";
    h += '<div class="actions"><button type="button" class="btn" id="map-next">Next drill</button><button type="button" class="btn ghost" id="map-again">Try this one again</button><span class="hint"><kbd>Enter</kbd> next</span></div>';
  } else if(c.waiting){
    h += '<div class="actions"><button type="button" class="btn" id="map-step">Next step</button><span class="hint"><kbd>Enter</kbd> next step</span></div>';
  } else {
    h += '<p class="hint" style="margin-top:14px">Click the arena. The green area shows the right spot after you click.</p>';
  }
  if(sc.spawnPlay && !done) h += '<div class="actions"><button type="button" class="btn ghost" id="map-replay">Watch the spawns again</button></div>';
  const p = document.getElementById("map-panel");
  p.innerHTML = h;
  const rp = document.getElementById("map-replay"); if(rp) rp.addEventListener("click", replaySpawns);
  const nx = document.getElementById("map-next"); if(nx) nx.addEventListener("click", nextMap);
  const ag = document.getElementById("map-again"); if(ag) ag.addEventListener("click", () => renderMap(true));
  const ns = document.getElementById("map-step"); if(ns) ns.addEventListener("click", nextStep);
}
export function onArenaClick(e){
  const c = state.cur; if(!c || c.kind !== "map") return;
  if(c.waiting || c.results.length >= c.scene.steps.length) return;
  const svg = e.currentTarget, pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const ctm = svg.getScreenCTM(); if(!ctm) return;
  const q = pt.matrixTransform(ctm.inverse());
  const p = [q.x, q.y];
  const step = c.scene.steps[c.results.length];
  const zone = rotZone(step.zf ? step.zf(c.results) : step.z, c.k);
  const ok = inZone(p, zone);
  c.results.push({p, ok, z:zone, drop:step.drop ? (ok ? p : zoneCenter(zone)) : null});
  if(c.results.length < c.scene.steps.length) c.waiting = true;
  else if(!c.counted){ c.counted = true; const all = c.results.every(r => r.ok); record(c.item.id, all); const d = getDeck("map"); d.done++; if(all) d.right++; }
  drawFeedback(); drawMapPanel();
}
export function nextStep(){ const c = state.cur; c.waiting = false; drawFeedback(); drawMapPanel(); }
export function nextMap(){ const d = getDeck("map"); d.i++; renderMap(true); }
