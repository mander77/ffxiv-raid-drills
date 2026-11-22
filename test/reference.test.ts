import { assert, test } from "vitest";
import { LEARN_PICTURES } from "../src/data/pictures";
import { LEARN_CARDS } from "../src/data/questions";
import { learnCard, REFERENCE, referenceByPhase } from "../src/data/reference";

test("each Learn card is in exactly one mechanic of the reference", () => {
  const ids = REFERENCE.flatMap((e) => e.cards);
  assert.equal(ids.length, new Set(ids).size, "no card twice");
  assert.deepEqual([...ids].sort(), LEARN_CARDS.map((c) => c.id).sort());
});

test("each mechanic shows a picture of one of its own cards", () => {
  for (const e of REFERENCE) {
    assert.include(e.cards, e.picture, e.name);
    assert.ok(LEARN_PICTURES[e.picture], `${e.name} has a picture`);
  }
});

test("the mechanics are in fight order", () => {
  const orders = REFERENCE.map((e) => learnCard(e.picture).order);
  assert.deepEqual(
    orders,
    [...orders].sort((a, b) => a - b),
  );
});

test("the mechanics come in four phases, in order", () => {
  assert.deepEqual(
    referenceByPhase().map((p) => p.phase.split(":")[0]),
    ["Phase 1", "Phase 2", "Phase 3", "Phase 4"],
  );
});

test("an id that is not a Learn card throws", () => {
  assert.throws(() => learnCard("k-nothing"));
});
