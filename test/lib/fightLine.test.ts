// The rows of the fight line: which rows a line shows, and the line that stands still.
import { assert, test } from "vitest";
import { DRILLS } from "../../src/data/drills";
import { FIGHT_ROWS, shows } from "../../src/lib/fightLine";

test("with no types a line shows every row", () => {
  assert.isTrue(shows({ cats: [] }));
  assert.isTrue(shows({ cats: ["raid"], drill: "m-assault" }));
});

test("types keep the rows of those categories, and 'practice' keeps the Practice mechanics", () => {
  assert.isTrue(shows({ cats: ["raid", "tank"] }, ["tank"]));
  assert.isFalse(shows({ cats: ["raid"] }, ["tank"]));
  assert.isTrue(shows({ cats: [], drill: "m-assault" }, ["practice"]));
  assert.isFalse(shows({ cats: ["raid"] }, ["practice"]));
});

test("the still line has every Practice mechanic once, at its first time, in fight order", () => {
  const drills = FIGHT_ROWS.filter((r) => r.drill);
  assert.sameMembers(
    drills.map((r) => r.drill),
    DRILLS.map((d) => d.id),
  );
  // Raw Steel Trophy is "0:18 or 2:36": it sits at 0:18.
  assert.equal(drills.find((r) => r.drill === "m-raw-axe")?.t, 18);
  for (let i = 1; i < FIGHT_ROWS.length; i++) assert.isAtLeast(FIGHT_ROWS[i].t, FIGHT_ROWS[i - 1].t);
});
