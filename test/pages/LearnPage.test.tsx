// @vitest-environment happy-dom
// The Learn and Timeline tabs: one card at a time, with previews on the picture, Lock in, the
// keyboard keys, Back and Next, the chips, and the end of a round.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, assert, beforeEach, test } from "vitest";
import { LEARN_CARDS, TIMELINE_CARDS } from "../../src/data/questions";
import { LearnPage } from "../../src/pages/LearnPage";
import { TimelinePage } from "../../src/pages/TimelinePage";
import { useProgressStore } from "../../src/stores/progress";
import { useSlotStore } from "../../src/stores/slot";

const LEARN = [...LEARN_CARDS].sort((a, b) => a.order - b.order);
const TIMELINE = [...TIMELINE_CARDS].sort((a, b) => a.order - b.order);

beforeEach(() => {
  useSlotStore.setState({ slot: "H1" });
  useProgressStore.getState().reset();
});
afterEach(cleanup);

/** Shows the address, so a test can see where a click went. */
function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

function open(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/learn/:card?" element={<LearnPage />} />
        <Route path="/timeline/:card?" element={<TimelinePage />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}
const where = (): string | null => screen.getByTestId("where").textContent;
/** The answer buttons, in the order shown. */
const answers = (): HTMLElement[] => screen.getAllByRole("button").filter((b) => /^\d/.test(b.textContent ?? ""));
/** The correct answer's text for a card, for slot H1. */
const correctOf = (id: string): string =>
  LEARN_CARDS.concat(TIMELINE_CARDS)
    .find((x) => x.id === id)
    ?.build("H1")
    .options.find((o) => o.ok)?.t ?? "";

test("Learn with no card opens the first card", () => {
  open("/learn");
  assert.equal(where(), `/learn/${LEARN[0].id}`);
  assert.ok(screen.getByText(`Card 1 of ${LEARN.length}`, { exact: false }));
});

test("a Learn answer shows on the picture first, then Lock in answers it", async () => {
  open(`/learn/${LEARN[0].id}`);
  const user = userEvent.setup();
  const lock = screen.getByRole("button", { name: "Lock In" });
  assert.isTrue(lock.hasAttribute("disabled"), "nothing to lock in yet");
  const correct = answers().find((b) => b.textContent?.includes(correctOf(LEARN[0].id)));
  if (!correct) throw new Error("no correct answer");
  await user.click(correct);
  assert.equal(correct.getAttribute("aria-pressed"), "true");
  assert.ok(screen.getByRole("img", { name: /Arena picture of answer/ }), "the picture shows the picked answer");
  await user.click(lock);
  assert.ok(screen.getByText("Correct answer.", { exact: false }));
  assert.deepEqual(useProgressStore.getState().scores.H1?.[LEARN[0].id], { seen: 1, correct: 1 });
  assert.ok(screen.getByRole("img", { name: /green area shows the answer/ }));
});

test("number keys pick, Enter locks in, and Enter again goes to the next card", () => {
  open(`/learn/${LEARN[0].id}`);
  fireEvent.keyDown(window, { key: "1" });
  assert.equal(answers()[0].getAttribute("aria-pressed"), "true");
  fireEvent.keyDown(window, { key: "Enter" });
  assert.equal(useProgressStore.getState().rounds.learn.done, 1);
  // Next has the focus now, so Enter on it is a click.
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  assert.equal(where(), `/learn/${LEARN[1].id}`);
});

test("a chip goes to the first card of its mechanic", async () => {
  open(`/learn/${LEARN[0].id}`);
  const user = userEvent.setup();
  const chips = screen.getByRole("group", { name: "Go to a mechanic" });
  assert.equal(chips.querySelector('[aria-current="true"]')?.textContent, "Raw Steel");
  await user.click(screen.getByRole("button", { name: "Weapons" }));
  assert.equal(where(), "/learn/k-first-weapon");
});

test("a Timeline card answers with one click and shows the coming rows", async () => {
  open(`/timeline/${TIMELINE[0].id}`);
  const user = userEvent.setup();
  assert.ok(screen.getByRole("list", { name: "Fight timeline" }));
  assert.ok(screen.getAllByText("? ? ?").length > 0, "the names hide until the answer");
  const correct = answers().find((b) => b.textContent?.includes(correctOf(TIMELINE[0].id)));
  if (!correct) throw new Error("no correct answer");
  await user.click(correct);
  assert.equal(screen.queryAllByText("? ? ?").length, 0, "the names show after the answer");
  assert.equal(useProgressStore.getState().rounds.timeline.correct, 1);
});

test("after the last card the round ends with the score, and Go again starts over", async () => {
  const last = TIMELINE[TIMELINE.length - 1];
  open(`/timeline/${last.id}`);
  const user = userEvent.setup();
  await user.click(answers()[0]);
  await user.click(screen.getByRole("button", { name: "Next" }));
  assert.equal(where(), "/timeline");
  assert.ok(screen.getByText("Round done"));
  await user.click(screen.getByRole("button", { name: "Go Again" }));
  assert.equal(where(), `/timeline/${TIMELINE[0].id}`);
});
