import { assert, test } from "vitest";
import { cleanChoices, parseChoices, RANDOM } from "../src/data/fight";
import { isSlot, markRole, partyOf, ROLES, slotName } from "../src/party";
import type { SlotName } from "../src/types";

test("a slot's short name comes from its light party and its role", () => {
  const names = ROLES.flatMap(({ role }) => ([1, 2] as const).map((lp) => slotName({ lp, role })));
  assert.deepEqual(names, ["MT", "OT", "H1", "H2", "M1", "M2", "R1", "R2"]);
});

test("every slot turns into its two parts and back", () => {
  for (const s of ["MT", "OT", "H1", "H2", "M1", "M2", "R1", "R2"] as SlotName[]) assert.equal(slotName(partyOf(s)), s);
  assert.deepEqual(partyOf("OT"), { lp: 2, role: "Tank" });
  assert.deepEqual(partyOf("H1"), { lp: 1, role: "Healer" });
});

test("only the healer role has drills so far, so only its slots count as slots", () => {
  assert.deepEqual(
    ROLES.filter((r) => r.ready).map((r) => r.role),
    ["Healer"],
  );
  assert.deepEqual(["MT", "OT", "H1", "H2", "M1", "M2", "R1", "R2"].filter(isSlot), ["H1", "H2"]);
  for (const v of ["h1", "toString", "", 1, null, undefined, {}]) assert.isFalse(isSlot(v));
});

test("each role's player mark has its colour", () => {
  assert.deepEqual(
    ROLES.map((r) => markRole(r.role)),
    ["T", "H", "D", "D"],
  );
});

test("saved or linked picks keep only values their row lists", () => {
  assert.deepEqual(cleanChoices(null), RANDOM);
  assert.deepEqual(parseChoices("raw=axe,set1=axe-sword-scythe,ult=sideways,nope=1"), { ...RANDOM, raw: "axe", set1: "axe-sword-scythe" });
});
