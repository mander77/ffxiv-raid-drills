// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { LiveArena } from "../../../src/components/arena/LiveArena";
import { crushingComet } from "../../../src/data/fights/m11s/attacks";
import { DRILLS, splitRound } from "../../../src/data/fights/m11s/drills";
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
  // Arena Split: the portal lines are the cue of the lineup, after the three puddles.
  const scene = splitRound("H1", {
      tether: false,
      side: "west",
      end: "north",
      covered: "inner",
      endsSide: "west",
      others: ["MT", "OT", "M1", "R2"],
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
  assert.ok(screen.queryByText("PORTAL LINES"), "shown with the next question");
  rerender(<LiveArena scene={scene} k={0} results={answer(false)} showLast hint={false} />);
  assert.isNull(screen.queryByText("PORTAL LINES"), "not before Next step");
  rerender(<LiveArena scene={scene} k={0} results={answer(false)} showLast={false} hint={false} />);
  assert.ok(screen.queryByText("PORTAL LINES"), "shown once the next step is asked");
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
      endsSide: "west",
      others: ["MT", "M2", "R1"],
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
