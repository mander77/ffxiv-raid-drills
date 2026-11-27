// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { LiveArena } from "../../../src/components/arena/LiveArena";
import { crushingComet } from "../../../src/data/fights/m11s/attacks";
import {
  avalancheScene,
  buildAssault2,
  DRILLS,
  lineupPlan,
  splitRound,
  spreadMarks,
  voidAgain,
  voidIntoWeapons,
} from "../../../src/data/fights/m11s/drills";
import { stackedAt } from "../../../src/data/partyRoute";
import { round2, stepZone, zoneCenter } from "../../../src/geometry";
import { buildPattern } from "../../../src/lib/practice";
import type { StepResult } from "../../../src/types";

afterEach(cleanup);

/** Assault Evolved for H1, with the first weapon answered correctly. */
function afterFirstJump() {
  const drill = DRILLS.find((d) => d.id === "m-assault");
  if (!drill) throw new Error("no m-assault");
  const { scene, k } = buildPattern(drill, "H1", "K7Q2");
  const z = stepZone(scene.steps[0], []);
  if (!z) throw new Error("no zone");
  const results: StepResult[] = [{ p: zoneCenter(z), ok: true, z, drop: null }];
  return { scene, k, results };
}

test("once the boss stands on a weapon, its name goes; the other weapons keep theirs", () => {
  const { scene, k, results } = afterFirstJump();
  const names = scene.overlays.flatMap((o) => (o.t === "tag" ? [o.s] : []));
  render(<LiveArena scene={scene} k={k} results={results} showLast hint={false} />);
  const shown = names.filter((s) => screen.queryByText(s));
  assert.equal(shown.length, names.length - 1, "one weapon name is gone");
});

test("the Correct spot label stays out of the boss's ring", () => {
  const { scene, k, results } = afterFirstJump();
  const { container } = render(<LiveArena scene={scene} k={k} results={results} showLast hint={false} />);
  const label = screen.getByText("Correct spot");
  const box = label.parentElement?.querySelector("rect");
  const ring = container.querySelector(".ring")?.closest("g[transform]");
  const [bx, by] = (ring?.getAttribute("transform") ?? "").match(/-?[\d.]+/g)?.map(Number) ?? [];
  const x = Number(box?.getAttribute("x")),
    y = Number(box?.getAttribute("y")),
    w = Number(box?.getAttribute("width")),
    h = Number(box?.getAttribute("height"));
  // The label box's nearest point to the boss is outside his 12.5 ring.
  const nx = Math.max(x, Math.min(bx, x + w)),
    ny = Math.max(y, Math.min(by, y + h));
  assert.isAbove(Math.hypot(nx - bx, ny - by), 12.5);
});

test("the arena's name says that a click picks where you stand, only when it does", () => {
  const { scene, k } = afterFirstJump();
  const { rerender } = render(<LiveArena scene={scene} k={k} results={[]} showLast={false} hint={false} onPointClick={() => {}} />);
  assert.ok(screen.getByRole("img", { name: "Arena map. Click where you stand." }));
  // Watch the correct moves: a click pauses the player, so the name leaves it out.
  rerender(<LiveArena scene={scene} k={k} results={[]} showLast={false} hint={false} onPointClick={() => {}} pickSpot={false} />);
  assert.ok(screen.getByRole("img", { name: "Arena map." }));
  rerender(<LiveArena scene={scene} k={k} results={[]} showLast={false} hint={false} />);
  assert.ok(screen.getByRole("img", { name: "Arena map." }));
});

test("the next step's cue shows after a correct answer, and waits after an incorrect one", () => {
  // Arena Split: the portal lines' portals are the cue of the lineup, after the three puddles. The
  // four tether portals show from the start.
  const portals = (): number => document.querySelectorAll(".portal").length;
  const scene = splitRound("H1", {
      tether: false,
      side: "west",
      end: "north",
      covered: "inner",
      endsSide: "west",
      plan: lineupPlan("H1", false, { side: "west", end: "north" }),
    }),
    puddles: StepResult[] = [];
  for (const st of scene.steps.slice(0, 3)) {
    const z = stepZone(st, puddles);
    if (!z) throw new Error("no zone");
    puddles.push({ p: zoneCenter(z), ok: true, z, drop: zoneCenter(z) });
  }
  const last = puddles[2];
  const answer = (ok: boolean): StepResult[] => [...puddles.slice(0, 2), { ...last, ok, p: ok ? last.p : [50, 90] }];
  const { rerender } = render(<LiveArena scene={scene} k={0} results={answer(true)} showLast hint={false} />);
  assert.equal(portals(), 6, "shown with the next question");
  rerender(<LiveArena scene={scene} k={0} results={answer(false)} showLast hint={false} />);
  assert.equal(portals(), 4, "not before Next step");
  rerender(<LiveArena scene={scene} k={0} results={answer(false)} showLast={false} hint={false} />);
  assert.equal(portals(), 6, "shown once the next step is asked");
});

test("Void Stardust: every puddle fades when Comet is asked, but stays for the stack", () => {
  const drill = DRILLS.find((d) => d.id === "m-void");
  if (!drill) throw new Error("no m-void");
  // Answer every step up to the third puddle, so the step after it (Comet or the stack) is asked.
  const puddlesBefore = (variant: string) => {
    const scene = drill.build("H1", variant),
      results: StepResult[] = [],
      lastDrop = scene.steps.map((st) => Boolean(st.drop)).lastIndexOf(true);
    for (const st of scene.steps.slice(0, lastDrop + 1)) {
      const z = stepZone(st, results);
      if (!z) throw new Error("no zone");
      results.push({ p: zoneCenter(z), ok: true, z, drop: st.drop ? zoneCenter(z) : null });
    }
    return { scene, results };
  };
  // A correct third puddle asks the next step at once, so it fades with or without its answer on
  // the floor. An incorrect one waits for Next step.
  for (const [variant, ok, showLast, lastFades] of [
    ["spread", true, false, true],
    ["spread", true, true, true],
    ["spread", false, true, false],
    ["stack", true, false, false],
    ["stack", true, true, false],
  ] as const) {
    const { scene, results } = puddlesBefore(variant);
    results[results.length - 1] = { ...results[results.length - 1], ok };
    const { container, unmount } = render(<LiveArena scene={scene} k={0} results={results} showLast={showLast} hint={false} />);
    const drops = [...container.querySelectorAll("circle.drop")];
    const name = `${variant}, ${ok ? "correct" : "incorrect"}, showLast ${showLast}`;
    assert.equal(drops.length, 3, `${name}: three puddles`);
    assert.equal(drops[2].classList.contains("fading"), lastFades, `${name}: the last puddle`);
    unmount();
  }
});

test("both Void Stardusts: the stack step shows Crushing Comet where the party stacks", () => {
  const r = crushingComet([0, 0]);
  if (r.t !== "aoe") throw new Error("Crushing Comet is not a circle");
  for (const id of ["m-void", "m-void-2"]) {
    const drill = DRILLS.find((d) => d.id === id);
    if (!drill) throw new Error(`no ${id}`);
    const scene = drill.build("H1", "stack"),
      stack = scene.steps.map((st) => Boolean(st.drop)).lastIndexOf(true) + 1,
      results: StepResult[] = [];
    for (const st of scene.steps.slice(0, stack + 1)) {
      const z = stepZone(st, results);
      if (!z) throw new Error("no zone");
      results.push({ p: zoneCenter(z), ok: true, z, drop: st.drop ? zoneCenter(z) : null });
    }
    const spot = results[stack].p;
    // Correct: on your click. Incorrect: on the correct spot, not on your click.
    for (const [ok, p] of [
      [true, spot],
      [false, [5, 5]],
    ] as const) {
      results[stack] = { ...results[stack], ok, p: [...p] };
      const { container, unmount } = render(<LiveArena scene={scene} k={0} results={results} showLast hint={false} />);
      const at = [...container.querySelectorAll("circle.aoe")].map((c) => [
        c.getAttribute("cx"),
        c.getAttribute("cy"),
        c.getAttribute("r"),
      ]);
      assert.deepInclude(at, [String(round2(spot[0])), String(round2(spot[1])), String(r.r)], `${id}, ${ok ? "correct" : "incorrect"}`);
      unmount();
    }
  }
});

test("Arena Split: your tether follows you, red until it is stretched, and the others show at the lineup", () => {
  const scene = splitRound("H1", {
      tether: true,
      side: "east",
      end: "south",
      covered: "inner",
      // The west portals near the middle: from the middle of the east platform, yours is short.
      endsSide: "east",
      plan: lineupPlan("H1", true, { side: "east", end: "south" }),
    }),
    results: StepResult[] = [];
  const { rerender } = render(<LiveArena scene={scene} k={0} results={results} showLast={false} hint={false} />);
  // From the first step: your tether to your mark, not stretched yet.
  assert.ok(screen.getByLabelText("Tether, not stretched"));
  assert.isNull(screen.queryByLabelText("Tether, stretched"));
  for (const st of scene.steps) {
    const z = stepZone(st, results);
    if (!z) throw new Error("no zone");
    results.push({ p: zoneCenter(z), ok: true, z, drop: st.drop ? zoneCenter(z) : null });
  }
  rerender(<LiveArena scene={scene} k={0} results={results} showLast hint={false} />);
  // At the lineup: yours and the three others, all stretched.
  assert.equal(screen.getAllByLabelText("Tether, stretched").length, 4);
  assert.isNull(screen.queryByLabelText("Tether, not stretched"));
  assert.ok(screen.getByText("M2"), "on the other tethered players");
});

test("Meteorain: the tanks pick up Foregone Fatality's tethers, which never stretch", () => {
  const drill = DRILLS.find((m) => m.id === "m-meteor-3");
  if (!drill) throw new Error("missing drill m-meteor-3");
  const scene = drill.build("H1", null);
  render(<LiveArena scene={scene} k={0} results={[]} showLast={false} hint={false} />);
  assert.equal(screen.getAllByLabelText("Tether").length, 2);
  assert.isNull(screen.queryByLabelText("Tether, stretched"));
  assert.ok(screen.getByText("MT"));
  assert.ok(screen.getByText("OT"));
});

test("Meteorain: the tank tethers stay on the arena after you drop your meteor", () => {
  const drill = DRILLS.find((m) => m.id === "m-meteor-2");
  if (!drill) throw new Error("missing drill m-meteor-2");
  const scene = drill.build("H1", null),
    results: StepResult[] = [];
  for (const st of scene.steps) {
    const z = stepZone(st, results);
    if (!z) throw new Error("no zone");
    results.push({ p: zoneCenter(z), ok: true, z, drop: null });
  }
  render(<LiveArena scene={scene} k={0} results={results} showLast hint={false} />);
  assert.equal(screen.getAllByLabelText("Tether").length, 2);
});

test("Massive Meteor: the stack marker shows on its player, then the stack goes where the party went", () => {
  const drill = DRILLS.find((d) => d.id === "m-massive");
  if (!drill) throw new Error("no m-massive");
  const scene = buildPattern(drill, "H1", "AB12").scene,
    head = scene.headMark,
    st = scene.steps[0];
  if (!head) throw new Error("no stack marker");
  const before = render(<LiveArena scene={scene} k={0} results={[]} showLast={false} hint={false} />);
  const mark = before.container.querySelector(".stackmk");
  assert.ok(mark, "the marker shows before you answer");
  // On the player who has it: you, at the head mark's spot, or another player, on their mark.
  const on = head.you ? [round2(head.on.x), round2(head.on.y)] : marksOn(before.container).get(head.on.l);
  assert.equal(mark.getAttribute("transform"), `translate(${on?.[0]} ${on?.[1]})`);
  before.unmount();
  const z = stepZone(st, []);
  if (!z) throw new Error("no zone");
  const p = zoneCenter(z);
  const after = render(<LiveArena scene={scene} k={0} results={[{ p, ok: true, z, drop: null }]} showLast hint={false} />);
  // The player with the marker stands with you, or it is you.
  const at = after.container
    .querySelector(".stackmk")
    ?.getAttribute("transform")
    ?.match(/translate\(([\d.]+) ([\d.]+)\)/);
  assert.ok(at, "the marker moves to the stack");
  assert.isBelow(Math.hypot(Number(at[1]) - p[0], Number(at[2]) - p[1]), 6, "the stack is where you went");
  assert.ok(after.container.querySelector(`circle.aoe[cx="${at[1]}"][cy="${at[2]}"]`), "the stack's circle, on the marker");
  assert.equal(after.container.querySelectorAll(".stackmk").length, 1, "one marker");
});

test("Crushing Comet: the stack marker shows on the other healer, who stands with you, once the puddles are done", () => {
  const scene = voidAgain("H1", false, { x: 50, y: 50, f: 0 }, "H2");
  const results: StepResult[] = [];
  const markerAfter = (n: number) => {
    while (results.length < n) {
      const z = stepZone(scene.steps[results.length], results);
      if (!z) throw new Error("no zone");
      const p = zoneCenter(z);
      results.push({ p, ok: true, z, drop: p });
    }
    const view = render(<LiveArena scene={scene} k={0} results={[...results]} showLast hint={false} />);
    const at = view.container.querySelector(".stackmk")?.getAttribute("transform");
    view.unmount();
    return at;
  };
  assert.isUndefined(markerAfter(2), "no marker during the puddles");
  const last = results[1].p;
  const at = markerAfter(3);
  const third = results[2].p;
  assert.notDeepEqual(third, last);
  const h2 = stackedAt("H2", third);
  assert.equal(at, `translate(${round2(h2[0])} ${round2(h2[1])})`, "on H2, beside your last spot");
  assert.isUndefined(markerAfter(4), "gone once the party stacks");
});

test("Ultimate Trophy Weapons: Practice shows three weapons, the fight clock shows the ones that spawned", () => {
  const drill = DRILLS.find((d) => d.id === "m-ultimate");
  if (!drill) throw new Error("no m-ultimate");
  const { scene, k } = buildPattern(drill, "H1", "K7Q2");
  const shown = (container: HTMLElement) => container.querySelectorAll(".spawn:not(.later)");
  const practice = render(<LiveArena scene={scene} k={k} results={[]} showLast={false} hint={false} />);
  assert.lengthOf(shown(practice.container), 3, "Practice: three show before the first hit");
  cleanup();
  for (const spawned of [0, 1, 2, 6]) {
    const { container } = render(<LiveArena scene={scene} k={k} results={[]} showLast={false} hint={false} spawned={spawned} />);
    const weapons = [...shown(container)];
    assert.lengthOf(weapons, spawned, `${spawned} spawned`);
    // Each one comes in as it spawns, with no wait of its own.
    for (const w of weapons) assert.equal((w as SVGElement).style.animationDelay, "", "no animation delay");
    cleanup();
  }
});

test("Ecliptic Stampede: your tether shows from the tether step, follows you to the corner, and never reads as stretched", () => {
  const drill = DRILLS.find((m) => m.id === "m-ecl-towers");
  if (!drill) throw new Error("missing drill m-ecl-towers");
  const { scene } = buildPattern(drill, "H1", "K7Q2");
  const results: StepResult[] = [];
  const answer = () => {
    const st = scene.steps[results.length];
    const z = stepZone(st, results);
    if (!z) throw new Error("no zone");
    const p = st.stand ?? zoneCenter(z);
    results.push({ p, ok: true, z, drop: null });
    return p;
  };
  const { container, rerender } = render(<LiveArena scene={scene} k={0} results={results} showLast={false} hint={false} />);
  // The start, under the boss, the tower: no tether yet.
  for (let i = 0; i < 3; i++) {
    assert.isNull(screen.queryByLabelText(/^Tether/), `no tether before step ${i + 1}`);
    answer();
    rerender(<LiveArena scene={scene} k={0} results={[...results]} showLast={false} hint={false} />);
  }
  // The tether step is asked: the tether runs from its portal to you in your tower.
  assert.ok(screen.getByLabelText("Tether"));
  const corner = answer();
  rerender(<LiveArena scene={scene} k={0} results={[...results]} showLast hint={false} />);
  assert.ok(screen.getByLabelText("Tether"));
  assert.isNull(screen.queryByLabelText(/^Tether, /), "never stretched or not stretched");
  const cord = container.querySelector(".tether line");
  assert.deepEqual(
    [cord?.getAttribute("x2"), cord?.getAttribute("y2")],
    corner.map((v) => String(round2(v))),
    "it follows you to the corner",
  );
});

test("Arena Split: Lineup: the arena splits only once you answer where you stand for Flatliner", () => {
  const drill = DRILLS.find((d) => d.id === "m-split-line");
  if (!drill) throw new Error("no m-split-line");
  const { scene, k } = buildPattern(drill, "H1", "K7Q2");
  const z = stepZone(scene.steps[0], []);
  if (!z) throw new Error("no zone");
  const { container, rerender } = render(<LiveArena scene={scene} k={k} results={[]} showLast={false} hint={false} />);
  assert.isNull(container.querySelector(".voidr"), "whole before Flatliner");
  rerender(<LiveArena scene={scene} k={k} results={[{ p: zoneCenter(z), ok: true, z, drop: null }]} showLast hint={false} />);
  assert.isNotNull(container.querySelector(".voidr"), "split once Flatliner went off");
});

test("Arcadion Avalanche: the towers go once they go off, and the platform he throws once he slams", () => {
  const scene = avalancheScene("H1", "west", "north", "east", "north");
  const results: StepResult[] = [];
  const view = (n: number) => {
    while (results.length < n) {
      const z = stepZone(scene.steps[results.length], results);
      if (!z) throw new Error("no zone");
      results.push({ p: zoneCenter(z), ok: true, z, drop: null });
    }
    const { container, unmount } = render(<LiveArena scene={scene} k={0} results={[...results]} showLast hint={false} />);
    const seen = { towers: container.querySelectorAll(".tower").length, floors: container.querySelectorAll("rect.floor").length };
    unmount();
    return seen;
  };
  assert.deepEqual(view(0), { towers: 4, floors: 2 });
  assert.deepEqual(view(1), { towers: 0, floors: 2 }, "the towers went off");
  assert.deepEqual(view(2), { towers: 0, floors: 1 }, "the east platform is gone");
});

test("an attack the fight draws on the floor is clipped to the arena, as the ground is", () => {
  const { scene, k } = afterFirstJump();
  const { container } = render(
    <LiveArena scene={scene} k={k} results={[]} showLast={false} hint={false} floor={<g data-testid="trail" />} />,
  );
  const ground = container.querySelector('[data-layer="ground"]');
  assert.ok(ground?.querySelector('[data-testid="trail"]'), "in the ground layer");
  assert.match(ground?.getAttribute("clip-path") ?? "", /^url\(#/);
});

test("Comet: a spread marker shows on every player once the puddles are done, and goes once you spread", () => {
  const scene = voidAgain("H1", true, { x: 50, y: 50, f: 0 });
  const results: StepResult[] = [];
  const markersAfter = (n: number) => {
    while (results.length < n) {
      const z = stepZone(scene.steps[results.length], results);
      if (!z) throw new Error("no zone");
      const p = zoneCenter(z);
      results.push({ p, ok: true, z, drop: p });
    }
    const view = render(<LiveArena scene={scene} k={0} results={[...results]} showLast hint={false} />);
    const spots = [...view.container.querySelectorAll("circle.target")].map((c) => [c.getAttribute("cx"), c.getAttribute("cy")]);
    view.unmount();
    return spots;
  };
  assert.lengthOf(markersAfter(2), 0, "no markers during the puddles");
  const spots = markersAfter(3);
  const third = results[2].p;
  assert.lengthOf(spots, 8, "on every player");
  assert.deepInclude(spots, [String(round2(third[0])), String(round2(third[1]))], "yours on your last spot");
  assert.lengthOf(markersAfter(4), 0, "they go once you spread");
});

/** Where each player's mark stands on the arena, by its name. */
function marksOn(container: HTMLElement): Map<string, [number, number]> {
  return new Map(
    [...container.querySelectorAll(".mk text")].map((t) => [
      t.textContent ?? "",
      [Number(t.getAttribute("x")), Number(t.getAttribute("y"))],
    ]),
  );
}

test("Void Stardust into the weapons: after Comet, no tank or melee mark stays on its spread spot", () => {
  const scene = voidIntoWeapons("H1", true, buildAssault2("H1"));
  const results: StepResult[] = [];
  const marksAfter = (n: number) => {
    while (results.length < n) {
      const z = stepZone(scene.steps[results.length], results);
      if (!z) throw new Error("no zone");
      const p = zoneCenter(z);
      results.push({ p, ok: true, z, drop: scene.steps[results.length].drop ? p : null });
    }
    const view = render(<LiveArena scene={scene} k={0} results={[...results]} showLast hint={false} />);
    const marks = marksOn(view.container);
    view.unmount();
    return marks;
  };
  const fixed = spreadMarks().flatMap((o) => (o.t === "mark" ? [[o.l, [round2(o.x), round2(o.y)]] as const] : []));
  // Comet is asked (step 4): the tanks and melee are already on their spots.
  const asked = marksAfter(4);
  for (const [l, p] of fixed) assert.deepEqual(asked.get(l), p, `${l} on its spread spot while Comet is asked`);
  // Comet and the first weapon are answered: they have moved on to the weapon.
  const later = marksAfter(6);
  for (const [l, p] of fixed) assert.notDeepEqual(later.get(l), p, `${l} left its spread spot`);
  assert.lengthOf(
    [...later.keys()].filter((l) => l !== "H1"),
    7,
    "every other player shows",
  );
});
