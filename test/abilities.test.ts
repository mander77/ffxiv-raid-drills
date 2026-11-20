import { test, assert } from "vitest";
import { ABILITIES, ENRAGE, FIGHT_END } from "../src/data/abilities";
import { MAPS } from "../src/data/drills";
import { buildFight, buildHits } from "../src/data/fight";

test("the ability list runs in time order, and every row says what it does", () => {
  ABILITIES.forEach((a, i) => {
    if(i) assert.isAtLeast(a.t, ABILITIES[i - 1].t, a.name + " comes before " + ABILITIES[i - 1].name);
    assert.isAbove(a.note.length, 10, a.name + " has no note");
  });
});

test("every drill a stretch of the full fight names exists", () => {
  const ids = new Set(MAPS.map(m => m.id));
  for(const g of buildFight("H1").segs) for(const id of g.drills) assert.ok(ids.has(id), g.title + " names a drill that does not exist: " + id);
});

test("every row is on the fight clock, at the fight clock's time", () => {
  const f = buildFight("H1");
  for(const a of ABILITIES){
    assert.isBelow(a.t, f.end, a.name + " is after the end of the fight clock");
    assert.ok(f.events.some(e => Math.abs(e.t - a.t) < 0.05), a.name + " at " + a.t + " is not a line on the fight timeline");
  }
});

test("the enrage is the last line of the fight, and the clock ends just after it", () => {
  const f = buildFight("H1"), last = f.events[f.events.length - 1];
  assert.equal(last.t, ENRAGE, "the last timeline line is the enrage");
  assert.isAbove(f.end, ENRAGE, "the clock ends after the enrage");
  assert.equal(f.end, FIGHT_END);
});

test("the hit rules in the ability list make the fight's hits", () => {
  const hits = buildHits(buildFight("H1"));
  const dance = hits.filter(h => /^Dance of Domination \d$/.test(h.name));
  assert.deepEqual(dance.map(h => h.name), [1, 2, 3, 4, 5, 6, 7].map(n => "Dance of Domination " + n));
  assert.ok(dance.every(h => h.kind === "raid"));
  const kicks = hits.filter(h => h.name.startsWith("Heartbreak Kick "));
  assert.equal(kicks.length, 5 + 6 + 7, "one hit per kick line: 5, 6, then 7");
  assert.ok(kicks.every(h => h.kind === "shared"));
  assert.equal(hits.find(h => h.name === "Massive Meteor")?.kind, "shared");
  assert.equal(hits[hits.length - 1].kind, "enrage");
  hits.forEach((h, i) => { if(i) assert.isAtLeast(h.t, hits[i - 1].t, "hits run in time order"); });
});
