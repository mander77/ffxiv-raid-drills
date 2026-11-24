// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, assert, expect, test } from "vitest";
import { Arena, LAYERS, pieceLayers } from "../../../src/components/arena/Arena";
import { ArenaLabel } from "../../../src/components/arena/ArenaLabel";
import { BossMark } from "../../../src/components/arena/BossMark";
import { LearnPicture } from "../../../src/components/arena/LearnPicture";
import { ZoneLabel } from "../../../src/components/arena/ZoneLabel";
import { LEARN_PICTURES } from "../../../src/data/fights/m11s/pictures";
import { LEARN_CARDS } from "../../../src/data/fights/m11s/questions";
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

test("pieces go to their layers: attacks on the ground, weapons over the waymarks, tags to labels, role marks to marks", () => {
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
    ["aoe"],
  );
  assert.deepEqual(
    [...(layer("weapons")?.children ?? [])].map((e) => e.getAttribute("class")),
    ["wpn sword"],
  );
  assert.equal(layer("labels")?.textContent, "SWORD");
  assert.equal(layer("marks")?.textContent, "H1");
});

test("an aim is an arrow on the ground, drawn over the cone it points along", () => {
  const os: Overlay[] = [
    { t: "aim", x: 20, y: 50, x2: 4, y2: 34 },
    {
      t: "poly",
      pts: [
        [20, 50],
        [0, 0],
        [0, 100],
      ],
    },
  ];
  render(<Arena label="x" layers={pieceLayers(os)} />);
  const ground = document.querySelector('[data-layer="ground"]');
  assert.deepEqual(
    [...(ground?.children ?? [])].map((e) => e.getAttribute("class")),
    ["aoe", "aim"],
  );
  const aim = ground?.querySelector(".aim");
  assert.deepEqual(
    [...(aim?.children ?? [])].map((e) => e.getAttribute("class")),
    ["halo", "shaft", "head"],
    "a light outline under the arrow",
  );
  assert.match(aim?.querySelector(".shaft")?.getAttribute("d") ?? "", /^M20,50 /, "the shaft starts at the source");
  assert.match(aim?.querySelector(".head")?.getAttribute("d") ?? "", /^M4,34 /, "the head ends at the tip");
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

test("a zone label on the boss moves straight out of his ring", () => {
  // A small zone on the boss's south side: above it would be on him, so the label goes south.
  const svg = renderToStaticMarkup(<ZoneLabel zone={{ c: [50, 55], r: 3 }} kind="correct" boss={[50, 50]} />);
  const y = Number(svg.match(/<rect x="[\d.-]+" y="([\d.-]+)"/)?.[1]);
  assert.isAtLeast(y, 50 + 14.5, "the box's top is past his ring and its ticks");
  assert.include(svg, 'x="41.5"', "straight below him");
});
