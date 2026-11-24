// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import { LiveArena } from "../../../src/components/arena/LiveArena";
import { DRILLS, splitRound } from "../../../src/data/drills";
import { stepZone, zoneCenter } from "../../../src/geometry";
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
  const scene = splitRound("H1", false, "west", "north", "inner"),
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
