// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, assert, test } from "vitest";
import { Header } from "../../src/components/Header";
import { ThemeProvider } from "../../src/components/ThemeProvider";
import { TooltipProvider } from "../../src/components/ui/tooltip";

afterEach(cleanup);

test("the site name goes back to Home", async () => {
  render(
    <MemoryRouter initialEntries={["/sheet"]}>
      <ThemeProvider>
        <TooltipProvider>
          <Header />
          <Routes>
            <Route path="/" element={<p>Home page</p>} />
            <Route path="/sheet" element={<p>Cheat sheet page</p>} />
          </Routes>
        </TooltipProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
  const title = screen.getByRole("link", { name: "FFXIV Raid Drills" });
  assert.equal(title.getAttribute("href"), "/");
  await userEvent.setup().click(title);
  assert.ok(screen.getByText("Home page"));
});

test("the header names the fight and the strats the positions follow", () => {
  render(
    <MemoryRouter>
      <ThemeProvider>
        <TooltipProvider>
          <Header />
        </TooltipProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
  const list = screen.getByRole("list", { name: "Fight and strats" });
  const tags = within(list)
    .getAllByRole("listitem")
    .map((li) => li.textContent);
  assert.deepEqual(tags, ["M11S The Tyrant (Savage)", "Hector/Toxic", "Kindred No Buddies split", "Fixed (3CJ) Ecliptic"]);
});
