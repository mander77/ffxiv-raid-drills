import { assert, test } from "vitest";
import { DRILLS } from "../src/data/fights/m11s/drills";
import { LEARN_PICTURES } from "../src/data/fights/m11s/pictures";
import { LEARN_CARDS } from "../src/data/fights/m11s/questions";
import { learnCard, practiceDrill, REFERENCE, referenceByPhase, slotAnswer, timelineCard } from "../src/data/fights/m11s/reference";
import { TIMELINE } from "../src/data/fights/m11s/timeline";

/** Seconds from a time such as "4:52" (the first time in "0:50 to 1:45"). */
function secs(t: string): number {
  const [m, s] = t.split(" ")[0].split(":").map(Number);
  return m * 60 + s;
}

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

test("each drill trains at least one mechanic, and every link goes to a real drill or card", () => {
  const used = new Set(REFERENCE.flatMap((e) => e.drills));
  assert.deepEqual([...used].sort(), DRILLS.map((m) => m.id).sort());
  for (const e of REFERENCE) {
    for (const d of e.drills) assert.ok(practiceDrill(d));
    if (e.timeline) assert.ok(timelineCard(e.timeline));
  }
});

test("a mechanic's Timeline card answers with the timeline row the mechanic is in", () => {
  for (const e of REFERENCE) {
    if (!e.timeline) continue;
    // Card n-i asks what comes after row i, so its answer is row i + 1. That row starts at or
    // before the mechanic, and the row after it starts later.
    const i = Number(e.timeline.replace("n-", ""));
    const start = secs(learnCard(e.picture).time);
    assert.isAtMost(secs(TIMELINE[i + 1].t), start, e.name);
    assert.isAbove(secs(TIMELINE[i + 2].t), start, e.name);
  }
});

test("only the answers that differ between H1 and H2 are your own", () => {
  assert.match(slotAnswer("k-sword", "H1") ?? "", /on his left/);
  assert.match(slotAnswer("k-sword", "H2") ?? "", /on his right/);
  assert.equal(slotAnswer("k-axe", "H1"), undefined);
});
