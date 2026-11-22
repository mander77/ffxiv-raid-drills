import { assert, test } from "vitest";
import { changes, DRILLS } from "../src/data/drills";
import { buildFight } from "../src/data/fight";
import { isCode, newCode, withSeed } from "../src/util";

const CODES = Array.from({ length: 30 }, () => newCode());

test("new codes are 4 easy-to-read characters", () => {
  for (const c of CODES) {
    assert.ok(isCode(c), c);
    assert.notMatch(c, /[01OI]/, c);
  }
  assert.ok(isCode("a7k2"), "lower case is fine");
  assert.notOk(isCode("A0K2"), "no zero");
  assert.notOk(isCode("A7K"), "4 characters");
});

test("a pattern code always rebuilds the same drill pattern", () => {
  for (const m of DRILLS.filter(changes))
    for (const c of CODES.slice(0, 10)) {
      const once = JSON.stringify(withSeed(c, () => m.build("H1", null)));
      assert.equal(JSON.stringify(withSeed(c, () => m.build("H1", null))), once, `${m.id} ${c}`);
    }
});

test("different codes give different patterns", () => {
  const assault = DRILLS.find((m) => m.id === "m-assault");
  if (!assault) throw new Error("missing drill m-assault");
  const patterns = new Set(CODES.map((c) => JSON.stringify(withSeed(c, () => assault.build("H1", null)))));
  assert.isAbove(patterns.size, 5, `30 codes, only ${patterns.size} patterns`);
});

test("a fight code always rebuilds the same fight", () => {
  for (const c of CODES.slice(0, 10)) {
    const once = buildFight("H2", c);
    assert.equal(once.code, c);
    assert.equal(JSON.stringify(buildFight("H2", c)), JSON.stringify(once), c);
  }
});
