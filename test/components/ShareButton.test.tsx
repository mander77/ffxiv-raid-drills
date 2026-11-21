// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, assert, beforeEach, test, vi } from "vitest";
import { ShareButton } from "../../src/components/ShareButton";
import { Toaster } from "../../src/components/ui/sonner";

beforeEach(() => {
  // A desktop browser: no share sheet, so the link goes to the clipboard.
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn(async () => {}) }, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("copies the address and says so in a toast", async () => {
  render(
    <>
      <ShareButton />
      <Toaster />
    </>,
  );
  // TS note: act() lets React finish its work (here, the click and the copy) before the checks.
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
  });
  assert.ok(await screen.findByText("Link copied"));
  assert.ok(screen.getByRole("button", { name: "Share" }), "the button keeps its name");
});
