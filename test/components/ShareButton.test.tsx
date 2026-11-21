// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, assert, beforeEach, test, vi } from "vitest";
import { ShareButton } from "../../src/components/ShareButton";

beforeEach(() => {
  // A desktop browser: no share sheet, so the link goes to the clipboard.
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn(async () => {}) }, configurable: true });
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("copies the address, says so for two seconds, then says Share again", async () => {
  render(<ShareButton />);
  // TS note: act() lets React finish its work (here, the click and the copy) before the checks.
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
  });
  assert.ok(screen.getByText("Link copied"));
  await act(async () => {
    vi.advanceTimersByTime(2000);
  });
  assert.ok(screen.getByText("Share"));
});
