// Painting the answer layers on an arena: Practice, the full fight under Pressure, and its
// "Step through my run" screen all use it.
import { rotOverlay, zoneCenter, f1 } from "../geometry";
import { drawOverlay, paintBoss, zoneSVG, hitsSVG } from "../arena";
import { facingNext } from "../data/drills";
import { PUDDLE_R } from "../data/attacks";
import type { Boss, Scene, StepResult } from "../types";

/** The width of the tag on the answer area, in arena units. */
const LABEL_W = 17;

/* Draw the answer layers on an arena: dropped puddles, cues, the boss, and, with showLast,
   the zone and the click of the last answer. `boss` replaces the scene's boss, for example to
   hide his facing before he turns. `wentOff(i)` is true once the puddle dropped at step i has gone
   off: it fades out the first time, and after that it is not drawn. */
export function paintArena(svg: Element, sc: Scene, k: number, results: StepResult[], showLast: boolean, boss?: Boss | null, wentOff?: (i: number) => boolean): void {
  const layer = (id: string): Element => svg.querySelector("#" + id) as Element;
  const dropLayer = layer("drops") as SVGGElement, faded = new Set((dropLayer.dataset.gone ?? "").split(",").filter(Boolean).map(Number)), goneNow: number[] = [];
  const n = results.length, asking = showLast ? n - 1 : n;
  // The puddles dropped before the last step with clearDrops (up to the one asked) are gone.
  const kept = sc.steps.slice(0, asking + 1).reduce((from, st, i) => st.clearDrops ? i : from, 0);
  let drops = "", fb = "", rev = "", zlabel = "", me = "";
  results.forEach((r, i) => {
    const step = sc.steps[i], z = r.z, ctr = zoneCenter(z);
    if(r.drop && i >= kept){
      const off = wentOff?.(i) ?? false;
      if(off) goneNow.push(i);
      if(!off || !faded.has(i)) drops += '<circle class="drop' + (off ? " fading" : "") + '" cx="' + f1(r.drop[0]) + '" cy="' + f1(r.drop[1]) + '" r="' + PUDDLE_R + '"/>';
    }
    if(step.leave) drops += drawOverlay(step.leave);
    if(i === n - 1 && showLast){
      const cls = r.ok ? "ok" : "bad";
      if(step.reveal) rev = hitsSVG(step.reveal.map(o => rotOverlay(o, k)));
      fb = zoneSVG(z, cls);
      const top = "c" in z ? z.c[1] - z.r : "rect" in z ? z.rect[1] : ctr[1] + 1;
      const bottom = "c" in z ? z.c[1] + z.r : "rect" in z ? z.rect[3] : ctr[1] - 1;
      const ly = "fn" in z ? ctr[1] : (top - 3 >= -3 ? top - 3 : bottom + 3);
      // The tag says what the green area is. It does not name your slot: the moving marker
      // is you, so a slot name here would look like a second you. It stays inside the picture.
      const lx = Math.max(-4 + LABEL_W / 2, Math.min(104 - LABEL_W / 2, ctr[0]));
      zlabel = '<g class="zlabel"><rect x="' + f1(lx - LABEL_W / 2) + '" y="' + f1(ly - 2.1) + '" width="' + LABEL_W + '" height="4.2" rx=".9"/><text x="' + f1(lx) + '" y="' + f1(ly) + '">Right spot</text></g>';
      if(!r.missed) me = '<g class="pick ' + cls + '" transform="translate(' + f1(r.p[0]) + " " + f1(r.p[1]) + ')"><circle class="halo" r="2.6"/><circle class="dot" r="1.1"/></g>';
    }
  });
  // Cues show with their step's question and stay. They go on top of the puddles so that
  // a marker on an old puddle stays visible. Player marks in a cue go in the top layer.
  const cues = sc.steps.slice(0, asking + 1).flatMap(st => st.cue ?? []).map(o => rotOverlay(o, k));
  const cueMarks = cues.filter(o => o.t === "mark").map(drawOverlay).join("");
  const cueRest = cues.filter(o => o.t !== "mark").map(drawOverlay).join("");
  if(boss === undefined){
    boss = sc.bossAt ? sc.bossAt(n) : (sc.boss ? rotOverlay(sc.boss, k) : null);
    // Asking the next weapon: he has already turned to face it.
    if(boss && n > 0 && !showLast) boss = facingNext(sc, n, boss);
  }
  layer("reveal-layer").innerHTML = rev;
  dropLayer.innerHTML = drops + cueRest;
  dropLayer.dataset.gone = goneNow.join(",");
  paintBoss(layer("boss-layer"), boss ?? null);
  layer("fb-layer").innerHTML = fb;
  layer("label-layer").innerHTML = zlabel;
  layer("cue-marks").innerHTML = cueMarks;
  layer("me-layer").innerHTML = me;
  svg.classList.toggle("locked", n >= sc.steps.length);
  // Weapons that already resolved fade out. The one just answered stays until the next step.
  // With spawnAhead, each answered step also brings in the next weapon, with a short delay.
  const gone = showLast ? n - 1 : n, shown = sc.spawnAhead != null ? sc.spawnAhead + n : Infinity;
  svg.querySelectorAll<SVGGElement>("[data-spawn]").forEach(g => {
    const i = Number(g.dataset.spawn);
    if(i >= shown) g.classList.add("later");
    else if(g.classList.contains("later")){ g.style.animationDelay = "0.2s"; g.classList.remove("later"); }
    g.classList.toggle("gone", i < gone);
  });
}
