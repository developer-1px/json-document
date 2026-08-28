import { expect, test } from "@playwright/test";

test("Calendar app chrome fills the page without docs or workbench", async ({ page }) => {
  await page.goto("/demo/calendar");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Calendar", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Demo workbench" })).toHaveCount(0);
  await expect(page.getByRole("toolbar", { name: "Calendar" })).toBeVisible();
  await expect(page.getByRole("grid", { name: "Week" })).toBeVisible();

  const navigation = page.getByRole("navigation", { name: "Site navigation" });
  await expect(navigation.getByRole("button", { name: "Open navigation" })).toBeVisible();
  await expect(navigation.getByRole("group", { name: "Hands" })).toHaveCount(0);

  await navigation.getByRole("button", { name: "Open navigation" }).click();
  await expect(navigation.getByRole("group", { name: "Hands" })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Collapse navigation" })).toBeVisible();

  await navigation.getByRole("button", { name: "Collapse navigation" }).click();
  await expect(navigation.getByRole("group", { name: "Hands" })).toHaveCount(0);
  await expect(page.getByRole("toolbar", { name: "Calendar" })).toBeVisible();
});

test("Calendar month and year views show date grids", async ({ page }) => {
  await page.goto("/demo/calendar?view=month&date=2026-05-25");
  await expect(page.getByRole("grid", { name: "Month", exact: true })).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "2026-05-25", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Month", exact: true })).toBeChecked();

  await page.getByRole("radio", { name: "Year", exact: true }).click();
  await expect(page.getByRole("grid", { name: "2026-05", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/view=year/);
  await expect(page).toHaveURL(/date=2026-05-25/);
});

test("Calendar location writes one search snapshot and restores on back", async ({ page }) => {
  await page.goto("/demo/calendar?view=month&date=2026-05-25");
  await expect(page.getByRole("grid", { name: "Month", exact: true })).toBeVisible();

  await page.getByRole("radio", { name: "Week", exact: true }).click();
  await expect(page.getByRole("grid", { name: "Week", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/view=week/);
  await expect(page).toHaveURL(/date=2026-05-25/);

  await page.goBack();
  await expect(page.getByRole("grid", { name: "Month", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/view=month/);
});

test("Calendar invalid search falls back to the fixture week", async ({ page }) => {
  await page.goto("/demo/calendar?view=agenda&date=nope");
  await expect(page.getByRole("grid", { name: "Week", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Week", exact: true })).toBeChecked();
  await expect(page.getByText("2026-05-25 · week", { exact: true })).toBeVisible();
});

test("Calendar Usage embed does not write view search params", async ({ page }) => {
  await page.goto("/editors");
  const usage = page.locator('[data-live-demo="/demo/calendar"]');
  await expect(usage).toHaveCount(1);
  await usage.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await usage.getByRole("radio", { name: "Month", exact: true }).click();
  await expect(usage.getByRole("grid", { name: "Month", exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/view=/);
});
