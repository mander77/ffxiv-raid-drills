// @vitest-environment happy-dom
// The arena of the full fight (FightArena) on Pressure: the run and the player.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { FightArena } from "../../src/components/pressure/FightArena";
import { buildFight } from "../../src/data/fights/m11s/fight";
import { type FightMode, newFightState, seek, viewOf } from "../../src/lib/fight";

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
