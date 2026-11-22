// @vitest-environment happy-dom
// The fight line (FightLine): the one that moves with the fight clock on Pressure, beside the arena
// and sideways under it, and the one that stands still on Practice.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, assert, test, vi } from "vitest";
import { FightLine } from "../../src/components/fight-line/FightLine";
import { CATEGORIES, type Category, categoriesAt } from "../../src/data/abilities";
import { DRILLS } from "../../src/data/drills";
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

for (const [name, lineAxis, axis] of [
  ["the line beside the arena", "y", "clientY"],
  ["the sideways line under the arena", "x", "clientX"],
] as const) {
  const timeline = <FightLine axis={lineAxis} follow />;
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
    const box = showAt(<FightLine axis={lineAxis} follow controls={controls} />, 46);
    fireEvent.click(within(box).getByRole("button", { name: "Go to Assault Evolved 1" }));
    // Assault Evolved 1 goes off at 50.4.
    assert.closeTo(controls.goTo.mock.calls[0][0], 50.4, 0.05);
  });

  test(`${name} in the player: a drag holds the clock, moves it on, and lets go`, () => {
    const controls = spyControls();
    const line = showAt(<FightLine axis={lineAxis} follow controls={controls} />, 46).firstElementChild as HTMLElement;
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

test("the moving line with types shows only the casts of those categories", () => {
  // The categories of Assault Evolved 1, which goes off at 50.4.
  const cats = categoriesAt(50.4);
  assert.isNotEmpty(cats);
  const other = (Object.keys(CATEGORIES) as Category[]).find((c) => !cats.includes(c)) as Category;
  const names = (types: Category[]) =>
    within(showAt(<FightLine axis="y" follow types={types} />, 46))
      .queryAllByRole("listitem")
      .map((li) => li.textContent ?? "");
  assert.isTrue(names([cats[0]]).some((n) => n.includes("Assault Evolved 1")));
  cleanup();
  assert.isFalse(names([other]).some((n) => n.includes("Assault Evolved 1")));
});

/** The mechanics in Practice order. */
const IN_ORDER = [...DRILLS].sort((a, b) => a.order - b.order);

function showStill(line: React.ReactNode): HTMLElement {
  render(<MemoryRouter>{line}</MemoryRouter>);
  return screen.getByRole("navigation");
}

for (const axis of ["y", "x"] as const) {
  test(`the still line (${axis}) with "practice" links every mechanic, in Practice order`, () => {
    const nav = showStill(<FightLine axis={axis} types={["practice"]} label="Mechanics" current={IN_ORDER[3].id} />);
    assert.equal(nav.getAttribute("aria-label"), "Mechanics");
    const links = within(nav).getAllByRole("link");
    assert.deepEqual(
      links.map((a) => a.getAttribute("href")),
      IN_ORDER.map((d) => `/practice/${d.id}`),
    );
    for (const d of IN_ORDER) assert.ok(within(nav).getByText(d.title));
    // The mechanic on screen is marked, and only that one.
    assert.deepEqual(
      links.filter((a) => a.getAttribute("aria-current") === "step").map((a) => a.getAttribute("href")),
      [`/practice/${IN_ORDER[3].id}`],
    );
    // One heading per phase.
    assert.equal(within(nav).getAllByRole("heading").length, 4);
  });
}

test("the still line with no types shows the abilities too, as rows that are not links", () => {
  const nav = showStill(<FightLine axis="y" />);
  assert.isNotEmpty(within(nav).getAllByText("Crown of Arcadia"));
  assert.equal(within(nav).getAllByRole("link").length, IN_ORDER.length);
});
