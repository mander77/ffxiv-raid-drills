// The fight's times and sizes against its sources: the cactbot timeline and the BossMod module,
// as `npm run import:sources` wrote them into src/data/fights/m11s/source.gen.ts. Every time the app uses
// must be a cactbot line, or the start of a cast that ends on one. Every size must be BossMod's.
// A value that matches no source is listed below with the question for the owner, and the test
// checks that it still matches none, so the list stays true.
import { assert, test } from "vitest";
import { ABILITIES, ENRAGE } from "../src/data/fights/m11s/abilities";
import * as ATTACKS from "../src/data/fights/m11s/attacks";
import { DRILLS } from "../src/data/fights/m11s/drills";
import { buildFight, cleanChoices } from "../src/data/fights/m11s/fight";
import { LEARN_CARDS, TIMELINE_CARDS } from "../src/data/fights/m11s/questions";
import { BOSSMOD_ABILITIES, BOSSMOD_ACTORS, BOSSMOD_ARENA_HALF, CACTBOT_LINES } from "../src/data/fights/m11s/source.gen";
import { bossmod } from "../src/data/fights/m11s/sources";
import { TIMELINE } from "../src/data/fights/m11s/timeline";
import { nearClock } from "../src/time";
import type { Slot } from "../src/types";

const SLOTS: Slot[] = ["H1", "H2"];
/** Two times closer than this are the same time: the sources write one decimal. */
const SAME = 0.05;

/** A cactbot line at t. */
const isLine = (t: number): boolean => CACTBOT_LINES.some((l) => Math.abs(l.t - t) < SAME);
/** The start of a BossMod cast that ends on a cactbot line of the same ability, at t. */
const isCastStart = (t: number): boolean =>
  CACTBOT_LINES.some((l) =>
    Object.values(BOSSMOD_ABILITIES).some(
      (a) => a.cast > 0 && (l.ids as readonly string[]).includes(a.id) && Math.abs(l.t - a.cast - t) < SAME,
    ),
  );
/** Every time as text (such as "0:11"), to the nearest second, that a cactbot line gives. */
const LINE_CLOCKS = new Set(CACTBOT_LINES.map((l) => nearClock(l.t)));

/** When a mechanic appears on the arena, where it is not a cactbot line or a cast start: no line
    comes between the mechanic before it and its own first hit. A question for the owner. */
const SCENE_STARTS = [106];
/** The times such as "0:11" in a line of text. */
const clocks = (line: string): string[] => line.match(/\b\d{1,2}:\d\d\b/g) ?? [];

/** Every full fight the choices can make: each Raw Steel Trophy weapon and each Fireball. */
function everyFight() {
  return SLOTS.flatMap((s) =>
    (["axe", "scythe"] as const).flatMap((raw) =>
      (["two", "four"] as const).map((fireball) => buildFight(s, "ABCD", cleanChoices({ raw, fireball }))),
    ),
  );
}

test("the generated file has the fight from the pull to the enrage", () => {
  assert.isAbove(CACTBOT_LINES.length, 100);
  CACTBOT_LINES.forEach((l, i) => {
    assert.isAtLeast(l.t, i ? CACTBOT_LINES[i - 1].t : 0, `${l.name}: lines in time order`);
  });
  assert.equal(ENRAGE, CACTBOT_LINES.find((l) => l.name === "Heartbreaker (Enrage)")?.t);
  assert.isAtMost(CACTBOT_LINES[CACTBOT_LINES.length - 1].t - ENRAGE, 0.5, "nothing comes after the enrage");
});

test("every ability in the ability list is at a cactbot line", () => {
  for (const a of ABILITIES) assert.ok(isLine(a.t), `${a.name} at ${a.t}`);
});

test("every timeline line, hit and turn of the full fight is at a cactbot line or a cast start", () => {
  for (const f of everyFight()) {
    for (const e of f.events) assert.ok(isLine(e.t) || isCastStart(e.t), `${e.name} at ${e.t}`);
    for (const g of f.segs) {
      for (const d of g.due) assert.ok(isLine(d) || isCastStart(d), `${g.title}: a hit at ${d}`);
      if (g.turn) assert.ok(isCastStart(g.turn.at), `${g.title}: the turn at ${g.turn.at}`);
      const known = isLine(g.from) || isCastStart(g.from);
      assert.ok(known || SCENE_STARTS.includes(g.from), `${g.title}: appears at ${g.from}`);
    }
    assert.ok(isLine(f.split[0]) && isLine(f.split[1]), "the arena split starts and ends at cactbot lines");
  }
});

test("each scene start that matches no source is still a question for the owner", () => {
  for (const t of SCENE_STARTS) assert.notOk(isLine(t) || isCastStart(t), `${t} is a source time now: use it`);
});

test("every time the text shows is a cactbot line, to the nearest second", () => {
  const texts: [string, string][] = [];
  for (const s of SLOTS) {
    for (const row of TIMELINE) for (const line of [row.t, ...row.job(s)]) texts.push([row.n, line]);
    for (const c of [...LEARN_CARDS, ...TIMELINE_CARDS]) {
      const q = c.build(s);
      for (const line of [c.time, q.prompt, ...q.options.map((o) => o.t), ...q.why, ...q.rule]) texts.push([c.id, line]);
    }
    for (const m of DRILLS) texts.push([m.id, m.time]);
  }
  assert.isAbove(texts.length, 200, "the test reads the text");
  for (const [where, line] of texts) for (const t of clocks(line)) assert.ok(LINE_CLOCKS.has(t), `${where}: ${t}`);
});

test("each attack size is BossMod's, and one size stands for each group of attacks", () => {
  const yalms = (u: number): number => u / 2.5;
  assert.equal(BOSSMOD_ARENA_HALF * 2, 40, "the arena is 40 yalms across, 100 units in this app");
  assert.equal(yalms(ATTACKS.HITBOX), BOSSMOD_ACTORS.Boss.radius);
  const same = (size: number, names: (keyof typeof BOSSMOD_ABILITIES)[], field: "range" | "width") => {
    for (const n of names) assert.equal(size, Reflect.get(bossmod(n), field), `${n} ${field}`);
  };
  same(
    yalms(ATTACKS.SPREAD_R),
    ["RawSteelAxeImpact", "CometSpread", "CrushingCometStack", "EyeOfTheHurricane", "MassiveMeteorStack"],
    "range",
  );
  same(yalms(ATTACKS.TOWER_R), ["ExplosionTower", "CosmicKissEcliptic", "WeightyImpact", "HeartbreakKickTower"], "range");
  same(yalms(ATTACKS.lineStack([50, 50], [0, 50]).w), ["FearsomeFireballCharge", "TwoWayFireball", "FourWayFireball"], "width");
  assert.equal(ATTACKS.ORBITAL_LANE * 4, 100, "four Orbital Omen lanes span the arena");
});
