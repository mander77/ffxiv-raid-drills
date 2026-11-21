// @vitest-environment happy-dom
// The casts coming up: the line beside the arena (CastList) and the sideways one under it (CastStrip).
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { CastList } from "../../src/components/pressure/CastList";
import { CastStrip } from "../../src/components/pressure/CastStrip";
import { buildFight } from "../../src/data/fight";
import { FightFrameContext, type FrameFn } from "../../src/hooks/useFightFrame";
import { newFightState } from "../../src/lib/fight";

afterEach(cleanup);

/** Draw a timeline, then run the fight clock at `t` seconds: the first frame puts the casts in
    the list, the second moves them and writes their seconds. */
function showAt(timeline: React.ReactNode, t: number): HTMLElement {
  const frames = new Set<FrameFn>();
  render(<FightFrameContext value={frames}>{timeline}</FightFrameContext>);
  const s = newFightState("watch", buildFight("H1", "K7Q2"));
  s.t = t;
  for (let frame = 0; frame < 2; frame++) {
    act(() => {
      for (const f of frames) f(s);
    });
  }
  return screen.getByRole("region", { name: "Casts coming up" });
}

for (const [name, timeline] of [
  ["the line beside the arena", <CastList key="list" />],
  ["the sideways line under the arena", <CastStrip key="strip" />],
] as const) {
  test(`${name} lists the casts of the next 30 seconds, with their seconds to go`, () => {
    const list = within(showAt(timeline, 46)).getByRole("list");
    const names = within(list)
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    // Assault Evolved goes off at 50.4: 5 seconds to go.
    assert.include(names, "5Assault Evolved 1");
    for (const n of names) assert.notInclude(n, "Void Stardust into");
  });

  test(`${name} has a key to its squares: a cast and a hit`, () => {
    const box = showAt(timeline, 46);
    assert.ok(within(box).getByText("Cast"));
    assert.ok(within(box).getByText("Hit"));
  });
}
