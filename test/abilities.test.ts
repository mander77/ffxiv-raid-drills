import { test, assert } from "vitest";
import { ABILITIES } from "../src/data/abilities";
import { MAPS } from "../src/data/drills";
import { buildFight } from "../src/data/fight";

test("the fight list runs in time order, and every row says what it does", () => {
  ABILITIES.forEach((a, i) => {
    if(i) assert.isAtLeast(a.t, ABILITIES[i - 1].t, a.name + " comes before " + ABILITIES[i - 1].name);
    assert.isAbove(a.note.length, 10, a.name + " has no note");
  });
});

test("every drill sits under an ability, and every drill an ability names exists", () => {
  const ids = new Set(MAPS.map(m => m.id)), listed = new Set(ABILITIES.flatMap(a => a.drills ?? []));
  for(const id of listed) assert.ok(ids.has(id), "the fight list names a drill that does not exist: " + id);
  for(const m of MAPS) assert.ok(listed.has(m.id), m.title + " is not in the fight list");
});

test("the rows the fight clock reaches use the fight clock's times", () => {
  const f = buildFight("H1");
  for(const a of ABILITIES.filter(x => x.t <= f.end))
    assert.ok(f.events.some(e => Math.abs(e.t - a.t) < 0.05), a.name + " at " + a.t + " is not a line on the fight timeline");
});
