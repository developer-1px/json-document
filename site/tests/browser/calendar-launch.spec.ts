import { expect, test } from "@playwright/test";

test("Calendar launch shows a week interval editor then month view", async ({ page }) => {
  await page.goto("/demo/calendar?view=week&date=2026-05-25");
  await expect(page.getByRole("grid", { name: "Week", exact: true })).toBeVisible();

  await page.getByLabel("Calendar contextual actions", { exact: true }).focus();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const inspector = page.getByRole("region", { name: "Event" });
  const title = inspector.getByRole("textbox", { name: "Title" });
  await expect(title).toHaveValue("Event");
  await expect(title).toBeFocused();
  await title.fill("Planning");
  const start = await inspector.getByLabel("Start", { exact: true }).inputValue();
  const end = await inspector.getByLabel("End", { exact: true }).inputValue();
  expect(start < end).toBe(true);
  await title.press("Enter");
  await expect(page.getByRole("button", { name: "Planning", exact: true })).toBeVisible();
  await expect(inspector).toBeVisible();

  await page.getByLabel("Calendar contextual actions", { exact: true }).focus();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(title).toHaveValue("Event");
  await expect(title).toBeFocused();
  await title.press("Escape");
  await expect(page.getByRole("button", { name: "Event", exact: true })).toHaveCount(0);

  await page.getByLabel("Calendar contextual actions", { exact: true }).focus();
  await page.getByRole("radio", { name: "Month", exact: true }).click();
  await expect(page.getByRole("grid", { name: "Month", exact: true })).toBeVisible();
});
