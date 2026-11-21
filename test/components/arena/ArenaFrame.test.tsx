// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test, vi } from "vitest";
import { ARENA_ASPECT } from "../../../src/components/arena/Arena";
import { ArenaFrame } from "../../../src/components/arena/ArenaFrame";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** A frame that starts `top` pixels down a screen `screen` pixels tall. */
function frameAt(top: number, screenHeight: number, below = 0): HTMLElement {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, top, 100, 100));
  Object.defineProperty(window, "innerHeight", { configurable: true, value: screenHeight });
  render(
    <ArenaFrame below={below}>
      <p>arena</p>
    </ArenaFrame>,
  );
  return screen.getByText("arena").parentElement as HTMLElement;
}

test("the arena is as tall as the room down to the bottom of the screen", () => {
  // 800 - 200 - 24 (the margin) = 576 tall.
  assert.equal(frameAt(200, 800).style.maxWidth, `${576 * ARENA_ASPECT}px`);
});

test("room kept for what comes under it makes the arena smaller", () => {
  assert.equal(frameAt(200, 800, 48).style.maxWidth, `${528 * ARENA_ASPECT}px`);
});

test("it never gets larger than 720 or smaller than 360 pixels", () => {
  assert.equal(frameAt(0, 2000).style.maxWidth, "720px");
  cleanup();
  assert.equal(frameAt(600, 700).style.maxWidth, "360px");
});

test("a column beside the arena sits against the floor's right edge, as tall as the floor", () => {
  render(
    <ArenaFrame beside={<p>controls</p>}>
      <p>arena</p>
    </ArenaFrame>,
  );
  const column = screen.getByText("controls").parentElement as HTMLElement;
  // The floor ends at 104 of the picture's 108 units across, and runs from 6 to 106 of 110 down.
  assert.equal(column.style.left, `calc(${(104 / 108) * 100}% + 0.5rem)`);
  assert.equal(column.style.top, `${(6 / 110) * 100}%`);
  assert.equal(column.style.bottom, `${(4 / 110) * 100}%`);
});

test("a column before the arena sits against the floor's left edge", () => {
  render(
    <ArenaFrame before={<p>mechanic</p>}>
      <p>arena</p>
    </ArenaFrame>,
  );
  const column = screen.getByText("mechanic").parentElement as HTMLElement;
  // The floor starts at 4 of the picture's 108 units across: 104 units from the frame's right.
  assert.equal(column.style.right, `calc(${(104 / 108) * 100}% + 0.5rem)`);
  assert.equal(column.style.top, `${(6 / 110) * 100}%`);
});
