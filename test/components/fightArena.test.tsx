// @vitest-environment happy-dom
// The arena of the full fight (FightArena) on Pressure: the run and the player.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { FightArena } from "../../src/components/pressure/FightArena";
import { TOWER_R } from "../../src/data/fights/m11s/attacks";
import { type FightMode, newFightState, seek, tickFight, viewOf } from "../../src/lib/fight";
import { newCode } from "../../src/util";
import { buildFight } from "../m11s";

afterEach(cleanup);

/** The full fight a moment into its first mechanic. */
function firstMechanic(mode: FightMode) {
  const s = newFightState(mode, buildFight("H1", "K7Q2"), { paused: true });
  seek(s, s.fight.segs[0].from + 0.1);
  return viewOf(s);
}

test("in the run, the arena's name says that a click picks where you stand", () => {
  render(<FightArena view={firstMechanic("run")} slot="H1" correctLabel pickSpot hit={null} replay={0} onPointClick={() => {}} />);
  assert.ok(screen.getByRole("img", { name: "Arena map. Click where you stand." }));
});

test("on the player, a click pauses, so the arena's name does not ask for one", () => {
  render(
    <FightArena
      view={firstMechanic("watch")}
      slot="H1"
      correctLabel={false}
      pickSpot={false}
      hit={null}
      replay={0}
      onPointClick={() => {}}
    />,
  );
  assert.ok(screen.getByRole("img", { name: "Arena map." }));
});

test("Massive Meteor: the stack marker is on its player until the stack, on your marker when it is yours", () => {
  const seen = new Set<boolean>();
  for (let i = 0; i < 200 && seen.size < 2; i++) {
    const s = newFightState("watch", buildFight("H1", newCode()), { paused: true });
    const g = s.fight.segs.find((x) => x.title === "Massive Meteor");
    const head = g?.scene.headMark;
    if (!g || !head) throw new Error("Massive Meteor has no stack marker");
    seek(s, g.from + 0.1);
    const { container, unmount } = render(
      <FightArena view={viewOf(s)} slot="H1" correctLabel={false} pickSpot={false} hit={null} replay={0} onPointClick={() => {}} />,
    );
    const marks = [...container.querySelectorAll(".stackmk")];
    assert.equal(marks.length, 1, "one stack marker");
    assert.equal(Boolean(marks[0].closest(".runner")), head.you, head.you ? "on your marker" : "on the other player");
    if (!head.you)
      assert.ok(
        [...container.querySelectorAll(".mk text")].some((t) => t.textContent === head.on.l),
        `${head.on.l} is drawn`,
      );
    seen.add(head.you);
    unmount();
  }
  assert.equal(seen.size, 2, "the marker goes on you in some fights and on someone else in others");
});

test("a Heartbreak Kick hit flashes only its tower, not the whole floor", () => {
  const fight = buildFight("H1", "K7Q2");
  const kick = fight.hits.find((h) => h.name === "Heartbreak Kick 1");
  assert.ok(kick);
  const { container } = render(
    <FightArena
      view={firstMechanic("run")}
      slot="H1"
      correctLabel
      pickSpot
      hit={{ n: 1, hit: kick, at: [50, 50] }}
      replay={0}
      onPointClick={() => {}}
    />,
  );
  const flash = container.querySelector(".hitfx");
  assert.equal(flash?.tagName.toLowerCase(), "circle");
  assert.deepEqual([flash?.getAttribute("cx"), flash?.getAttribute("cy"), flash?.getAttribute("r")], ["50", "50", String(TOWER_R)]);
});

test("Void Stardust: a puddle-sized bait circle is on your marker until the first puddle drops", () => {
  const s = newFightState("watch", buildFight("H1", "K7Q2"), { paused: true });
  const voids = s.fight.segs.filter((g) => g.scene.steps.some((st) => st.bait != null));
  assert.equal(voids.length, 2, "both Void Stardusts");
  for (const g of voids) {
    const i = g.scene.steps.findIndex((st) => st.bait != null);
    const baitAt = (t: number) => {
      seek(s, t);
      tickFight(s, 0, 1); // gives the answers due by then
      const { container, unmount } = render(
        <FightArena view={viewOf(s)} slot="H1" correctLabel={false} pickSpot={false} hit={null} replay={0} onPointClick={() => {}} />,
      );
      const circles = [...container.querySelectorAll(".runner .bait")];
      unmount();
      return circles;
    };
    const before = baitAt(g.due[i] - 0.1);
    assert.equal(before.length, 1, `${g.title}: the circle is on you before the first puddle`);
    assert.equal(Number(before[0].getAttribute("r")), g.scene.steps[i].bait);
    assert.equal(baitAt(g.due[i] + 0.1).length, 0, `${g.title}: it goes when the first puddle drops`);
  }
});
