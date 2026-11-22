// @vitest-environment happy-dom
// The icons page: every icon of icons.tsx is on it, so a new icon cannot be left off.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, assert, test } from "vitest";
import * as icons from "../../src/components/icons";
import { KINDS } from "../../src/components/MechanicIcon";
import { IconsPage } from "../../src/pages/IconsPage";

afterEach(cleanup);

/** The lucide class of an icon, "lucide-check" for the check mark: what tells two icons apart. */
function lucideClass(Icon: icons.LucideIcon): string {
  const { container } = render(<Icon />);
  const name = [...(container.querySelector("svg")?.classList ?? [])].find((c) => c.startsWith("lucide-"));
  cleanup();
  assert.ok(name, "an icon has a lucide- class");
  return name;
}

test("the icons page shows every icon of icons.tsx", () => {
  // TS note: Object.entries of a module gives each named export with its name. LucideIcon is only
  // a type, so it is not among them.
  const wanted = Object.entries(icons).map(([name, Icon]) => [name, lucideClass(Icon as icons.LucideIcon)]);
  const { container } = render(<IconsPage />);
  for (const [name, cls] of wanted) assert.ok(container.querySelector(`svg.${cls}`), `${name} is on the page`);
});

test("the icons page names every kind of mechanic and the boss's weapons", () => {
  render(<IconsPage />);
  for (const { name } of Object.values(KINDS)) assert.ok(screen.getByRole("heading", { name }));
  for (const name of ["Axe", "Scythe", "Sword"]) assert.ok(screen.getByRole("heading", { name }));
});
