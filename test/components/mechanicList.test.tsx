// @vitest-environment happy-dom
// Practice's list of mechanics (MechanicList): down the box beside the arena, and sideways under it.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, assert, test, vi } from "vitest";
import { MechanicList } from "../../src/components/practice/MechanicList";
import { DRILLS } from "../../src/data/drills";

afterEach(cleanup);

/** The mechanics in Practice order. */
const IN_ORDER = [...DRILLS].sort((a, b) => a.order - b.order);

/** Draw the list along `axis`, with the fourth mechanic on screen. */
function showList(axis: "x" | "y", onPick = vi.fn()): HTMLElement {
  render(
    <MemoryRouter>
      <MechanicList axis={axis} current={IN_ORDER[3].id} onPick={onPick} />
    </MemoryRouter>,
  );
  return screen.getByRole("navigation", { name: "Mechanics" });
}

for (const [axis, along] of [
  ["y", "clientY"],
  ["x", "clientX"],
] as const) {
  test(`the list (${axis}) links every mechanic, in Practice order, and marks the one on screen`, () => {
    const nav = showList(axis);
    const links = within(nav).getAllByRole("link");
    assert.deepEqual(
      links.map((a) => a.getAttribute("href")),
      IN_ORDER.map((d) => `/practice/${d.id}`),
    );
    for (const d of IN_ORDER) assert.ok(within(nav).getByText(d.title));
    // Each mechanic's square names what you do in it, for a pointer that rests on it.
    assert.equal(
      within(nav)
        .getByRole("link", { name: /Raw Steel Trophy: axe$/ })
        .querySelector("[title]")
        ?.getAttribute("title"),
      "Spread",
    );
    assert.deepEqual(
      links.filter((a) => a.getAttribute("aria-current") === "step").map((a) => a.getAttribute("href")),
      [`/practice/${IN_ORDER[3].id}`],
    );
    // One heading per phase.
    assert.equal(within(nav).getAllByRole("heading").length, 4);
  });

  test(`the list (${axis}): a click on a mechanic opens it`, () => {
    const onPick = vi.fn();
    const nav = showList(axis, onPick);
    fireEvent.click(within(nav).getByRole("link", { name: new RegExp(`${IN_ORDER[5].title}$`) }));
    assert.deepEqual(onPick.mock.calls, [[IN_ORDER[5].id]]);
  });

  test(`the list (${axis}): a mouse drag scrolls it and opens nothing; a finger is left to the browser`, () => {
    const onPick = vi.fn();
    const nav = showList(axis, onPick);
    const scrolled = vi.spyOn(nav, "scrollTo");
    fireEvent.pointerDown(nav, { pointerId: 1, button: 0, pointerType: "mouse", [along]: 300 });
    fireEvent.pointerMove(nav, { pointerId: 1, pointerType: "mouse", [along]: 200 });
    fireEvent.pointerUp(nav, { pointerId: 1, pointerType: "mouse", [along]: 200 });
    // Dragging up (or left) by 100 pixels scrolls the list on by 100.
    assert.deepEqual<unknown[] | undefined>(scrolled.mock.calls.at(-1), [axis === "y" ? { top: 100 } : { left: 100 }]);
    scrolled.mockClear();
    fireEvent.pointerDown(nav, { pointerId: 2, button: 0, pointerType: "touch", [along]: 300 });
    fireEvent.pointerMove(nav, { pointerId: 2, pointerType: "touch", [along]: 200 });
    assert.equal(scrolled.mock.calls.length, 0);
    assert.equal(onPick.mock.calls.length, 0);
  });
}
