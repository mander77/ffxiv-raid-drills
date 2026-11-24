// @vitest-environment happy-dom
// The small parts over the fight's arena: a hit's name, and the run's result, countdown and progress.
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, assert, test } from "vitest";
import { Countdown, HitLabel, RunProgress, RunResult } from "../../src/components/pressure/RunOverlays";
import { FightFrameContext, type FrameFn } from "../../src/hooks/useFightFrame";
import { type FightState, LEAD, newFightState } from "../../src/lib/fight";
import { buildFight } from "../m11s";

afterEach(cleanup);

/** Draw `ui` inside a fight clock; the test runs a frame with `frame(s)`. */
function renderOnClock(ui: ReactNode) {
  const frames = new Set<FrameFn>();
  render(<FightFrameContext value={frames}>{ui}</FightFrameContext>);
  return (s: FightState) =>
    act(() => {
      for (const f of frames) f(s);
    });
}

test("a hit's label names the hit", () => {
  render(<HitLabel hit={{ n: 1, hit: { t: 10, name: "Crown of Arcadia", kind: "raid", cat: "raid" }, at: [50, 50] }} />);
  assert.equal(screen.getByRole("status").textContent, "Crown of Arcadia");
});

test("the run's result says correct, not there or too slow", () => {
  const { rerender } = render(<RunResult kind="ok" />);
  assert.equal(screen.getByRole("status").textContent, "✓ Correct");
  rerender(<RunResult kind="bad" />);
  assert.equal(screen.getByRole("status").textContent, "✗ Not there");
  rerender(<RunResult kind="slow" />);
  assert.equal(screen.getByRole("status").textContent, "✗ Too slow");
});

test("the countdown shows 3-2-1 and the next mechanic before it, then goes", () => {
  const frame = renderOnClock(<Countdown />);
  const s = newFightState("run", buildFight("H1", "K7Q2"));
  const first = s.fight.segs[0];
  frame(s);
  assert.ok(screen.getByText("3"));
  assert.ok(screen.getByText(first.title));
  s.t = first.from - 0.5;
  frame(s);
  assert.ok(screen.getByText("1"));
  s.t = first.from;
  frame(s);
  assert.equal(screen.queryByText(first.title), null);
});

test("the countdown stays away on the player", () => {
  const frame = renderOnClock(<Countdown />);
  const s = newFightState("watch", buildFight("H1", "K7Q2"));
  s.t = s.fight.segs[0].from - LEAD;
  frame(s);
  assert.equal(screen.queryByText(s.fight.segs[0].title), null);
});

test("the run's progress counts mechanics", () => {
  const frame = renderOnClock(<RunProgress />);
  const s = newFightState("run", buildFight("H1", "K7Q2"));
  const n = s.fight.segs.length;
  frame(s);
  assert.ok(screen.getByText(`Mechanic 1 of ${n}`));
  s.t = s.fight.segs[1].from;
  frame(s);
  assert.ok(screen.getByText(`Mechanic 2 of ${n}`));
  s.t = s.fight.end;
  frame(s);
  assert.ok(screen.getByText(`Mechanic ${n} of ${n}`));
});
