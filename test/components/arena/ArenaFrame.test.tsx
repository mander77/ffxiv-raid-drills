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
  // 800 - 200 - 16 (the margin) = 584 tall.
  assert.equal(frameAt(200, 800).style.maxWidth, `${584 * ARENA_ASPECT}px`);
});

test("room kept for what comes under it makes the arena smaller", () => {
  assert.equal(frameAt(200, 800, 48).style.maxWidth, `${536 * ARENA_ASPECT}px`);
});

test("it never gets larger than 720 or smaller than 360 pixels", () => {
  assert.equal(frameAt(0, 2000).style.maxWidth, "720px");
  cleanup();
  assert.equal(frameAt(600, 700).style.maxWidth, "360px");
});
