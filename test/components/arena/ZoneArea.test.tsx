// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { ZoneArea } from "../../../src/components/arena/ZoneArea";
import type { Point, ZoneShape } from "../../../src/types";

afterEach(cleanup);

/** Draw one zone's area in an svg and return what it drew. */
function draw(zone: ZoneShape): Element {
  const { container } = render(
    <svg>
      <title>zone</title>
      <ZoneArea zone={zone} look="ok" />
    </svg>,
  );
  const el = container.querySelector(".zone");
  if (!el) throw new Error("no area drawn");
  return el;
}

const square = (lo: number, hi: number): Point[] => [
  [lo, lo],
  [hi, lo],
  [hi, hi],
  [lo, hi],
];

test("a polygon draws as a polygon", () => {
  assert.equal(draw({ poly: square(10, 90) }).tagName.toLowerCase(), "polygon");
});

test("a ring draws its outer edge and its hole as one even-odd path, with no line between them", () => {
  const el = draw({ poly: square(10, 90), hole: square(40, 60) });
  assert.equal(el.tagName.toLowerCase(), "path");
  assert.equal(el.getAttribute("fill-rule"), "evenodd");
  assert.equal(el.getAttribute("d"), "M10,10L90,10L90,90L10,90Z M40,40L60,40L60,60L40,60Z");
});
