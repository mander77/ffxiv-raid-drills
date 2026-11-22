// @vitest-environment happy-dom
// The casts coming up: the line beside the arena (CastList) and the sideways one under it (CastStrip).
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, assert, test, vi } from "vitest";
import { CastList } from "../../src/components/pressure/CastList";
import { CastStrip } from "../../src/components/pressure/CastStrip";
import { buildFight } from "../../src/data/fight";
import type { CastControls } from "../../src/hooks/useCastTimeline";
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

/** Controls that only note what they were asked. */
function spyControls() {
  return { goTo: vi.fn(), hold: vi.fn(), scrub: vi.fn() } satisfies CastControls;
}

for (const [name, Timeline, axis] of [
  ["the line beside the arena", CastList, "clientY"],
  ["the sideways line under the arena", CastStrip, "clientX"],
] as const) {
  const timeline = <Timeline />;
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

  test(`${name} in the run only shows the casts: none is a button`, () => {
    const box = showAt(timeline, 46);
    assert.isNull(within(box).queryByRole("button"));
  });

  test(`${name} in the player: a click on a cast goes to it`, () => {
    const controls = spyControls();
    const box = showAt(<Timeline controls={controls} />, 46);
    fireEvent.click(within(box).getByRole("button", { name: "Go to Assault Evolved 1" }));
    // Assault Evolved 1 goes off at 50.4.
    assert.closeTo(controls.goTo.mock.calls[0][0], 50.4, 0.05);
  });

  test(`${name} in the player: a drag holds the clock, moves it on, and lets go`, () => {
    const controls = spyControls();
    const line = showAt(<Timeline controls={controls} />, 46).firstElementChild as HTMLElement;
    fireEvent.pointerDown(line, { pointerId: 1, button: 0, [axis]: 100 });
    // A small move is still a click.
    fireEvent.pointerMove(line, { pointerId: 1, [axis]: 98 });
    assert.equal(controls.hold.mock.calls.length, 0);
    // Dragging up (or left) moves the clock on, the way the casts go.
    fireEvent.pointerMove(line, { pointerId: 1, [axis]: 80 });
    assert.deepEqual(controls.hold.mock.calls, [[true]]);
    assert.isAbove(controls.scrub.mock.calls[0][0], 46);
    fireEvent.pointerUp(line, { pointerId: 1, [axis]: 80 });
    assert.deepEqual(controls.hold.mock.calls, [[true], [false]]);
  });
}
