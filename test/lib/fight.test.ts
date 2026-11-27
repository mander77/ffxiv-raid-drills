import { describe, expect, test } from "vitest";
import { M11S } from "../../src/data/fights/m11s";
import { CROWN_STRIPS } from "../../src/data/fights/m11s/attacks";
import { cactbot, castStart } from "../../src/data/fights/m11s/sources";
import {
  activeSeg,
  answerFightStep,
  askAt,
  askFrom,
  CAST_GO_LEAD,
  CASTS_AHEAD,
  CASTS_PAST,
  castFade,
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
  stepGoAt,
  TELL_HOLD,
  tickFight,
  viewOf,
  watchAt,
  watchQuestion,
} from "../../src/lib/fight";
import { buildFight } from "../m11s";

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

  test("Heartbreak Kick asks at each set's first and last hit, and its tower stays until hit 7", () => {
    const f = fight();
    const si = f.segs.findIndex((g) => g.title === "Heartbreak Kick");
    expect(f.segs[si].due).toEqual([
      cactbot("Heartbreak Kick 1"),
      cactbot("Heartbreak Kick 5"),
      cactbot("Heartbreak Kick 1", 2),
      cactbot("Heartbreak Kick 6"),
      cactbot("Heartbreak Kick 1", 3),
      cactbot("Heartbreak Kick 7"),
    ]);
    expect(activeSeg(f, cactbot("Heartbreak Kick 3", 3) + 0.3)).toBe(si);
    expect(activeSeg(f, cactbot("Heartbreak Kick 7") + 3)).toBe(si);
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

describe("Watch the Correct Moves", () => {
  test("answers every step correct by itself, at the given speed", () => {
    const s = newFightState("watch", fight());
    let done = false;
    for (let i = 0; i < 100_000 && !done; i++) done = tickFight(s, 0.05, 2).done;
    expect(done).toBe(true);
    for (const res of s.results) expect(res.every((r) => r.ok)).toBe(true);
  });

  test("a step chip goes to its step, a few seconds before its correct move, back or on", () => {
    for (const from of ["start", "end"] as const) {
      const s = newFightState("watch", fight(), { paused: true });
      s.fight.segs.forEach((g, si) => {
        if (g.due.length < 2) return;
        g.due.forEach((_d, j) => {
          if (from === "end") seek(s, s.fight.end);
          seek(s, stepGoAt(g, j));
          tickFight(s, 0, 1);
          expect(watchAt(g, j) - s.t).toBeLessThanOrEqual(CAST_GO_LEAD);
          expect(activeSeg(s.fight, s.t)).toBe(si);
          expect(s.results[si].length, `${from}: ${g.title}, step ${j + 1}`).toBe(j);
        });
      });
    }
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
    expect(p.text).toBe(g.scene.steps[0].a[0]);
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
  });

  test("a cast that went off keeps its room and gives it up as it fades", () => {
    const mark = (left: number) => ({ i: 0, name: "", t: 0, cats: [], raidwide: false, cast: false, left });
    // Just gone off: all its room, so the next one stays where it was pushed.
    expect(castPositions([mark(-0.001), mark(0.5)], 330, 30, 20)[1]).toBeCloseTo(50, 1);
    // Half a second into its 2-second fade: three quarters of its room.
    expect(castPositions([mark(-0.5), mark(0.5)], 330, 30, 20)).toEqual([25, 40]);
    // Gone: the next one is at its own time.
    expect(castPositions([mark(-2), mark(0.5)], 330, 30, 20)).toEqual([10, 35]);
    expect(castFade(1)).toBe(1);
    expect(castFade(-0.5)).toBe(0.75);
    expect(castFade(-3)).toBe(0);
  });

  test("on a phone, no cast jumps onto one that went off, for every pick", () => {
    // The sideways strip at 375 px: CastList's "x" sizes in a 304-pixel box, and a cast's name
    // 72 pixels wide (w-18). A gone cast hides its name there, so only the names to come can meet.
    const box = 304;
    const { now, end, gap } = { now: 56, end: 12, gap: 76 };
    const nameWidth = 72;
    const step = 0.05;
    // A cast slides as the room of gone casts runs out, faster when several fade at once, but
    // well under this in one step. A jump onto a gone cast was 27 pixels or more.
    const maxMove = 12;
    // Every value of every pick, the others random from the code.
    const picks = M11S.clock.rows.flatMap((row) => row.options.map(([value]) => ({ ...M11S.clock.random, [row.key]: value })));
    for (const choices of picks) {
      const s = newFightState("watch", buildFight("H1", "K7Q2", choices));
      let was = new Map<number, number>();
      for (let t = 0; t < s.lines[s.lines.length - 1].t + CASTS_PAST; t += step) {
        s.t = t;
        const marks = castsAhead(s);
        const places = castPositions(marks, box - end, now, gap);
        const at = new Map(marks.map((m, k) => [m.i, places[k]]));
        marks.forEach((m, k) => {
          const moved = Math.abs((was.get(m.i) ?? places[k]) - places[k]);
          if (moved > maxMove) expect.fail(`${m.name} jumps ${moved.toFixed(0)} px at ${t.toFixed(1)} s (${JSON.stringify(choices)})`);
          const next = marks[k + 1];
          if (next && m.left >= 0 && places[k + 1] - places[k] < nameWidth)
            expect.fail(`${m.name} and ${next.name} overlap at ${t.toFixed(1)} s (${JSON.stringify(choices)})`);
        });
        was = at;
      }
    }
  });
});

test("Watch the Correct Moves shows Massive Meteor's stack from its first hit until its fifth", () => {
  const s = newFightState("watch", fight(), { paused: true });
  const si = s.fight.segs.findIndex((g) => g.title === "Massive Meteor");
  const g = s.fight.segs[si];
  if (g.firstHit == null) throw new Error("Massive Meteor has no first hit");
  expect(g.firstHit).toBeLessThan(g.due[0]);
  // A paused frame fills in the correct moves up to now.
  seek(s, g.firstHit - 0.2);
  tickFight(s, 0, 1);
  expect(viewOf(s).showAnswer).toBe(false);
  for (const t of [g.firstHit + 0.1, g.due[0] - 0.1]) {
    seek(s, t);
    tickFight(s, 0, 1);
    const v = viewOf(s);
    expect(v.si).toBe(si);
    expect(v.showAnswer).toBe(true);
  }
});

test("Ultimate Trophy Weapons: each weapon shows on the arena from its spawn, one at a time", () => {
  for (const mode of ["run", "watch"] as const) {
    const s = newFightState(mode, fight(), { paused: true });
    const si = s.fight.segs.findIndex((g) => g.title === "Ultimate Trophy Weapons");
    const spawns = s.fight.segs[si].spawns;
    if (!spawns) throw new Error("Ultimate Trophy Weapons has no spawn times");
    const at = (t: number) => {
      seek(s, t);
      tickFight(s, 0, 1);
      return viewOf(s);
    };
    expect(at(s.fight.segs[si].from + 0.05).spawned).toBe(0);
    spawns.forEach((t, i) => {
      expect(at(t - 0.05).spawned, `just before weapon ${i + 1}`).toBe(i);
      const v = at(t + 0.05);
      expect(v.si).toBe(si);
      expect(v.spawned, `weapon ${i + 1}`).toBe(i + 1);
    });
  }
  // Other mechanics show their weapons by their own rule.
  const s = newFightState("run", fight(), { paused: true });
  expect(viewOf(s).spawned).toBeUndefined();
});

test("the lineup's arena splits when Flatliner goes off, in the run too", () => {
  for (const mode of ["watch", "run"] as const) {
    const s = newFightState(mode, fight(), { paused: true });
    const si = s.fight.segs.findIndex((g) => g.title === "Arena Split: Lineup");
    const flatliner = cactbot("Flatliner (split)");
    expect(s.fight.segs[si].due[0]).toBe(flatliner);
    for (const [t, split] of [
      [flatliner - 0.1, false],
      [flatliner + 0.1, true],
    ] as const) {
      seek(s, t);
      tickFight(s, 0, 1);
      const v = viewOf(s);
      expect(v.si).toBe(si);
      expect(v.scene.split).toBe(split);
    }
  }
});

test("between mechanics, the boss stays on his last weapon until cactbot's --middle--", () => {
  for (const [title, n] of [
    ["Assault Evolved", 2],
    ["Void Stardust (Second Time)", 3],
  ] as const) {
    const s = newFightState("watch", fight(), { paused: true });
    const si = s.fight.segs.findIndex((g) => g.title === title);
    const g = s.fight.segs[si];
    const middle = cactbot("--middle--", n);
    // Each frame fills in one correct move that the seek jumped over.
    const at = (t: number) => {
      seek(s, t);
      for (let i = 0; i < 5; i++) tickFight(s, 0, 1);
      return viewOf(s);
    };
    const last = at(g.due[g.due.length - 1] + 2.9).boss;
    if (!last) throw new Error(`${title}: no boss`);
    expect(last.x !== 50 || last.y !== 50, `${title} ends away from the middle`).toBe(true);
    const between = at(middle - 0.1);
    expect(between.si, `${title}: no mechanic just before --middle--`).toBe(-1);
    expect(between.boss, `${title}: he stays put`).toEqual(last);
    expect(at(middle + 0.1).boss, `${title}: in the middle after --middle--`).toMatchObject({ x: 50, y: 50 });
  }
});

test("in the run, an incorrect click keeps what was wrong there, for the answer card", () => {
  const s = newFightState("run", fight(), { paused: true });
  const si = s.fight.segs.findIndex((g) => g.title === "Arena Split: Fire Breath");
  const g = s.fight.segs[si];
  for (let j = 0; j < g.due.length - 1; j++) answerFightStep(s, si, null);
  // The gap between the platforms, at the lineup, while it is asked.
  s.t = askFrom(g, g.due.length - 1) + 0.1;
  expect(answerFightStep(s, si, [50, 95])?.kind).toBe("bad");
  expect(s.results[si].at(-1)?.why).toBe("That is not your platform.");
});

test("the full fight: the Void Stardust that ends in a stack puts its marker on a healer", () => {
  for (const code of ["K7Q2", "2FFV", "AB12", "ZZ99"]) {
    const voids = buildFight("H1", code).segs.filter((g) => g.drills[0] === "m-void" || g.drills[0] === "m-void-2");
    const marked = voids.filter((g) => g.scene.headMark);
    expect(marked, code).toHaveLength(1);
    expect(["H1", "H2"]).toContain(marked[0].scene.headMark?.on.l);
  }
});

test("Arcadion Avalanche: the boss faces the platform he grabs only from his cast start", () => {
  const s = newFightState("watch", fight(), { paused: true });
  const g = s.fight.segs.find((x) => x.title === "Arcadion Avalanche");
  if (!g?.turn) throw new Error("Arcadion Avalanche has no turn");
  const at = castStart("ArcadionAvalancheBoss1", "Arcadion Avalanche (castbar)");
  expect(g.turn.at).toBe(at);
  seek(s, at - 0.5);
  expect(viewOf(s).boss?.f ?? null).toBeNull();
  seek(s, at + 0.1);
  expect(viewOf(s).boss?.f).toBe(g.turn.f);
});

test("Crown of Arcadia: its outer strips show from its cast start until the arena is whole", () => {
  const s = newFightState("watch", fight(), { paused: true });
  const from = castStart("CrownOfArcadia", "Crown of Arcadia", 3),
    whole = cactbot("Crown of Arcadia", 3);
  const strips = (t: number) => {
    seek(s, t);
    return (s.fight.join?.overlays ?? []).every((o) => viewOf(s).scene.overlays.includes(o));
  };
  // Only the strip on the platform that stayed: the thrown one is gone.
  expect(s.fight.join?.overlays).toEqual(CROWN_STRIPS.filter((_o, i) => ["west", "east"][i] !== s.fight.gone?.side));
  expect(s.fight.join?.overlays).toHaveLength(1);
  expect(strips(from - 0.1)).toBe(false);
  expect(strips(from + 0.1)).toBe(true);
  expect(strips(whole - 0.1)).toBe(true);
  expect(strips(whole + 0.1)).toBe(false);
});

test("Arcadion Avalanche: the platform he throws is gone from the slam until Crown of Arcadia", () => {
  const s = newFightState("watch", fight(), { paused: true });
  const gone = s.fight.gone;
  if (!gone) throw new Error("no platform goes");
  expect(gone.from).toBe(cactbot("Arcadion Avalanche"));
  const at = (t: number) => {
    seek(s, t);
    return viewOf(s).scene.gone;
  };
  expect(at(gone.from - 0.1)?.after ?? 99).not.toBe(-1);
  expect(at(gone.from + 0.1)).toEqual({ side: gone.side, after: -1 });
  expect(at(cactbot("Crown of Arcadia", 3) - 0.1)).toEqual({ side: gone.side, after: -1 });
  expect(at(cactbot("Crown of Arcadia", 3) + 0.1)).toBeUndefined();
});
