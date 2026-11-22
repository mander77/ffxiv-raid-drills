// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, test, vi } from "vitest";
import { type FightKeyHandlers, useFightKeys } from "../../src/hooks/useFightKeys";

afterEach(cleanup);

function Screen(props: FightKeyHandlers) {
  useFightKeys(props);
  return (
    <>
      <button type="button">Play</button>
      <div role="dialog">
        <input aria-label="Seconds" />
      </div>
    </>
  );
}

test("Space plays or pauses", async () => {
  const onPlayPause = vi.fn();
  render(<Screen onPlayPause={onPlayPause} />);
  await userEvent.keyboard(" ");
  assert.equal(onPlayPause.mock.calls.length, 1);
});

test("the arrows move the clock 5 seconds back or on", async () => {
  const onSkip = vi.fn();
  render(<Screen onPlayPause={() => {}} onSkip={onSkip} />);
  await userEvent.keyboard("{ArrowLeft}{ArrowRight}");
  assert.deepEqual(onSkip.mock.calls, [[-5], [5]]);
});

test("Enter keeps its default when it did nothing", () => {
  render(<Screen onPlayPause={() => {}} onEnter={() => false} />);
  const e = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  document.body.dispatchEvent(e);
  assert.equal(e.defaultPrevented, false);
});

test("Enter is taken when it did something", () => {
  const onEnter = vi.fn(() => true);
  render(<Screen onPlayPause={() => {}} onEnter={onEnter} />);
  const e = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  document.body.dispatchEvent(e);
  assert.equal(onEnter.mock.calls.length, 1);
  assert.equal(e.defaultPrevented, true);
});

test("keys on a button, in a dialog or with Ctrl stay theirs", async () => {
  const onPlayPause = vi.fn();
  render(<Screen onPlayPause={onPlayPause} />);
  screen.getByRole("button", { name: "Play" }).focus();
  await userEvent.keyboard(" ");
  screen.getByRole("textbox", { name: "Seconds" }).focus();
  await userEvent.keyboard(" ");
  screen.getByRole("textbox", { name: "Seconds" }).blur();
  await userEvent.keyboard("{Control>} {/Control}");
  assert.equal(onPlayPause.mock.calls.length, 0);
});

test("without onSkip, the arrows do nothing", () => {
  render(<Screen onPlayPause={() => {}} />);
  const e = new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true });
  document.body.dispatchEvent(e);
  assert.equal(e.defaultPrevented, false);
});
