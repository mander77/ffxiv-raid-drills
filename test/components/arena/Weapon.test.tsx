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

test("a weapon on the floor stands in a cut along its line, upright on the screen", () => {
  const g = draw({ t: "scythe", x: 50, y: 21, ux: 1, uy: 0, dx: 0, dy: -1 });
  assert.include(g.getAttribute("class"), "scythe");
  assert.isNotNull(g.querySelector(".cut"));
  // x along the floor line (east), y straight down the screen, standing on its point.
  assert.deepEqual(matrixOf(g), [1, 0, 0, 1, 50, 21]);
});

test("a weapon whose line runs north to south is widened, so it never shows as a thin line", () => {
  const [a, b, c, d] = matrixOf(draw({ t: "axe", x: 79, y: 50, ux: 0, uy: 1 }));
  assert.isAtLeast(a, 0.45);
  assert.equal(b, 1);
  assert.deepEqual([c, d], [0, 1]);
});

test("without a turn, the sword lies across the line to the arena center", () => {
  // South of the center, so its line runs east to west.
  const [a, b] = matrixOf(draw({ t: "sword", x: 50, y: 79 }));
  assert.equal(Math.abs(a), 1);
  assert.equal(b, 0);
});

test("a held weapon has no cut in the floor", () => {
  const g = draw({ t: "axe", x: 63, y: 50, ux: 1, uy: 0, held: true });
  assert.isNull(g.querySelector(".cut"));
  assert.isNotNull(g.querySelector(".steel"));
});
