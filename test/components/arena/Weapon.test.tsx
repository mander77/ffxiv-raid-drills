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

test("a sword rests along a line at its true angle, with its icon in the middle", () => {
  const g = draw({ t: "sword", x: 50, y: 79, ux: 0, uy: 1 });
  const line = g.querySelector(".rest");
  // North to south: the line runs straight up and down through the sword's spot.
  assert.deepEqual(
    ["x1", "y1", "x2", "y2"].map((k) => Number(line?.getAttribute(k))),
    [50, 70, 50, 88],
  );
  assert.equal(g.querySelector(".icon")?.getAttribute("transform"), "translate(50 79) scale(1)");
});

test("the scythe's blade reaches across the green safe ring, with its icon in the middle", () => {
  // Butt to the west, point to the east.
  const g = draw({ t: "scythe", x: 50, y: 21, ux: 1, uy: 0, dx: 0, dy: -1 });
  // The green ring is drawn 1.6 inside the 12.5 safe edge, so it is 10.9 from the middle.
  assert.include(g.querySelector(".blade")?.getAttribute("d"), "M-10.9 ");
  assert.equal(g.querySelector(".icon")?.getAttribute("transform"), "translate(50 21) scale(1)");
});

test("the scythe's icon is a curved handle with a curved blade, and no fill on the handle", () => {
  const g = draw({ t: "scythe", x: 50, y: 21, ux: 1, uy: 0, dx: 0, dy: -1 });
  // The icon is drawn twice: the sand outline, then the icon itself.
  const handles = g.querySelectorAll(".icon path.glyph-line");
  assert.equal(handles.length, 2);
  assert.match(handles[0]?.getAttribute("d") ?? "", /Q/);
  // Both edges of the blade are curves (Q or C in the path), not straight lines.
  assert.match(g.querySelector(".icon path.glyph")?.getAttribute("d") ?? "", /[QC].*[QC]/);
});

test("a held weapon is its icon alone, smaller, east of the point", () => {
  const g = draw({ t: "axe", x: 63, y: 50, ux: 1, uy: 0, held: true });
  assert.isNull(g.querySelector(".rest"));
  assert.equal(g.querySelector(".icon")?.getAttribute("transform"), "translate(67.5 50) scale(0.8)");
});
