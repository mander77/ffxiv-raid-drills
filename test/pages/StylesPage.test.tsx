// @vitest-environment happy-dom
// The styles page: every icon of icons.tsx is on it, so a new icon cannot be left off.
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, test } from "vitest";
import * as icons from "../../src/components/icons";
import { KINDS } from "../../src/components/MechanicIcon";
import { StylesPage } from "../../src/pages/StylesPage";

afterEach(cleanup);

/** The lucide class of an icon, "lucide-check" for the check mark: what tells two icons apart. */
function lucideClass(Icon: icons.LucideIcon): string {
  const { container } = render(<Icon />);
  const name = [...(container.querySelector("svg")?.classList ?? [])].find((c) => c.startsWith("lucide-"));
  cleanup();
  assert.ok(name, "an icon has a lucide- class");
  return name;
}

test("the styles page shows every icon of icons.tsx", () => {
  // TS note: Object.entries of a module gives each named export with its name. LucideIcon is only
  // a type, so it is not among them.
  const wanted = Object.entries(icons).map(([name, Icon]) => [name, lucideClass(Icon as icons.LucideIcon)]);
  const { container } = render(<StylesPage />);
  for (const [name, cls] of wanted) assert.ok(container.querySelector(`svg.${cls}`), `${name} is on the page`);
});

test("the styles page shows how an answer looks, with the site's own components", () => {
  render(<StylesPage />);
  for (const name of ["Answers before you answer", "Answers after you answer", "Prompt bar", "Last answer", "Steps", "Rule", "Tally"])
    assert.ok(screen.getByRole("heading", { name }));
  assert.ok(screen.getByRole("button", { name: /Your incorrect pick.*Your pick/ }));
  assert.ok(screen.getByRole("list", { name: "Steps" }));
});

test("the styles page names every kind of mechanic and the boss's weapons", () => {
  render(<StylesPage />);
  for (const { name } of Object.values(KINDS)) assert.ok(screen.getByRole("heading", { name }));
  for (const name of ["Axe", "Scythe", "Sword"]) assert.ok(screen.getByRole("heading", { name }));
});

test("a click on an icon's card opens it zoomed in, in a dialog named after it", async () => {
  render(<StylesPage />);
  await userEvent.click(screen.getByRole("button", { name: "Wild Charge" }));
  const dialog = screen.getByRole("dialog", { name: "Wild Charge" });
  assert.ok(dialog.querySelector("svg.lucide-wild-charge"));
});
