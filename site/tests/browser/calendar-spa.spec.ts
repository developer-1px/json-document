import { expect, test } from "@playwright/test";

test("Calendar Create and mini-month jump keep the current view", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  await expect(page.getByRole("grid", { name: "Week", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("region", { name: "Event" }).getByRole("textbox", { name: "Title" })).toHaveValue("Event");
  await expect(page.getByRole("grid", { name: "Week", exact: true }).getByRole("button", { name: "Event", exact: true })).toBeVisible();

  await page.getByRole("region", { name: "Jump to date" }).getByRole("button", { name: "2026-05-26", exact: true }).click();
  await expect(page.getByRole("grid", { name: "Week", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/view=week/);
  await expect(page).toHaveURL(/date=2026-05-26/);
});

test("Calendar c hotkey creates a timed event on the visible date", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  await page.getByRole("toolbar", { name: "Calendar" }).click();
  await page.keyboard.press("c");
  await expect(page.getByRole("region", { name: "Event" }).getByRole("textbox", { name: "Title" })).toHaveValue("Event");
});
