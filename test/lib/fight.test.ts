import { describe, expect, test } from "vitest";
import { buildFight } from "../../src/data/fight";
import {
  activeSeg,
  answerFightStep,
  askAt,
  askFrom,
  castOf,
  clickTarget,
  countdownOf,
  LEAD,
  newFightState,
  promptOf,
  RESULT_HOLD,
  seek,
  TELL_HOLD,
  tickFight,
  timelineOf,
  viewOf,
} from "../../src/lib/fight";

const fight = () => buildFight("H1", "K7Q2");

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

  test("the right click is right, and the last one scores its drill", () => {
    const s = newFightState("run", fight());
    const g = s.fight.segs[0];
    let last = null;
    for (let j = 0; j < g.due.length; j++) {
      s.t = askFrom(g, j) + 2;
      last = answerFightStep(s, 0, null);
      expect(last?.kind).toBe("ok");
    }
    expect(last?.scored).toEqual({ drill: g.drills[0], allRight: true });
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

describe("Watch the right moves", () => {
  test("answers every step right by itself, at the given speed", () => {
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

  test("the prompt gives the right move, and nothing turns red", () => {
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

  test("the timeline shows at most 6 lines, 30 seconds ahead", () => {
    const s = newFightState("watch", fight());
    for (const t of [0, 60, 200, 400]) {
      s.t = t;
      const { rows } = timelineOf(s);
      expect(rows.length).toBeLessThanOrEqual(6);
      for (const r of rows) expect(Number(r.left || 0)).toBeLessThanOrEqual(30);
    }
  });
});
