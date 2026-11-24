import { assert, test } from "vitest";
import { MAJESTIC_PUDDLE } from "../src/data/attacks";
import { DRILLS } from "../src/data/drills";
import { buildFight } from "../src/data/fight";
import { cactbot, type LineName } from "../src/data/sources";
import { inZone, rotZone, zoneCenter } from "../src/geometry";
import { clock, sec } from "../src/time";
import type { Slot, StepResult } from "../src/types";

const REPEATS = 200;
const SLOTS: Slot[] = ["H1", "H2"];

test("clock and sec turn fight times both ways", () => {
  assert.equal(sec("1:24"), 84);
  assert.equal(clock(84), "1:24");
  assert.equal(clock(sec("0:05")), "0:05");
  // The seconds round down, so a time just before a full minute never shows as ":60".
  assert.equal(clock(119.6), "1:59");
  assert.equal(clock(659.6), "10:59");
});

test("every mechanic has one hit time per step, in order, inside the fight", () => {
  for (let i = 0; i < REPEATS; i++)
    for (const s of SLOTS) {
      const f = buildFight(s);
      let prevFrom = -1;
      for (const g of f.segs) {
        assert.equal(g.due.length, g.scene.steps.length, `${g.title}: one hit time per step`);
        assert.isAbove(g.from, prevFrom, `${g.title}: mechanics in fight order`);
        g.due.forEach((d, j) => {
          assert.isAbove(d, j ? g.due[j - 1] : g.from - 0.01, `${g.title}: hit times in order`);
        });
        assert.isBelow(g.due[g.due.length - 1], f.end, `${g.title}: before the end`);
        prevFrom = g.from;
      }
    }
});

test("every click is due on a timeline line, and the lines run in time order", () => {
  for (let i = 0; i < 20; i++) {
    const f = buildFight("H1");
    f.events.forEach((e, j) => {
      assert.isAtLeast(e.t, j ? f.events[j - 1].t : 0, e.name);
    });
    for (const g of f.segs)
      for (const d of g.due)
        assert.ok(
          f.events.some((e) => Math.abs(e.t - d) < 0.05),
          `${g.title}: nothing on the timeline at ${d}`,
        );
  }
});

test("the boss turns to the first weapon when his cast starts, at least 6 seconds before the hit", () => {
  for (let i = 0; i < 20; i++) {
    const f = buildFight("H1");
    const set1 = f.segs.find((g) => g.title === "Assault Evolved"),
      set2 = f.segs.find((g) => g.title.startsWith("Void Stardust into"));
    if (!set1?.turn || !set2?.turn) throw new Error("both Assault Evolved sets need a turn time");
    assert.closeTo(set1.turn.at, 42.2, 0.05, "first set: 0:48.2 minus the 6.0 s cast");
    assert.closeTo(set2.turn.at, 86.7, 0.05, "second set: 1:32.7 minus the 6.0 s cast");
    assert.isAtLeast(set1.due[0] - set1.turn.at, 6, "time to react before the first hit");
    assert.isAtLeast(set2.due[5] - set2.turn.at, 6, "time to react before the first weapon of the second set");
    assert.equal(set1.turn.f, set1.scene.bossAt?.(0).f, "he faces the first weapon of the first set");
  }
});

test("every drill has a place on the fight clock", () => {
  const ids = new Set(DRILLS.map((m) => m.id)),
    seen = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const covered = buildFight("H1").segs.flatMap((g) => g.drills);
    for (const id of covered) {
      assert.ok(ids.has(id), `the fight names a drill that does not exist: ${id}`);
      seen.add(id);
    }
  }
  // Two-way and Four-way Fireball take turns from fight to fight, so check over many fights.
  for (const m of DRILLS) assert.ok(seen.has(m.id), `${m.title} has no place in the fight`);
});

test("the arena is split from Flatliner until the Crown of Arcadia that joins it", () => {
  const f = buildFight("H1");
  assert.deepEqual(
    f.split.map((t) => f.events.find((e) => Math.abs(e.t - t) < 0.05)?.name),
    ["Flatliner", "Crown of Arcadia"],
  );
  for (const g of f.segs)
    assert.equal(
      Boolean(g.scene.split),
      g.from >= f.split[0] && g.from < f.split[1],
      `${g.title}: split arena only between Flatliner and the Crown`,
    );
});

test("the second Raw Steel Trophy and the second Void Stardust go the other way", () => {
  for (let i = 0; i < REPEATS; i++) {
    const f = buildFight("H1");
    const raw = f.segs.filter((g) => g.title.startsWith("Raw Steel Trophy")).map((g) => g.title.split(": ")[1]);
    assert.sameMembers(raw, ["Axe", "Scythe"]);
    const first = f.segs.find((g) => g.title.startsWith("Void Stardust into"))?.scene.steps[4].q ?? "";
    const again = f.segs.find((g) => g.title === "Void Stardust (Second Time)")?.scene.steps[3].q ?? "";
    assert.notEqual(/Comet/.test(first), /Comet/.test(again), "one spread and one stack");
  }
});

test("Watch the Correct Moves: the spot it clicks is correct for every step", () => {
  for (let i = 0; i < REPEATS; i++)
    for (const s of SLOTS) {
      for (const g of buildFight(s).segs) {
        const results: StepResult[] = [];
        g.scene.steps.forEach((st, j) => {
          const base = st.zf ? st.zf(results) : st.z;
          if (!base) throw new Error(`${g.title}: step ${j + 1} has no zone`);
          const zone = rotZone(base, g.k),
            p = zoneCenter(zone);
          assert.ok(inZone(p, zone), `${g.title}: step ${j + 1}`);
          results.push({ p, ok: true, z: zone, drop: st.drop ? p : null });
        });
      }
    }
});

test("Arena Split: one round with a tether, and you stack for Massive Meteor on the other platform", () => {
  for (const s of SLOTS)
    for (let i = 0; i < REPEATS; i++) {
      const f = buildFight(s),
        rounds = f.segs.filter((g) => g.drills[0] === "m-split-fire");
      assert.equal(rounds.length, 2);
      assert.deepEqual(rounds.map((g) => /tether/.test(g.scene.steps[3].q)).sort(), [false, true], "a tether in one round only");
      const massive = f.segs.find((g) => g.title === "Massive Meteor");
      const p = zoneCenter(massive?.scene.steps[0].z ?? { c: [50, 50], r: 0 });
      // H1 starts west and H2 east; the two rounds put each on the other platform.
      assert.ok(s === "H1" ? p[0] > 74.5 : p[0] < 25.5, `${s} stacks on the ${s === "H1" ? "east" : "west"} platform`);
    }
});

test("Arena Split: each Majestic Meteor puddle goes off at its cactbot hit", () => {
  const rounds = buildFight("H1").segs.filter((g) => g.drills[0] === "m-split-fire");
  rounds.forEach((g, i) => {
    const hits = [1, 2, 3].map((n) => cactbot(`Majestic Meteor ${n}` as LineName, i + 1));
    g.scene.steps.slice(0, 3).forEach((st, j) => {
      assert.equal(st.drop, MAJESTIC_PUDDLE, `${g.title}: puddle ${j + 1}`);
      assert.closeTo(g.due[j] + MAJESTIC_PUDDLE.life, hits[j], 0.05, `${g.title}: puddle ${j + 1} goes off`);
    });
    assert.isUndefined(g.scene.steps[3].drop);
  });
});
