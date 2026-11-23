import { describe, expect, test } from "vitest";
import { buildFight } from "../../src/data/fight";
import {
  activeSeg,
  answerFightStep,
  askAt,
  askFrom,
  CASTS_AHEAD,
  castOf,
  castPositions,
  castsAhead,
  clickTarget,
  countdownOf,
  hitsGoneOff,
  LEAD,
  newFightState,
  promptOf,
  RESULT_HOLD,
  seek,
  TELL_HOLD,
  tickFight,
  viewOf,
  watchQuestion,
} from "../../src/lib/fight";

const fight = () => buildFight("H1", "K7Q2");

test("the player asks without telling you to click", () => {
  expect(watchQuestion("Click where the party stacks.")).toBe("Where the party stacks.");
  expect(watchQuestion("Click your pair spot.")).toBe("Your pair spot.");
  expect(watchQuestion("Which line stack do you join? Click it.")).toBe("Which line stack do you join?");
  expect(watchQuestion("The stack went off. The boss goes to the first weapon. Click where you go.")).toBe(
    "The stack went off. The boss goes to the first weapon. Where you go.",
  );
  expect(watchQuestion("Second weapon: click where you go.")).toBe("Second weapon: where you go.");
  expect(watchQuestion("Where do you bait?")).toBe("Where do you bait?");
});

describe("where the fight is", () => {
  test("a mechanic is on the arena from its start until 3 seconds after its last hit", () => {
    const f = fight();
    const g = f.segs[0];
    const last = g.due[g.due.length - 1];
    expect(activeSeg(f, g.from - 0.1)).toBe(-1);
    expect(activeSeg(f, g.from)).toBe(0);
    expect(activeSeg(f, last + 3)).toBe(0);
  });

  test("a step is asked before its hit, and a weapon waits for the boss's turn", () => {
    const f = fight();
    for (const g of f.segs)
      g.due.forEach((d, j) => {
        expect(askAt(g, j)).toBeLessThan(d);
        expect(askAt(g, j)).toBeGreaterThanOrEqual(g.from);
      });
    const weapons = f.segs.find((g) => g.turn);
    if (!weapons?.turn) throw new Error("the fight needs a mechanic where the boss turns");
    const j = weapons.scene.steps.length - weapons.turn.weapons;
    expect(askFrom(weapons, j)).toBeCloseTo(weapons.turn.at + TELL_HOLD);
  });
});

describe("the run", () => {
  test("starts LEAD seconds before the first mechanic, with a 3-2-1", () => {
    const s = newFightState("run", fight());
    expect(s.t).toBeCloseTo(s.fight.segs[0].from - LEAD);
    expect(countdownOf(s)).toEqual({ n: 3, name: s.fight.segs[0].title });
  });

  test("with nothing on the floor, skips to LEAD seconds before the next mechanic", () => {
    const s = newFightState("run", fight());
    const g = s.fight.segs[1];
    s.t = s.fight.segs[0].due[s.fight.segs[0].due.length - 1] + 3.5;
    s.results[0] = s.fight.segs[0].due.map(() => ({ p: [0, 0], ok: true, z: { c: [0, 0], r: 1 }, drop: null }));
    tickFight(s, 0.016, 1);
    expect(s.t).toBeGreaterThanOrEqual(g.from - LEAD - 0.001);
    expect(s.t).toBeLessThan(g.from);
  });

  test("a step not answered by its hit is too slow, and a click answers only once it is asked", () => {
    const s = newFightState("run", fight());
    const g = s.fight.segs[0];
    s.t = g.from;
    if (askFrom(g, 0) > g.from) expect(clickTarget(s)).toBe(-1);
    s.t = askFrom(g, 0);
    expect(clickTarget(s)).toBe(0);
    s.t = g.due[0] - 0.01;
    const tick = tickFight(s, 0.02, 1);
    expect(tick.answers[0]?.kind).toBe("slow");
    expect(s.results[0][0].missed).toBe(true);
  });

  test("a correct click counts, and the last one scores its drill", () => {
    const s = newFightState("run", fight());
    const g = s.fight.segs[0];
    let last = null;
    for (let j = 0; j < g.due.length; j++) {
      s.t = askFrom(g, j) + 2;
      last = answerFightStep(s, 0, null);
      expect(last?.kind).toBe("ok");
    }
    expect(last?.scored).toEqual({ drill: g.drills[0], allCorrect: true });
    expect(s.clicks).toHaveLength(0);
  });

  test("after its last click, the mechanic's last hit lands at once and the result holds", () => {
    const s = newFightState("run", fight());
    const g = s.fight.segs[0];
    s.t = askFrom(g, 0);
    for (let j = 0; j < g.due.length; j++) answerFightStep(s, 0, null);
    tickFight(s, 0.016, 1);
    expect(s.t).toBeCloseTo(g.due[g.due.length - 1] - 0.05);
    s.t = g.due[g.due.length - 1] + RESULT_HOLD - 0.1;
    tickFight(s, 0.016, 1);
    expect(activeSeg(s.fight, s.t)).toBe(0);
  });

  test("stops at each new mechanic when asked", () => {
    const s = newFightState("run", fight(), { stops: true });
    tickFight(s, LEAD + 0.01, 1);
    expect(s.paused).toBe(true);
    expect(s.look).toBe(true);
    expect(viewOf(s).look).toBe(true);
  });
});

describe("Watch the correct moves", () => {
  test("answers every step correct by itself, at the given speed", () => {
    const s = newFightState("watch", fight());
    let done = false;
    for (let i = 0; i < 100_000 && !done; i++) done = tickFight(s, 0.05, 2).done;
    expect(done).toBe(true);
    for (const res of s.results) expect(res.every((r) => r.ok)).toBe(true);
  });

  test("going back forgets the answers to the hits after that moment", () => {
    const s = newFightState("watch", fight());
    seek(s, s.fight.end);
    tickFight(s, 0, 1);
    seek(s, s.fight.segs[2].from);
    s.fight.segs.forEach((g, si) => {
      for (let j = 0; j < s.results[si].length; j++) expect(g.due[j]).toBeLessThanOrEqual(s.fight.segs[2].from);
    });
  });

  test("the prompt gives the correct move, and nothing turns red", () => {
    const s = newFightState("watch", fight());
    const g = s.fight.segs[0];
    s.t = g.due[0] - 1;
    const p = promptOf(s);
    expect(p.text).toBe(g.scene.steps[0].a);
    expect(p.look).toBe("ask");
    expect(p.ring?.urgent).toBe(false);
  });
});

describe("the HUD", () => {
  test("the cast bar fills toward the next line", () => {
    const s = newFightState("watch", fight());
    const e = s.lines[0];
    s.t = e.t - 0.5;
    const c = castOf(s);
    expect(c.casting).toBe(true);
    expect(c.name).toBe(e.name);
    expect(c.fill).toBeGreaterThan(0);
  });

  test("a cast in view is the boss's own cast (BossMod: Boss->self, single-target) or a hit", () => {
    const s = newFightState("watch", fight());
    s.t = 44;
    const kind = (name: string) => castsAhead(s).find((m) => m.name === name)?.cast;
    expect(kind("Assault Evolved")).toBe(true);
    expect(kind("Assault Evolved 1")).toBe(false);
    s.t = 80;
    expect(kind("Cometite 1 drops")).toBe(true);
    expect(kind("Cometite 1")).toBe(false);
  });

  test("the casts in view: up to 30 seconds ahead and 2 behind, in time order", () => {
    const s = newFightState("watch", fight());
    for (const t of [0, 60, 200, 400]) {
      s.t = t;
      const marks = castsAhead(s);
      for (const m of marks) {
        expect(m.left).toBeLessThanOrEqual(CASTS_AHEAD);
        expect(m.left).toBeGreaterThanOrEqual(-2);
      }
      for (let k = 1; k < marks.length; k++) expect(marks[k].left).toBeGreaterThanOrEqual(marks[k - 1].left);
    }
  });

  test("a hit goes off when a playing clock passes its time; a cast, a jump or a seek back does not", () => {
    const s = newFightState("watch", fight());
    s.t = 50.45;
    // Assault Evolved 1 hits at 50.4; the frame before was at 50.38.
    expect(hitsGoneOff(castsAhead(s), 50.38, 50.45).map((m) => m.name)).toEqual(["Assault Evolved 1"]);
    // The boss's cast, Assault Evolved, ends at 48.2: no flash.
    s.t = 48.25;
    expect(hitsGoneOff(castsAhead(s), 48.18, 48.25)).toEqual([]);
    // A jump of more than a second, or back in time, shows nothing go off.
    s.t = 50.45;
    expect(hitsGoneOff(castsAhead(s), 45, 50.45)).toEqual([]);
    expect(hitsGoneOff(castsAhead(s), 52, 50.45)).toEqual([]);
  });

  test("a cast sits by its time, and close casts are pushed apart", () => {
    const mark = (left: number) => ({ i: 0, name: "", t: 0, cats: [], raidwide: false, cast: false, left });
    // 330 pixels for 30 seconds after the now line at 30: 10 pixels a second.
    expect(castPositions([mark(0), mark(15), mark(30)], 330, 30, 20)).toEqual([30, 180, 330]);
    expect(castPositions([mark(5), mark(5.5)], 330, 30, 20)).toEqual([80, 100]);
    // A cast that went off a second ago pushes nothing: the next one stays at its time.
    expect(castPositions([mark(-1), mark(0.5)], 330, 30, 20)).toEqual([20, 35]);
  });
});
