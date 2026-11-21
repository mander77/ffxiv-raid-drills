import { assert, test } from "vitest";
import { QUICK_SIZE, quickRound, timerAt, weight, weighted } from "../../src/lib/pressure";

test("a card you never saw or often got incorrect comes up more, and none drops out", () => {
  assert.equal(weight(undefined), 3);
  assert.isAbove(weight({ seen: 3, correct: 0 }), weight({ seen: 3, correct: 3 }));
  assert.equal(weight({ seen: 10, correct: 10 }), 0.3);
});

test("the weighted order keeps every card once, heavy ones first more often", () => {
  const list = [{ id: "a" }, { id: "b" }];
  const scores = { a: { seen: 9, correct: 9 } };
  let bFirst = 0;
  for (let i = 0; i < 200; i++) {
    const out = weighted(list, scores);
    assert.sameMembers(
      out.map((x) => x.id),
      ["a", "b"],
    );
    if (out[0].id === "b") bFirst++;
  }
  assert.isAbove(bFirst, 150, "b, never seen, weighs 3 against a's 0.3");
});

test("a quick round has 12 different cards", () => {
  const cards = quickRound({});
  assert.equal(cards.length, QUICK_SIZE);
  assert.equal(new Set(cards.map((c) => c.id)).size, QUICK_SIZE);
});

test("the timer fills while you read, then drains while you decide, and is low in its last third", () => {
  const t = { readMs: 2000, decideMs: 6000 };
  assert.deepEqual(timerAt(t, 1000), { reading: true, fill: 0.5, low: false });
  assert.deepEqual(timerAt(t, 2000), { reading: false, fill: 1, low: false });
  assert.isTrue(timerAt(t, 7000).low);
  assert.equal(timerAt(t, 9000).fill, 0);
});
