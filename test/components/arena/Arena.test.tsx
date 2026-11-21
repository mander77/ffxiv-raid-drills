// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, assert, expect, test } from "vitest";
import { Arena, LAYERS, pieceLayers } from "../../../src/components/arena/Arena";
import { BossMark } from "../../../src/components/arena/BossMark";
import { FigPicture } from "../../../src/components/arena/FigPicture";
import { MECH_FIGS } from "../../../src/data/figs";
import { MECH } from "../../../src/data/questions";
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
  for (const item of MECH) {
    const f = MECH_FIGS[item.id]?.("H1");
    if (!f) continue;
    expect(renderToStaticMarkup(<FigPicture fig={f} answered={false} label={item.id} />)).toMatchSnapshot(`${item.id} before`);
    expect(renderToStaticMarkup(<FigPicture fig={f} answered={true} label={item.id} />)).toMatchSnapshot(`${item.id} after`);
  }
});
