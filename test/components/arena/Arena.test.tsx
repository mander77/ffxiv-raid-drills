// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, assert, expect, test } from "vitest";
import { Arena, LAYERS, pieceLayers } from "../../../src/components/arena/Arena";
import { ArenaLabel } from "../../../src/components/arena/ArenaLabel";
import { BossMark } from "../../../src/components/arena/BossMark";
import { LearnPicture } from "../../../src/components/arena/LearnPicture";
import { ZoneLabel } from "../../../src/components/arena/ZoneLabel";
import { LEARN_PICTURES } from "../../../src/data/pictures";
import { LEARN_CARDS } from "../../../src/data/questions";
import type { Overlay } from "../../../src/types";

afterEach(cleanup);

test("an arena is a labelled picture with its layers in order, your own marks on top", () => {
  render(<Arena label="Sword example" layers={{}} />);
  const svg = screen.getByRole("img", { name: "Sword example" });
  const order = [...svg.querySelectorAll("[data-layer]")].map((g) => g.getAttribute("data-layer"));
  assert.deepEqual(order, [...LAYERS]);
  assert.equal(order.at(-1), "me");
  assert.equal(svg.querySelectorAll(".wm").length, 8, "the eight waymarks");
});

test("two arenas on one page never share a clip or a pattern", () => {
  render(
    <>
      <Arena label="a" layers={{}} />
      <Arena label="b" layers={{}} />
    </>,
  );
  const ids = [...document.querySelectorAll("clipPath, pattern")].map((e) => e.id);
  assert.equal(new Set(ids).size, 4);
});

test("pieces go to their layers: attacks under weapons, tags to labels, role marks to marks", () => {
  const os: Overlay[] = [
    { t: "sword", x: 30, y: 30 },
    { t: "aoe", x: 50, y: 50, r: 10 },
    { t: "tag", x: 20, y: 20, s: "SWORD" },
    { t: "mark", x: 40, y: 40, l: "H1", r: "H" },
  ];
  render(<Arena label="x" layers={pieceLayers(os)} />);
  const layer = (l: string): Element | null => document.querySelector(`[data-layer="${l}"]`);
  assert.deepEqual(
    [...(layer("ground")?.children ?? [])].map((e) => e.getAttribute("class")),
    ["aoe", "wpn"],
  );
  assert.equal(layer("labels")?.textContent, "SWORD");
  assert.equal(layer("marks")?.textContent, "H1");
});

test("the boss shows his facing only when he has one", () => {
  const plain = renderToStaticMarkup(<BossMark boss={{ x: 50, y: 50, f: null }} />);
  assert.notInclude(plain, "face");
  const facing = renderToStaticMarkup(<BossMark boss={{ x: 50, y: 50, f: 90 }} />);
  assert.include(facing, 'class="face"');
  assert.include(facing, "rotate(90deg)");
});

// The pictures were checked against the old site's drawing code when it was replaced. These
// snapshots keep them the same from now on: a change to a picture shows up as a failed test.
test("every Learn picture stays the same", () => {
  for (const item of LEARN_CARDS) {
    const f = LEARN_PICTURES[item.id]?.("H1");
    if (!f) continue;
    expect(renderToStaticMarkup(<LearnPicture fig={f} answered={false} label={item.id} />)).toMatchSnapshot(`${item.id} before`);
    expect(renderToStaticMarkup(<LearnPicture fig={f} answered={true} label={item.id} />)).toMatchSnapshot(`${item.id} after`);
  }
});

test("an arena label is a box with its text, centred on its spot, in its colour", () => {
  const html = renderToStaticMarkup(<ArenaLabel at={[40, 20]} text="Go here" w={14} h={4.2} look="pick" />);
  assert.equal(
    html,
    '<g class="zlabel pick"><rect x="33" y="17.9" width="14" height="4.2" rx=".9"></rect><text x="40" y="20">Go here</text></g>',
  );
  assert.include(renderToStaticMarkup(<ArenaLabel at={[40, 20]} text="G1 / H1" w={16} h={4.6} look="ok" />), 'class="zlabel"');
});

test("a zone label sits above its zone, or below it at the top edge, and inside the picture", () => {
  const above = renderToStaticMarkup(<ZoneLabel zone={{ c: [50, 50], r: 10 }} kind="correct" />);
  // 3 units above the circle's top (40): the middle is at 37, so the 4.2-high box starts at 34.9.
  assert.include(above, '<rect x="41.5" y="34.9"');
  assert.include(above, '<text x="50" y="37">Correct spot</text>');
  const below = renderToStaticMarkup(<ZoneLabel zone={{ c: [99, 1], r: 3 }} kind="go" />);
  assert.include(below, 'x="90"', "kept inside the picture on the right");
  assert.include(below, "Go here");
});
