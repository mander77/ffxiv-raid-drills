// Every correct answer against the attacks around it. For each drill, each variant, both slots
// and a fixed list of pattern codes, the test answers each step with its correct spot and checks
// that the spot is outside every attack that goes off at that step, and outside every dropped
// puddle still on the floor. The attack sizes come from BossMod (src/data/fights/m11s/attacks.ts), so this
// test does for positions what test/sources.test.ts does for times.
//
// Which attacks go off at a step: `Step.hits` when it is set, else the attacks in `reveal` (drawn
// after the step is answered) and in `cue` (drawn from the step's question on). A scene's
// `overlays` are on the arena for the whole drill and can go off much later, so only their
// puddles count, at every step: they stay on the floor.
//
// The arena turn (`k`) is left out: it turns the zones and the attacks together, so it moves no
// spot into or out of an attack.
import { describe, expect, test } from "vitest";
import { DRILLS, FIRST_PUDDLE } from "../src/data/fights/m11s/drills";
import { buildFight } from "../src/data/fights/m11s/fight";
import { dist, inZone, stepZone, zoneCenter } from "../src/geometry";
import { buildPattern } from "../src/lib/practice";
import type { Drill, Overlay, Point, Slot, Step, StepResult } from "../src/types";
import { random, withSeed } from "../src/util";

const SLOTS: Slot[] = ["H1", "H2"];
/** The pattern codes the test builds: they reach every variant (a test below checks it) and many weapon spots and orders. */
const CODES =
  "2222 2345 3K7Q 4ZZ9 5MPA 6BXR 7HJW 8C3T 9DLE AF4N BG5U CQ6V DR7X ES8Y FT9Z GU2B HV3C JW4D KX5F LY6G MZ7H NA8J PB9K QC2L RD3M SE4N TF5P UG6Q VH7R WJ8S".split(
    " ",
  );

/** A correct answer that stands in an attack on purpose, with the reason. Empty today: a new
    failure goes to the owner first, and is listed here (with the question) only until they answer. */
const KNOWN: readonly { drill: string; step: number; attack: string; why: string }[] = [];

/** True for an overlay that hurts the players inside it. */
const isAttack = (o: Overlay): boolean =>
  o.t === "aoe" ||
  o.t === "donut" ||
  o.t === "lineaoe" ||
  o.t === "band" ||
  o.t === "puddle" ||
  o.t === "poly" ||
  (o.t === "lane" && !o.soft);

/** True when p is inside the rectangle along the line from a to b, w units wide. Its ends are
    square, as the arena draws a line. */
function inLine(p: Point, a: Point, b: Point, w: number): boolean {
  const d: Point = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(d[0], d[1]);
  const v: Point = [p[0] - a[0], p[1] - a[1]];
  const along = (v[0] * d[0] + v[1] * d[1]) / len;
  const across = Math.abs(v[0] * d[1] - v[1] * d[0]) / len;
  return along > 0 && along < len && across < w / 2;
}

/** True when p is inside the polygon (the even-odd rule: count the edges a ray from p crosses). */
function inPoly(p: Point, pts: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** True when the attack hits a player at p. A spot on the attack's edge is outside it. */
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

/** A short name for an attack, for the failure message. */
function nameOf(o: Overlay): string {
  switch (o.t) {
    case "aoe":
    case "puddle":
      return `${o.t} r ${o.r} at (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`;
    case "donut":
      return `donut ${o.r1}-${o.r2} at (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`;
    case "lineaoe":
    case "band":
      return `${o.t} (${o.x.toFixed(1)}, ${o.y.toFixed(1)}) to (${o.x2.toFixed(1)}, ${o.y2.toFixed(1)})`;
    case "poly":
      return `poly from (${o.pts[0][0].toFixed(1)}, ${o.pts[0][1].toFixed(1)})`;
    case "lane":
      return `lane [${o.rect.join(", ")}]`;
    default:
      return o.t;
  }
}

/** The attacks that go off when this step resolves. */
const attacksOf = (step: Step): Overlay[] => (step.hits ?? [...(step.reveal ?? []), ...(step.cue ?? [])]).filter(isAttack);

/** When each step of a drill resolves, in seconds, from the full fight: needed only for a drill
    that drops puddles, to know which ones are still on the floor. */
function dueOf(drill: Drill, slot: Slot, steps: number): number[] {
  const seg = buildFight(slot, "2222").segs.find((g) => g.drills[0] === drill.id && g.scene.steps.length === steps);
  if (!seg) throw new Error(`${drill.id} drops puddles but the full fight has no stretch for it`);
  return seg.due;
}

/** One wrong spot: what the failure message says. */
interface Problem {
  drill: string;
  variant: string | null;
  slot: Slot;
  code: string;
  step: number;
  attack: string;
}

/** Answers every step of one pattern with its correct spot, and lists each attack a spot is in. */
function problemsIn(drill: Drill, slot: Slot, code: string): Problem[] {
  const { scene } = buildPattern(drill, slot, code);
  const variant = variantOf(drill, code);
  const due = scene.steps.some((st) => st.drop) ? dueOf(drill, slot, scene.steps.length) : null;
  const floor = scene.overlays.filter((o) => o.t === "puddle");
  const results: StepResult[] = [];
  const problems: Problem[] = [];
  let kept = 0;
  scene.steps.forEach((step, i) => {
    const zone = stepZone(step, results);
    if (!zone) throw new Error(`${drill.id} step ${i + 1} has no zone`);
    const p = step.stand ?? zoneCenter(zone);
    if (step.clearDrops) kept = i;
    // A puddle dropped at step j is on the floor until it goes off, `life` seconds later.
    const dropped = results.flatMap((r, j): Overlay[] => {
      const life = scene.steps[j].drop?.life;
      if (!r.drop || life == null || j < kept || !due || due[i] >= due[j] + life) return [];
      return [{ t: "puddle", x: r.drop[0], y: r.drop[1], r: scene.steps[j].drop?.r ?? 0 }];
    });
    // A look-ahead click only points at something: the player does not stand there.
    if (!step.lookAhead) {
      for (const o of [...attacksOf(step), ...floor, ...dropped]) {
        if (hits(o, p)) problems.push({ drill: drill.id, variant, slot, code, step: i + 1, attack: nameOf(o) });
      }
    }
    results.push({ p, ok: true, z: zone, drop: step.drop ? p : null });
  });
  return problems;
}

/** The variant a code picks: buildPattern's first random choice. */
const variantOf = (drill: Drill, code: string): string | null =>
  drill.variants ? withSeed(code, () => drill.variants?.[Math.floor(random() * drill.variants.length)] ?? null) : null;

const message = (p: Problem): string =>
  `${p.drill}${p.variant ? ` (${p.variant})` : ""}, ${p.slot}, code ${p.code}, step ${p.step}: the correct spot is in ${p.attack}`;
const matches = (k: (typeof KNOWN)[number], p: Problem): boolean =>
  k.drill === p.drill && k.step === p.step && p.attack.startsWith(k.attack);

/** The drill with the correct spot of step `n` (from 1) moved to p, as a bug in the data would. */
function moved(id: string, n: number, p: Point): Drill {
  const drill = DRILLS.find((d) => d.id === id);
  if (!drill) throw new Error(`missing drill ${id}`);
  return {
    ...drill,
    build: (s, v) => {
      const sc = drill.build(s, v);
      return { ...sc, steps: sc.steps.map((st, i) => (i === n - 1 ? { ...st, stand: p } : st)) };
    },
  };
}

describe("no correct answer stands in an attack", () => {
  for (const drill of DRILLS) {
    test(drill.id, () => {
      const found = SLOTS.flatMap((s) => CODES.flatMap((c) => problemsIn(drill, s, c)));
      expect(found.filter((p) => !KNOWN.some((k) => matches(k, p))).map(message)).toEqual([]);
    });
  }

  test("the codes reach every variant", () => {
    for (const drill of DRILLS.filter((d) => d.variants)) {
      expect(new Set(CODES.map((c) => variantOf(drill, c)))).toEqual(new Set(drill.variants));
    }
  });

  test("each known case still happens, so the list stays true", () => {
    const all = DRILLS.flatMap((d) => SLOTS.flatMap((s) => CODES.flatMap((c) => problemsIn(d, s, c))));
    for (const k of KNOWN)
      expect(
        all.some((p) => matches(k, p)),
        k.why,
      ).toBe(true);
  });

  test("a correct spot moved into an attack fails, with a clear message", () => {
    // Raw Steel Trophy, scythe: the party's stack moved into the MT's cone, at 317 degrees.
    expect(problemsIn(moved("m-raw-scythe", 1, [38, 30]), "H1", "2222").map(message)).toEqual([
      "m-raw-scythe, H1, code 2222, step 1: the correct spot is in poly from (50.0, 50.0)",
    ]);
  });

  test("every point of a scythe area is out of the donut and the other players' cones", () => {
    // The test above checks only a zone's center. A scythe area is close to two attacks (the
    // donut's inner edge, the next protean cone), so here every point of it counts.
    let checked = 0;
    for (const id of ["m-assault", "m-void", "m-ultimate"]) {
      const drill = DRILLS.find((d) => d.id === id);
      if (!drill) throw new Error(`missing drill ${id}`);
      for (const s of SLOTS)
        for (const code of CODES) {
          const { scene } = buildPattern(drill, s, code);
          scene.steps.forEach((step, i) => {
            if (!step.a[0].startsWith("Scythe") || !step.z) return;
            const zone = step.z;
            for (let x = 0; x <= 100; x += 0.5)
              for (let y = 0; y <= 100; y += 0.5) {
                const p: Point = [x, y];
                if (!inZone(p, zone)) continue;
                checked++;
                const hit = attacksOf(step).find((o) => hits(o, p));
                expect(hit && nameOf(hit), `${id}, ${s}, code ${code}, step ${i + 1}: (${x}, ${y}) counts as correct`).toBeUndefined();
              }
          });
        }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  test("a puddle dropped on the last one fails", () => {
    // Void Stardust: the second puddle (step 3) dropped on the first, which is still on the floor.
    const found = problemsIn(moved("m-void", 3, FIRST_PUDDLE), "H1", "2222").map(message);
    expect(found.join("\n")).toMatch(/^m-void \(\w+\), H1, code 2222, step 3: the correct spot is in puddle r 15 at \(50\.0, 33\.0\)$/m);
  });
});
