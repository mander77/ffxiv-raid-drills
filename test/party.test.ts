import { test, assert } from "vitest";
import { ROLES, slotName, partyOf, healerOf, markRole } from "../src/party";
import { cleanChoices, parseChoices, RANDOM } from "../src/data/fight";
import type { Slot } from "../src/types";

test("a slot's short name comes from its light party and its role", () => {
  const names = ROLES.flatMap(({role}) => ([1, 2] as const).map(lp => slotName({lp, role})));
  assert.deepEqual(names, ["MT", "OT", "H1", "H2", "M1", "M2", "R1", "R2"]);
});

test("the healer slots turn into their two parts and back", () => {
  for(const s of ["H1", "H2"] as Slot[]){
    const p = partyOf(s);
    assert.equal(p.role, "Healer");
    assert.equal(healerOf(p.lp), s);
    assert.equal(slotName(p), s);
  }
});

test("only the healer role has drills so far", () => {
  assert.deepEqual(ROLES.filter(r => r.ready).map(r => r.role), ["Healer"]);
});

test("each role's player mark has its colour", () => {
  assert.deepEqual(ROLES.map(r => markRole(r.role)), ["T", "H", "D", "D"]);
});

test("saved or linked picks keep only values their row lists", () => {
  assert.deepEqual(cleanChoices(null), RANDOM);
  assert.deepEqual(parseChoices("raw=axe,set1=axe-sword-scythe,ult=sideways,nope=1"), {...RANDOM, raw:"axe", set1:"axe-sword-scythe"});
});
