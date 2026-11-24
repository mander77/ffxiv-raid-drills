// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, beforeEach, test, vi } from "vitest";
import { ModeToggle } from "../../src/components/ModeToggle";
import { ThemeProvider } from "../../src/components/ThemeProvider";

/** A computer set to light or dark mode. */
function systemMode(dark: boolean): void {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("dark") && dark,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("with nothing picked, the page follows the computer's mode", () => {
  systemMode(true);
  render(
    <ThemeProvider>
      <ModeToggle />
    </ThemeProvider>,
  );
  assert.isTrue(document.documentElement.classList.contains("dark"));
});

test("picking Light or Dark sets the page's mode and keeps it in the browser", async () => {
  systemMode(true);
  render(
    <ThemeProvider>
      <ModeToggle />
    </ThemeProvider>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Light or Dark Mode" }));
  await user.click(screen.getByRole("menuitem", { name: "Light" }));
  assert.isTrue(document.documentElement.classList.contains("light"));
  assert.isFalse(document.documentElement.classList.contains("dark"));
  assert.equal(localStorage.getItem("raid-drills-theme"), "light");
});
