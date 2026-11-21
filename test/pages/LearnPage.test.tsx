// @vitest-environment happy-dom
// The Learn and Timeline tabs: one card at a time, with previews on the picture, Lock in, the
// keyboard keys, Back and Next, the chips, and the end of a round.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, assert, beforeEach, test } from "vitest";
import { MECH, NEXT_ITEMS } from "../../src/data/questions";
import { LearnPage } from "../../src/pages/LearnPage";
import { TimelinePage } from "../../src/pages/TimelinePage";
import { useProgressStore } from "../../src/stores/progress";
import { useSlotStore } from "../../src/stores/slot";

const LEARN = [...MECH].sort((a, b) => a.order - b.order);
const TIMELINE = [...NEXT_ITEMS].sort((a, b) => a.order - b.order);

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
        <Route path="/mech/:card?" element={<LearnPage />} />
        <Route path="/next/:card?" element={<TimelinePage />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}
const where = (): string | null => screen.getByTestId("where").textContent;
/** The answer buttons, in the order shown. */
const answers = (): HTMLElement[] => screen.getAllByRole("button").filter((b) => /^\d/.test(b.textContent ?? ""));
/** The right answer's text for a card, for slot H1. */
const rightOf = (id: string): string =>
  MECH.concat(NEXT_ITEMS)
    .find((x) => x.id === id)
    ?.build("H1")
    .options.find((o) => o.ok)?.t ?? "";

test("Learn with no card opens the first card", () => {
  open("/mech");
  assert.equal(where(), `/mech/${LEARN[0].id}`);
  assert.ok(screen.getByText(`Card 1 of ${LEARN.length}`, { exact: false }));
});

test("a Learn answer shows on the picture first, then Lock in answers it", async () => {
  open(`/mech/${LEARN[0].id}`);
  const user = userEvent.setup();
  const lock = screen.getByRole("button", { name: "Lock in answer" });
  assert.isTrue(lock.hasAttribute("disabled"), "nothing to lock in yet");
  const right = answers().find((b) => b.textContent?.includes(rightOf(LEARN[0].id)));
  if (!right) throw new Error("no right answer");
  await user.click(right);
  assert.equal(right.getAttribute("aria-pressed"), "true");
  assert.ok(screen.getByRole("img", { name: /Arena picture of answer/ }), "the picture shows the picked answer");
  await user.click(lock);
  assert.ok(screen.getByText("Right answer.", { exact: false }));
  assert.deepEqual(useProgressStore.getState().scores[LEARN[0].id], { seen: 1, right: 1 });
  assert.ok(screen.getByRole("img", { name: /green area shows the answer/ }));
});

test("number keys pick, Enter locks in, and Enter again goes to the next card", () => {
  open(`/mech/${LEARN[0].id}`);
  fireEvent.keyDown(window, { key: "1" });
  assert.equal(answers()[0].getAttribute("aria-pressed"), "true");
  fireEvent.keyDown(window, { key: "Enter" });
  assert.equal(useProgressStore.getState().rounds.mech.done, 1);
  // Next has the focus now, so Enter on it is a click.
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  assert.equal(where(), `/mech/${LEARN[1].id}`);
});

test("a chip goes to the first card of its mechanic", async () => {
  open(`/mech/${LEARN[0].id}`);
  const user = userEvent.setup();
  const chips = screen.getByRole("group", { name: "Go to a mechanic" });
  assert.equal(chips.querySelector('[aria-current="true"]')?.textContent, "Raw Steel");
  await user.click(screen.getByRole("button", { name: "Weapons" }));
  assert.equal(where(), "/mech/k-first-weapon");
});

test("a Timeline card answers with one click and shows the coming rows", async () => {
  open(`/next/${TIMELINE[0].id}`);
  const user = userEvent.setup();
  assert.ok(screen.getByRole("list", { name: "Fight timeline" }));
  assert.ok(screen.getAllByText("? ? ?").length > 0, "the names hide until the answer");
  const right = answers().find((b) => b.textContent?.includes(rightOf(TIMELINE[0].id)));
  if (!right) throw new Error("no right answer");
  await user.click(right);
  assert.equal(screen.queryAllByText("? ? ?").length, 0, "the names show after the answer");
  assert.equal(useProgressStore.getState().rounds.next.right, 1);
});

test("after the last card the round ends with the score, and Go again starts over", async () => {
  const last = TIMELINE[TIMELINE.length - 1];
  open(`/next/${last.id}`);
  const user = userEvent.setup();
  await user.click(answers()[0]);
  await user.click(screen.getByRole("button", { name: "Next" }));
  assert.equal(where(), "/next");
  assert.ok(screen.getByText("Round done"));
  await user.click(screen.getByRole("button", { name: "Go again" }));
  assert.equal(where(), `/next/${TIMELINE[0].id}`);
});
