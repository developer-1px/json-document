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
