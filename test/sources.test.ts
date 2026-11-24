// The fight's times and sizes against its sources: the cactbot timeline and the BossMod module,
// as `npm run import:sources` wrote them into src/data/source.gen.ts. Every time the app uses
// must be a cactbot line, or the start of a cast that ends on one. Every size must be BossMod's.
// A value that matches no source is listed below with the question for the owner, and the test
// checks that it still matches none, so the list stays true.
import { assert, test } from "vitest";
import { ABILITIES, ENRAGE } from "../src/data/abilities";
import * as ATTACKS from "../src/data/attacks";
import { buildFight, cleanChoices } from "../src/data/fight";
import { BOSSMOD_ABILITIES, BOSSMOD_ACTORS, BOSSMOD_ARENA_HALF, CACTBOT_LINES } from "../src/data/source.gen";
import { bossmod, cactbot, type LineName } from "../src/data/sources";
import { TIMELINE } from "../src/data/timeline";
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

/** When a mechanic appears on the arena, where it is not a cactbot line or a cast start. The
    owner has not said yet which line each one follows. */
const SCENE_STARTS = [106, 146.0, 312.0, 321.5, 376.5, 557.5];
/** Times in the text that are typed by hand, with the cactbot line each one stands for. That
    line does not round to the text: 55.5 is 0:56 to the nearest second, not 0:55. */
const TYPED_CLOCKS: Record<string, [LineName, number]> = {
  "0:55": ["Assault Evolved 2", 1],
  "1:00": ["Assault Evolved 3", 1],
  "3:14": ["Assault Evolved 1", 3],
  "8:10": ["Great Wall of Fire (castbar)", 2],
  "10:33": ["Heartbreak Kick", 3],
};

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

test("every time in the cheat sheet's timeline rounds from a cactbot line", () => {
  for (const s of SLOTS)
    for (const row of TIMELINE) {
      const texts = [row.t, ...row.job(s).flatMap((line) => line.match(/\b\d{1,2}:\d\d\b/g) ?? [])];
      for (const t of texts) assert.ok(LINE_CLOCKS.has(t) || t in TYPED_CLOCKS, `${row.n}: ${t}`);
    }
  for (const [t, [line, n]] of Object.entries(TYPED_CLOCKS))
    assert.notEqual(nearClock(cactbot(line, n)), t, `${line} rounds to ${t} now: use it`);
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
  same(yalms(ATTACKS.LINE_STACK_W), ["FearsomeFireballCharge", "TwoWayFireball", "FourWayFireball"], "width");
});
