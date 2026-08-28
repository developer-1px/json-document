import { expect, test } from "@playwright/test";

test("Calendar launch shows a week interval editor then month view", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  await expect(page.getByRole("grid", { name: "Week", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Create", exact: true }).click();
  const inspector = page.getByRole("region", { name: "Event" });
  await expect(inspector.getByRole("textbox", { name: "Title" })).toHaveValue("Event");
  const start = await inspector.getByLabel("Start", { exact: true }).inputValue();
  const end = await inspector.getByLabel("End", { exact: true }).inputValue();
  expect(start < end).toBe(true);

  await page.getByRole("radio", { name: "Month", exact: true }).click();
  await expect(page.getByRole("grid", { name: "Month", exact: true })).toBeVisible();
});
