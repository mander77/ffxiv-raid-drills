// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { TurningBoss } from "../../../src/components/arena/TurningBoss";
import type { Boss } from "../../../src/types";

afterEach(cleanup);

/** The boss in a picture of his own. */
const picture = (boss: Boss) => (
  <svg>
    <title>The boss</title>
    <TurningBoss boss={boss} />
  </svg>
);

/** The ring that turns, and the angle its style gives it. */
const ringOf = (container: HTMLElement) => {
  const ring = container.querySelector<SVGGElement>(".turn");
  if (!ring) throw new Error("no ring");
  return { ring, angle: Number.parseFloat(ring.style.transform.replace("rotate(", "")) };
};

/** Draws the boss at each spot in turn. Where the same ring element stays on the page, its CSS
    transition runs from the old angle to the new one: returns how far each of those turns goes. */
const turnsThrough = (bosses: Boss[]): number[] => {
  const { container, rerender } = render(picture(bosses[0]));
  let was = ringOf(container);
  const turns: number[] = [];
  for (const boss of bosses.slice(1)) {
    rerender(picture(boss));
    const now = ringOf(container);
    if (now.ring === was.ring) turns.push(Math.abs(now.angle - was.angle));
    was = now;
  }
  return turns;
};

test("a turn on the same spot goes the short way round", () => {
  const turns = turnsThrough([
    { x: 50, y: 50, f: 270 },
    { x: 50, y: 50, f: 45 },
    { x: 50, y: 50, f: 200 },
  ]);
  expect(turns).toEqual([135, 155]);
});

test("a jump after turns past a full circle does not spin the ring", () => {
  // The first Assault Evolved of pattern R6GA: he turns from 270 to 45 (the ring is at 405), then
  // jumps to the next weapon, still facing 45.
  const turns = turnsThrough([
    { x: 21, y: 50, f: 270 },
    { x: 21, y: 50, f: 45 },
    { x: 50, y: 21, f: 45 },
    { x: 50, y: 21, f: 157.5 },
  ]);
  for (const turn of turns) expect(turn).toBeLessThanOrEqual(180);
});

test("his first turn after a jump starts from north", async () => {
  const { container, rerender } = render(picture({ x: 50, y: 50, f: 90 }));
  rerender(picture({ x: 30, y: 70, f: null }));
  expect(container.querySelector(".turn")).toBeNull();
  rerender(picture({ x: 30, y: 70, f: 300 }));
  expect(ringOf(container).angle).toBe(0);
  await vi.waitFor(() => expect(ringOf(container).angle).toBe(-60));
});
