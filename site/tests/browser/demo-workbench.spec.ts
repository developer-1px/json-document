import { expect, test } from "@playwright/test";

test("switches between the live demo and its actual full source without resetting demo state", async ({ page }) => {
  await page.goto("/demo");

  const workbench = page.getByRole("region", { name: "Demo workbench" });
  const tabs = workbench.getByRole("tab");
  await expect(tabs).toHaveCount(2);
  await expect(tabs.nth(0)).toHaveText("Demo");
  await expect(tabs.nth(1)).toHaveText("DocumentDemoRoute.tsx");

  await page.getByRole("button", { name: "Select block 1" }).click();
  await expect(page.locator('article[data-block-id="welcome"]')).toHaveAttribute("data-selected", "true");

  await tabs.nth(1).click();
  await expect(workbench.getByText("routes/document-demo/DocumentDemoRoute.tsx")).toBeVisible();
  const source = workbench.getByRole("tabpanel").locator("pre");
  await expect(source).toContainText("export function DocumentDemoRoute()");
  await expect(source).toContainText('from "@interactive-os/json-document-react"');

  await tabs.nth(0).click();
  await expect(page.locator('article[data-block-id="welcome"]')).toHaveAttribute("data-selected", "true");
});

test("shows every demo-owned database file as a source tab", async ({ page }) => {
  await page.goto("/demo/database");

  const tablist = page.getByRole("tablist", { name: "Demo and source files" });
  await expect(tablist.getByRole("tab")).toHaveText([
    "Demo",
    "DatabaseDemoRoute.tsx",
    "DatabaseTableDemo.tsx",
    "initial-database.ts",
  ]);
});
