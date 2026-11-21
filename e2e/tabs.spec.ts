// Every tab opens from the header, in every browser, with no errors on the page.
import { expect, test } from "@playwright/test";
import { TABS } from "../src/tabs";

test("each tab opens from the header", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  const tabs = page.getByRole("navigation", { name: "Tabs" });
  for (const t of TABS) {
    await tabs.getByRole("link", { name: t.label, exact: true }).click();
    // The link of the tab you are on is marked, and its screen shows.
    await expect(tabs.getByRole("link", { name: t.label, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("main:visible")).not.toBeEmpty();
    // Every tab but Home starts with its one-line intro.
    if (t.id !== "home") await expect(page.getByText(t.lede).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("the Group switch changes the slot on the Cheat sheet", async ({ page }) => {
  await page.goto("/sheet");
  await expect(page.getByRole("heading", { name: "Your timeline as H1" })).toBeVisible();
  await page.getByRole("radio", { name: "2" }).click();
  await expect(page.getByRole("heading", { name: "Your timeline as H2" })).toBeVisible();
  // The slot stays after a reload.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your timeline as H2" })).toBeVisible();
});
