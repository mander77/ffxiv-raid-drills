// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
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
