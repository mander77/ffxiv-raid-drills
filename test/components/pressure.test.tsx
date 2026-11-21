// @vitest-environment happy-dom
// The pieces of Pressure: the timed card, Settings and the end screens.
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, assert, test, vi } from "vitest";
import { FightSettings } from "../../src/components/pressure/FightSettings";
import { RunScore } from "../../src/components/pressure/RunScore";
import { WatchDone } from "../../src/components/pressure/WatchDone";
import { QuestionCard } from "../../src/components/quiz/QuestionCard";
import { TooltipProvider } from "../../src/components/ui/tooltip";
import { buildFight, type Choices, RANDOM } from "../../src/data/fight";
import { LEARN_CARDS } from "../../src/data/questions";
import type { StepResult } from "../../src/types";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("a timed card: when the time to read and decide runs out, you froze", () => {
  vi.useFakeTimers();
  const onTimeout = vi.fn();
  const onAnswer = vi.fn();
  render(<QuestionCard item={LEARN_CARDS[0]} slot="H1" decideSecs={4} onAnswer={onAnswer} onNext={() => {}} onTimeout={onTimeout} />);
  assert.ok(screen.getByText("Read"));
  assert.ok(screen.getByRole("progressbar", { name: "Time to read" }));
  // Reading takes at least 2 seconds; a card's text never takes a minute.
  act(() => {
    vi.advanceTimersByTime(60_000);
  });
  assert.equal(onTimeout.mock.calls.length, 1);
  assert.equal(onAnswer.mock.calls.length, 0);
  assert.ok(screen.getByText("Too slow: the time ran out."));
  assert.ok(screen.getByRole("button", { name: "Next" }));
});

test("a timed card answered in time does not time out", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const onTimeout = vi.fn();
  render(<QuestionCard item={LEARN_CARDS[0]} slot="H1" decideSecs={4} onAnswer={() => {}} onNext={() => {}} onTimeout={onTimeout} />);
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  await user.click(within(screen.getByRole("group", { name: "Answers" })).getAllByRole("button")[0]);
  act(() => {
    vi.advanceTimersByTime(60_000);
  });
  assert.equal(onTimeout.mock.calls.length, 0);
});

/** Open the Settings sheet with its button. */
async function openSettings(): Promise<void> {
  await userEvent.setup().click(screen.getByRole("button", { name: "Settings" }));
}

test("Settings: a pick and Set all to Random", async () => {
  const onChange = vi.fn<(c: Choices) => void>();
  render(<FightSettings code="K7Q2" choices={{ ...RANDOM, ult: "cw" }} onChange={onChange} />, { wrapper: TooltipProvider });
  await openSettings();
  const user = userEvent.setup();
  await user.click(within(screen.getByRole("radiogroup", { name: "Ecliptic Fireball" })).getByRole("radio", { name: "Two-way" }));
  assert.equal(onChange.mock.calls[0][0].fireball, "two");
  assert.equal(onChange.mock.calls[0][0].ult, "cw", "the other picks stay");
  await user.click(screen.getByRole("button", { name: "Set all to Random" }));
  assert.deepEqual(onChange.mock.calls[1][0], RANDOM);
});

test("Settings: a weapon order moves with the arrow keys", async () => {
  const onChange = vi.fn<(c: Choices) => void>();
  render(<FightSettings code="K7Q2" choices={{ ...RANDOM, set1: "sword-axe-scythe" }} onChange={onChange} />, { wrapper: TooltipProvider });
  await openSettings();
  const card = screen.getByRole("listitem", { name: "Sword, number 1" });
  card.focus();
  await userEvent.setup().keyboard("{ArrowRight}");
  assert.equal(onChange.mock.calls[0][0].set1, "axe-sword-scythe");
});

test("Settings: on Random, the weapon cards show ? and do not move", async () => {
  render(<FightSettings code="K7Q2" choices={RANDOM} onChange={() => {}} />, { wrapper: TooltipProvider });
  await openSettings();
  assert.equal(screen.getAllByRole("listitem", { name: "Sword, order random" }).length, 2);
});

test("after the run: the score, and a Practice link for each mechanic with a miss", () => {
  const fight = buildFight("H1", "K7Q2");
  const miss: StepResult = { p: [0, 0], ok: false, z: { c: [50, 50], r: 1 }, drop: null };
  const results = fight.segs.map((_g, i) => (i === 0 ? [miss] : []));
  render(
    <MemoryRouter>
      <RunScore fight={fight} results={results} stopped onAgain={() => {}} onWatch={() => {}} />
    </MemoryRouter>,
  );
  assert.ok(screen.getByText("0 of 1 spots correct"));
  assert.ok(screen.getByText(`Full fight · Stopped at mechanic 1 of ${fight.segs.length}`));
  const list = screen.getByRole("list", { name: "Practice these" });
  assert.equal(within(list).getAllByRole("listitem").length, 1);
  const link = within(list).getByRole("link", { name: "Practice it" });
  assert.equal(link.getAttribute("href"), `/practice/${fight.segs[0].drills[0]}`);
});

test("after watching: run the same fight or watch again", async () => {
  const onRun = vi.fn();
  render(<WatchDone summary="Axe first." onRun={onRun} onWatch={() => {}} />);
  assert.ok(screen.getByText("Axe first."));
  await userEvent.setup().click(screen.getByRole("button", { name: "Run this fight" }));
  assert.equal(onRun.mock.calls.length, 1);
});

test("Settings is a sheet: its button opens it, and Done closes it and gives the focus back", async () => {
  render(<FightSettings code="K7Q2" choices={RANDOM} onChange={() => {}} />, { wrapper: TooltipProvider });
  await openSettings();
  assert.ok(screen.getByRole("dialog", { name: "Fight pattern" }));
  await userEvent.setup().click(screen.getByRole("button", { name: "Done" }));
  assert.isNull(screen.queryByRole("dialog"));
  assert.equal(document.activeElement, screen.getByRole("button", { name: "Settings" }));
});
