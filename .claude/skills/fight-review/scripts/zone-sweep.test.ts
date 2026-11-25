// The fight review's whole-area check. test/answers.test.ts checks only the center (or `stand`
// point) of each correct area. This check samples every point of each area, half a unit apart,
// and lists the steps where a point that counts as correct stands in an attack of its step.
//
// It is not one of the site's tests. To run it, copy it into test/ of a review worktree, run
//   FIGHT=<id> npx vitest run test/zone-sweep.test.ts
// read the list in the failure message, then delete the copy. FIGHT defaults to the first fight.
//
// What it covers: every Practice drill, and every scene of the full fight (Pressure), so a
// mechanic that only the full fight plays is checked too. What it leaves out: puddles dropped at
// earlier steps (test/answers.test.ts times those), and look-ahead steps (you do not stand there).
import { expect, test } from "vitest";
import { FIGHTS, fightById } from "../src/data/fights";
import { dist, inZone, stepZone, zoneCenter } from "../src/geometry";
import { buildPattern } from "../src/lib/practice";
import type { Overlay, Point, Scene, Slot, StepResult } from "../src/types";

const fight = fightById(process.env.FIGHT) ?? FIGHTS[0];
const SLOTS: Slot[] = ["H1", "H2"];
const CODES = "2222 2345 3K7Q 4ZZ9 5MPA 6BXR 7HJW 8C3T 9DLE AF4N".split(" ");
/** How far apart the sampled points are, in arena units. */
const GRID = 0.5;

const isAttack = (o: Overlay): boolean =>
  o.t === "aoe" || o.t === "donut" || o.t === "lineaoe" || o.t === "band" || o.t === "puddle" || o.t === "poly" || (o.t === "lane" && !o.soft);

function inLine(p: Point, a: Point, b: Point, w: number): boolean {
  const d: Point = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(d[0], d[1]);
  const v: Point = [p[0] - a[0], p[1] - a[1]];
  const along = (v[0] * d[0] + v[1] * d[1]) / len;
  const across = Math.abs(v[0] * d[1] - v[1] * d[0]) / len;
  return along > 0 && along < len && across < w / 2;
}

function inPoly(p: Point, pts: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** True when the attack hits a player at p, as test/answers.test.ts decides it. */
function hits(o: Overlay, p: Point): boolean {
  switch (o.t) {
    case "aoe":
    case "puddle":
      return dist(p, [o.x, o.y]) < o.r;
    case "donut": {
      const d = dist(p, [o.x, o.y]);
      return d > o.r1 && d < o.r2;
    }
    case "lineaoe":
      return inLine(p, [o.x, o.y], [o.x2, o.y2], o.w ?? 1.3);
    case "band":
      return inLine(p, [o.x, o.y], [o.x2, o.y2], o.w);
    case "poly":
      return inPoly(p, o.pts);
    case "lane":
      return p[0] > o.rect[0] && p[0] < o.rect[2] && p[1] > o.rect[1] && p[1] < o.rect[3];
    default:
      return false;
  }
}

/** The worst case of each step, over both slots and every code: how many sampled points of its
    area are in an attack, and which slots it happens for. */
type Worst = Map<string, { bad: number; total: number; example: Point; attack: string; slots: Set<Slot> }>;

/** Answers each step of a scene with its correct spot, and samples each step's whole area. */
function sweep(s: Slot, where: string, scene: Scene, worst: Worst): void {
  const floor = scene.overlays.filter((o) => o.t === "puddle");
  const results: StepResult[] = [];
  scene.steps.forEach((step, i) => {
    const zone = stepZone(step, results);
    if (!zone) return;
    const attacks = [...(step.hits ?? [...(step.reveal ?? []), ...(step.cue ?? [])]).filter(isAttack), ...floor];
    if (!step.lookAhead && attacks.length) {
      let bad = 0;
      let total = 0;
      let example: Point = [0, 0];
      let attack = "";
      for (let x = -10; x <= 110; x += GRID)
        for (let y = 0; y <= 100; y += GRID) {
          const p: Point = [x, y];
          if (!inZone(p, zone)) continue;
          total++;
          const hit = attacks.find((o) => hits(o, p));
          if (hit) {
            bad++;
            example = p;
            attack = hit.t;
          }
        }
      // The question can name the pattern ("The stack went off"), so the key leaves it out.
      const key = `${where}, step ${i + 1}`;
      const prev = worst.get(key);
      if (bad && (!prev || bad / total > prev.bad / prev.total)) worst.set(key, { bad, total, example, attack, slots: new Set([...(prev?.slots ?? []), s]) });
      else if (bad && prev) prev.slots.add(s);
    }
    const p = step.stand ?? zoneCenter(zone);
    results.push({ p, ok: true, z: zone, drop: step.drop ? p : null });
  });
}

test(`every point of each correct area in ${fight.id} is out of its step's attacks`, () => {
  const worst: Worst = new Map();
  for (const s of SLOTS)
    for (const code of CODES) {
      for (const drill of fight.drills) sweep(s, `Practice ${drill.id}`, buildPattern(drill, s, code).scene, worst);
      for (const seg of fight.clock.build(s, code, fight.clock.random).segs) sweep(s, `Pressure "${seg.title}"`, seg.scene, worst);
    }
  const found = [...worst]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, w]) => `${key} (${[...w.slots].join(", ")}): ${w.bad} of ${w.total} points in an attack (${w.attack}), for example (${w.example.join(", ")})`);
  expect(found).toEqual([]);
});
