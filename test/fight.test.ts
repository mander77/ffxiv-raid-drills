import { assert, test } from "vitest";
import { ATTACK, busterPieces, floorAttacks, MAJESTIC_PUDDLE, PLATFORM_X } from "../src/data/fights/m11s/attacks";
import { DRILLS } from "../src/data/fights/m11s/drills";
import { buildFight, buildHits, RANDOM } from "../src/data/fights/m11s/fight";
import { bossmod, cactbot, castStart, type LineName } from "../src/data/fights/m11s/sources";
import { angOf, dist, inZone, rotZone, stepZone, zoneCenter } from "../src/geometry";
import { clock, sec } from "../src/time";
import type { Point, Slot, StepResult } from "../src/types";
import { MANY_FIGHTS_TIMEOUT } from "./m11s";

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

test("every mechanic has one hit time per step, in order, inside the fight", { timeout: MANY_FIGHTS_TIMEOUT }, () => {
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

test("no full-fight scene marks your own slot: the moving marker is you", () => {
  for (let i = 0; i < 50; i++)
    for (const s of SLOTS)
      for (const g of buildFight(s).segs) {
        const drawn = [...g.scene.overlays, ...g.scene.steps.flatMap((st) => [...(st.cue ?? []), ...(st.reveal ?? [])])];
        assert.isFalse(
          drawn.some((o) => o.t === "mark" && o.l === s),
          `${g.title}: a mark for ${s}`,
        );
      }
});

test("Practice's second towers still mark where you ended the last round", () => {
  for (const s of SLOTS) {
    const scene = DRILLS.find((d) => d.id === "m-split-towers2")?.build(s, null);
    assert.isTrue(scene?.overlays.some((o) => o.t === "mark" && o.l === s));
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
  for (const g of f.segs) {
    // A scene that splits the arena at one of its hits (Flatliner, in the lineup) splits it then.
    const splits = g.scene.splitAfter === undefined ? g.from : g.due[g.scene.splitAfter];
    assert.equal(
      Boolean(g.scene.split),
      splits >= f.split[0] && splits < f.split[1],
      `${g.title}: split arena only between Flatliner and the Crown`,
    );
  }
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

test("Raw Steel Trophy: the casts list each weapon's tank hit, and the hits mark it as Tank Damage", () => {
  for (const raw of ["axe", "scythe"] as const) {
    const f = buildFight("H1", undefined, { ...RANDOM, raw });
    const names = f.events.map((e) => e.name);
    assert.include(names, "Raw Steel (Axe)");
    assert.include(names, "Raw Steel x2 (Scythe)");
    const tank = buildHits(f).filter((h) => h.name === "Raw Steel");
    assert.lengthOf(tank, 2, `${raw} first: both Raw Steel rows`);
    for (const h of tank) assert.equal(h.cat, "tank");
  }
});

test("Watch the Correct Moves: the spot it clicks is correct for every step", { timeout: MANY_FIGHTS_TIMEOUT }, () => {
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

test("Arena Split: one round with a tether, and you stack for Massive Meteor where round 2 ended", () => {
  for (const s of SLOTS)
    for (let i = 0; i < REPEATS; i++) {
      const f = buildFight(s),
        rounds = f.segs.filter((g) => g.drills[0] === "m-split-fire");
      assert.equal(rounds.length, 2);
      assert.deepEqual(
        rounds.map((g) => /tether/.test(g.scene.steps[g.scene.steps.length - 1].q)).sort(),
        [false, true],
        "a tether in one round only",
      );
      const massive = f.segs.find((g) => g.title === "Massive Meteor");
      const p = zoneCenter(massive?.scene.steps[0].z ?? { c: [50, 50], r: 0 }),
        side2 = platformOf(rounds[1]);
      assert.ok(side2 === "west" ? p[0] <= PLATFORM_X.west[1] : p[0] >= PLATFORM_X.east[0], `${s} stacks on the ${side2} platform`);
    }
});

test("Arena Split: the tethers swap in the second round", () => {
  for (const s of SLOTS)
    for (let i = 0; i < REPEATS; i++) {
      const f = buildFight(s),
        rounds = f.segs.filter((g) => g.drills[0] === "m-split-fire"),
        tethered = rounds.map((g) => {
          const reveal = g.scene.steps[g.scene.steps.length - 1].reveal ?? [],
            cords = reveal.flatMap((o) => (o.t === "tether" ? [o] : []));
          // A tethered player stands at the end of a tether; the others are the markers.
          const party = g.scene.steps[g.scene.steps.length - 1].party ?? {};
          const onCord = Object.entries(party).flatMap(([l, p]) =>
            p !== "you" && cords.some((c) => c.x2 === p[0] && c.y2 === p[1]) ? [l] : [],
          );
          return [...(g.scene.tether ? [s] : []), ...onCord];
        });
      for (const t of tethered) assert.equal(t.length, 4, `${s}: four tethered players each round`);
      assert.deepEqual([...tethered[0], ...tethered[1]].sort(), ["H1", "H2", "M1", "M2", "MT", "OT", "R1", "R2"], `${s}: everyone once`);
      // A tether at the second towers is the second round's tether: the same portal.
      const towers = f.segs.find((g) => g.title === "Arena Split: Second Towers");
      assert.deepEqual(towers?.scene.tether?.portal, rounds[1].scene.tether?.portal, `${s}: the second towers' portal`);
    }
});

/** A round's platform and end, from its setup: "You are on the west platform." and, with a
    tether, the end away from its portal; without one, the end you were knocked to. */
const platformOf = (g: { scene: { setup: readonly string[] } }): string =>
  (g.scene.setup.join(" ").match(/on the (west|east) platform/) ?? [])[1] ?? "";
const endOf = (g: { scene: { setup: readonly string[] } }): string => {
  const text = g.scene.setup.join(" "),
    knocked = text.match(/knocked to the (north|south) end/)?.[1],
    portal = text.match(/toward the (north|south)\./)?.[1];
  return knocked ?? (portal === "north" ? "south" : "north");
};

test("Arena Split: the towers send you across only for a tether whose portal is on your side", () => {
  for (const s of SLOTS)
    for (let i = 0; i < REPEATS; i++) {
      const f = buildFight(s),
        rounds = f.segs.filter((g) => g.drills[0] === "m-split-fire"),
        towers2 = f.segs.find((g) => g.title === "Arena Split: Second Towers"),
        home = s === "H1" ? "west" : "east",
        other = (e: string) => (e === "north" ? "south" : "north");
      if (!towers2) throw new Error("no second towers");
      const [side1, side2] = rounds.map(platformOf),
        [end1, end2] = rounds.map(endOf);
      // A tether ends across from its portal; without one you stay and land at the other end.
      for (const [g, side] of [
        [rounds[0], side1],
        [rounds[1], side2],
      ] as const) {
        const portal = g.scene.tether?.portal;
        if (portal) assert.equal(side, portal[0] < 50 ? "east" : "west", `${s}: across from the portal`);
      }
      if (!rounds[0].scene.tether) assert.deepEqual([side1, end1], [home, "north"], `${s}: round 1, knocked along from the south tower`);
      if (!rounds[1].scene.tether) assert.deepEqual([side2, end2], [side1, other(end1)], `${s}: round 2, knocked along from round 1's end`);
      // The second towers are in the quadrant where round 1 ended.
      const p = zoneCenter(stepZone(towers2.scene.steps[0], []) ?? { c: [50, 50], r: 0 });
      assert.equal(p[0] < 50 ? "west" : "east", side1, `${s}: second towers, platform`);
      assert.equal(p[1] < 50 ? "north" : "south", end1, `${s}: second towers, end`);
    }
});

test("Arena Split: each Majestic Meteor puddle goes off at its cactbot hit", () => {
  const rounds = buildFight("H1").segs.filter((g) => g.drills[0] === "m-split-fire");
  rounds.forEach((g, i) => {
    const hits = [1, 2, 3].map((n) => cactbot(`Majestic Meteor ${n}` as LineName, i + 1));
    // With a tether, the first step is the wait for the Fire Breath markers, at their line.
    const k = g.scene.tether ? 1 : 0;
    if (k) {
      assert.isUndefined(g.scene.steps[0].drop, `${g.title}: no puddle while you wait`);
      assert.equal(g.due[0], cactbot("--Fire Breath Markers--", i + 1), `${g.title}: wait until the markers`);
    }
    g.scene.steps.slice(k, k + 3).forEach((st, j) => {
      assert.equal(st.drop, MAJESTIC_PUDDLE, `${g.title}: puddle ${j + 1}`);
      assert.closeTo(g.due[k + j] + MAJESTIC_PUDDLE.life, hits[j], 0.05, `${g.title}: puddle ${j + 1} goes off`);
    });
    assert.isUndefined(g.scene.steps[k + 3].drop);
  });
});

test("Arena Split: a round 1 tether shows from the first towers, before the knockback", () => {
  for (const s of SLOTS)
    for (let i = 0; i < REPEATS; i++) {
      const f = buildFight(s),
        towers = f.segs.find((g) => g.title === "Arena Split: First Towers"),
        round1 = f.segs.find((g) => g.title === "Arena Split: Fire Breath");
      if (!towers || !round1) throw new Error("no first towers or round 1");
      // The tether comes before the tower's knockback (its hit) and is the same tether as round 1's.
      assert.isBelow(towers.from, towers.due[0], `${s}: shown before the knockback`);
      assert.deepEqual(towers.scene.tether?.portal, round1.scene.tether?.portal, `${s}: the round 1 tether`);
      assert.include(towers.scene.setup.join(" "), round1.scene.tether ? "You have a tether" : "No tether", s);
    }
});

test("no two mechanics run at once: each one's last click is due before the next one starts", () => {
  for (const s of ["H1", "H2"] as const)
    for (let i = 0; i < 20; i++) {
      const f = buildFight(s);
      f.segs.slice(1).forEach((g, k) => {
        const prev = f.segs[k];
        assert.isAtMost(Math.max(...prev.due), g.from, `${prev.title} runs into ${g.title}`);
      });
    }
});

test("the second Great Wall of Fire goes 45 degrees clockwise, with the OT in front", () => {
  const boss: Point = [50, 50];
  const cases: Array<[string, number, string]> = [
    ["Great Wall of Fire #1", 0, "MT"],
    ["Great Wall of Fire #2 + line dodge", 45, "OT"],
  ];
  for (const [name, facing, front] of cases) {
    const pieces = busterPieces(name, boss);
    const line = pieces.find((o) => o.t === "band");
    if (line?.t !== "band") throw new Error(`${name} has no line`);
    assert.closeTo(angOf([line.x2 - line.x, line.y2 - line.y]), facing, 0.01, name);
    // Both tanks stand on the line, the front one closer to the boss.
    const tanks = pieces.flatMap((o) => (o.t === "mark" ? [o] : [])).sort((a, b) => dist([a.x, a.y], boss) - dist([b.x, b.y], boss));
    for (const t of tanks) assert.closeTo(angOf([t.x - boss[0], t.y - boss[1]]), facing, 0.01, `${t.l} in ${name}`);
    assert.equal(tanks[0]?.l, front, name);
  }
});

test("each Great Wall of Fire fire trail is on the floor while it casts, on the line its wall hit", () => {
  const boss: Point = [50, 50];
  const trail = bossmod("WallExplosion");
  for (const n of [1, 2]) {
    const cases: Array<[LineName, number]> = [
      ["Explosion 1", 0],
      ["Explosion 2", 45],
    ];
    for (const [line, facing] of cases) {
      const from = castStart("WallExplosion", line, n),
        to = cactbot(line, n);
      assert.isEmpty(
        floorAttacks(from - 0.1, boss).filter((o) => o.t === "band" && Math.abs(angOf([o.x2 - o.x, o.y2 - o.y]) - facing) < 0.01),
        `${line} ${n} before its cast`,
      );
      const on = floorAttacks((from + to) / 2, boss);
      assert.lengthOf(on, 1, `${line} ${n} while it casts`);
      const band = on[0];
      if (band?.t !== "band") throw new Error("not a line");
      assert.closeTo(angOf([band.x2 - band.x, band.y2 - band.y]), facing, 0.01);
      assert.closeTo(band.w, ATTACK.yalms(trail.width), 0.01);
      assert.isEmpty(
        floorAttacks(to, boss).filter((o) => o.t === "band" && Math.abs(angOf([o.x2 - o.x, o.y2 - o.y]) - facing) < 0.01),
        `${line} ${n} after it goes off`,
      );
    }
  }
});
