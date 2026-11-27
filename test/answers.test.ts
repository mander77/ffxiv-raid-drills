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
import { ATOMIC_PUDDLE } from "../src/data/fights/m11s/attacks";
import { DRILLS, ECL_SOAK_R, FIRST_PUDDLE } from "../src/data/fights/m11s/drills";
import { buildFight } from "../src/data/fights/m11s/fight";
import { dist, attackHits as hits, inZone, isAttack, stepZone, zoneCenter } from "../src/geometry";
import { buildPattern } from "../src/lib/practice";
import type { Drill, Overlay, Point, Slot, Step, StepResult } from "../src/types";
import { random, withSeed } from "../src/util";
import { MANY_FIGHTS_TIMEOUT } from "./m11s";

const SLOTS: Slot[] = ["H1", "H2"];
/** The pattern codes the test builds: they reach every variant (a test below checks it) and many weapon spots and orders. */
const CODES =
  "2222 2345 3K7Q 4ZZ9 5MPA 6BXR 7HJW 8C3T 9DLE AF4N BG5U CQ6V DR7X ES8Y FT9Z GU2B HV3C JW4D KX5F LY6G MZ7H NA8J PB9K QC2L RD3M SE4N TF5P UG6Q VH7R WJ8S".split(
    " ",
  );

/** A correct answer that stands in an attack on purpose, with the reason. Empty today: a new
    failure goes to the owner first, and is listed here (with the question) only until they answer. */
const KNOWN: readonly { drill: string; step: number; attack: string; why: string }[] = [];

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

/** A drill by its id. */
function drillById(id: string): Drill {
  const d = DRILLS.find((x) => x.id === id);
  if (!d) throw new Error(`missing drill ${id}`);
  return d;
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

  test("each known case still happens, so the list stays true", { timeout: MANY_FIGHTS_TIMEOUT }, () => {
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

  test("every point of a Four-way Fireball area is out of the fire and the other Line Stacks", () => {
    // Near the boss the four lines overlap, and the fire puddles on the floor reach the intercards.
    const drill = DRILLS.find((d) => d.id === "m-ecl-four");
    if (!drill) throw new Error("missing drill m-ecl-four");
    let checked = 0;
    for (const s of SLOTS)
      for (const code of CODES) {
        const { scene } = buildPattern(drill, s, code);
        const step = scene.steps[0];
        const attacks = [...attacksOf(step), ...scene.overlays.filter(isAttack)];
        for (let x = 0; x <= 100; x += 0.5)
          for (let y = 0; y <= 100; y += 0.5) {
            const p: Point = [x, y];
            if (!step.z || !inZone(p, step.z)) continue;
            checked++;
            const hit = attacks.find((o) => hits(o, p));
            expect(hit && nameOf(hit), `${s}, code ${code}: (${x}, ${y}) counts as correct`).toBeUndefined();
          }
      }
    expect(checked).toBeGreaterThan(1000);
  });

  test("an inner Ecliptic puddle never reaches the middle of a tower", () => {
    // Where the healer or ranged soaks a two-player tower, dead center: no fire may cover it.
    const drill = DRILLS.find((d) => d.id === "m-ecl-start");
    if (!drill) throw new Error("missing drill m-ecl-start");
    let checked = 0;
    for (const variant of ["north", "south"]) {
      const scene = drill.build("H1", variant);
      const towers = scene.steps.flatMap((st) => st.cue ?? []).filter((o) => o.t === "tower");
      expect(towers).toHaveLength(4);
      const results: StepResult[] = [];
      for (const step of scene.steps) {
        const zone = stepZone(step, results);
        if (!zone) throw new Error(`m-ecl-start has a step with no zone`);
        if (step.zf)
          for (let x = 0; x <= 100; x += 0.5)
            for (let y = 0; y <= 100; y += 0.5) {
              const p: Point = [x, y];
              if (!inZone(p, zone)) continue;
              checked++;
              const near = towers.find((o) => dist(p, [o.x, o.y]) < ECL_SOAK_R + ATOMIC_PUDDLE.r);
              expect(near && nameOf(near), `${variant} wall: a puddle at (${x}, ${y}) counts as correct`).toBeUndefined();
            }
        const p = step.stand ?? zoneCenter(zone);
        results.push({ p, ok: true, z: zone, drop: step.drop ? p : null });
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  test("the whole Ecliptic wait spot and every tether corner are clear of the lines that must miss you", () => {
    // Every point of the green area counts as correct, not only its center.
    const steps = [
      ...(["north", "south"] as const).flatMap((v) => {
        const sc = withSeed("ECL-WAIT", () => drillById("m-ecl-start").build("H1", v));
        return [sc.steps[sc.steps.length - 1]];
      }),
      ...CODES.slice(0, 8).map((code) => {
        const sc = withSeed(code, () => drillById("m-ecl-towers").build("H2", null));
        return sc.steps[sc.steps.length - 1];
      }),
    ];
    let checked = 0;
    for (const step of steps) {
      const zone = stepZone(step, []);
      if (!zone) throw new Error("no zone");
      const lines = attacksOf(step);
      expect(lines.length).toBeGreaterThanOrEqual(3);
      for (let x = 0; x <= 100; x += 0.5)
        for (let y = 0; y <= 100; y += 0.5) {
          const q: Point = [x, y];
          if (!inZone(q, zone)) continue;
          checked++;
          const line = lines.find((o) => hits(o, q));
          expect(line && nameOf(line), `${step.q}: (${x}, ${y}) counts as correct`).toBeUndefined();
        }
    }
    expect(checked).toBeGreaterThan(100);
  });

  test("a puddle dropped on the last one fails", () => {
    // Void Stardust: the second puddle (step 3) dropped on the first, which is still on the floor.
    const found = problemsIn(moved("m-void", 3, FIRST_PUDDLE), "H1", "2222").map(message);
    expect(found.join("\n")).toMatch(/^m-void \(\w+\), H1, code 2222, step 3: the correct spot is in puddle r 15 at \(50\.0, 33\.0\)$/m);
  });
});
