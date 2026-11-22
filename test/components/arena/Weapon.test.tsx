// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { Weapon } from "../../../src/components/arena/Weapon";
import type { Overlay } from "../../../src/types";

afterEach(cleanup);

/** Draw one weapon in an svg and return its group. */
function draw(overlay: Extract<Overlay, { t: "axe" | "sword" | "scythe" }>): SVGGElement {
  const { container } = render(
    <svg>
      <title>weapon</title>
      <Weapon overlay={overlay} />
    </svg>,
  );
  const g = container.querySelector<SVGGElement>("g.wpn");
  if (!g) throw new Error("no weapon drawn");
  return g;
}

/** The six numbers of the group's matrix(a b c d e f). */
const matrixOf = (g: Element): number[] =>
  (g.getAttribute("transform") ?? "")
    .replace(/^matrix\(|\)$/g, "")
    .split(" ")
    .map(Number);

test("a scythe facing you stands upright on its point, as long as the green safe ring is wide", () => {
  const g = draw({ t: "scythe", x: 50, y: 21, ux: 1, uy: 0, dx: 0, dy: -1 });
  assert.include(g.getAttribute("class"), "scythe");
  assert.isNotNull(g.querySelector(".body"));
  const [a, b, c, d, e, f] = matrixOf(g);
  // Half its length in the drawing is 9.2; the green ring is drawn 1.6 inside 12.5.
  assert.closeTo(a * 9.2, 12.5 - 1.6, 0.05);
  assert.deepEqual([b, c, d, e, f], [0, 0, 0.8, 50, 21]);
});

test("a turned weapon gets narrower and tilts a little, but never taller", () => {
  // Its line runs north to south: it is turned edge-on, so it is drawn at the least width.
  const [a, b, c, d] = matrixOf(draw({ t: "axe", x: 79, y: 50, ux: 0, uy: 1 }));
  assert.equal(a, 0.32);
  assert.isAbove(b, 0);
  assert.isBelow(b, 0.5);
  assert.deepEqual([c, d], [0, 0.8]);
});

test("without a turn, the sword faces the arena center", () => {
  // South of the center, so it faces north: full width, no tilt.
  const [a, b] = matrixOf(draw({ t: "sword", x: 50, y: 79 }));
  assert.equal(Math.abs(a), 0.8);
  assert.equal(b, 0);
});

test("a held weapon is drawn smaller, beside the point", () => {
  const [a, , , d, e] = matrixOf(draw({ t: "axe", x: 63, y: 50, ux: 1, uy: 0, held: true }));
  assert.isBelow(a, 1);
  assert.isBelow(d, 1);
  assert.isAbove(e, 63);
});
