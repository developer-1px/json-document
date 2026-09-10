import { expect, test } from "@playwright/test";

for (const { route, entry, owner } of [
  { route: "/demo/order", entry: "OrderDemoRoute.tsx", owner: "order.ts" },
  { route: "/demo/tree", entry: "TreeDemoRoute.tsx", owner: "tree.ts" },
  { route: "/demo/sheet", entry: "SheetDemoRoute.tsx", owner: "sheet.ts" },
  { route: "/demo", entry: "DocumentDemoRoute.tsx", owner: "document.ts" },
]) {
  test(`${route} Usage links select-all to its canonical owner`, async ({ page }) => {
    await page.goto(route);
    const workbench = page.getByRole("region", { name: "Demo workbench" });
    await workbench.getByRole("tab", { name: entry, exact: true }).click();
    await workbench.getByRole("tab", { name: owner, exact: true }).click();
    await expect(workbench.getByRole("tabpanel").locator("pre")).toContainText('"selection.select-all"');
    await expect(workbench.getByRole("link", { name: "API Reference" })).toHaveAttribute("href", "/docs/api/editing");
    await workbench.getByRole("tab", { name: "select.ts", exact: true }).click();
    await expect(workbench.getByRole("tabpanel").locator("pre")).toContainText('"preserve"');
  });
}

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
  await expect(workbench.getByRole("tab", { name: "clipboard.ts" })).toBeVisible();
  await expect(workbench.locator('[data-source-highlighter="shiki"]')).toBeVisible();
  await expect(source.locator('span[style*="color"]').first()).toBeVisible();

  await workbench.getByRole("tab", { name: "clipboard.ts" }).click();
  await expect(workbench.getByRole("link", { name: "API Reference" })).toHaveAttribute("href", "/docs/api/web");

  await tabs.nth(0).click();
  await expect(page.locator('article[data-block-id="welcome"]')).toHaveAttribute("data-selected", "true");
});

test("shows every demo-owned database file as a source tab", async ({ page }) => {
  await page.goto("/demo/database");

  const tablist = page.getByRole("tablist", { name: "Demo and source files" });
  await expect(tablist.getByRole("tab")).toHaveText(["Demo", "DatabaseDemoRoute.tsx"]);
  await tablist.getByRole("tab", { name: "DatabaseDemoRoute.tsx" }).click();
  await expect(tablist.getByRole("tab")).toHaveText([
    "Demo",
    "DatabaseDemoRoute.tsx",
    "DatabaseTableDemo.tsx",
    "initial-database.ts",
    "product-shell.tsx",
    "database-hand.tsx",
    "database-property-control.tsx",
    "database-property-value.ts",
    "input-controls.tsx",
    "database-view-controls.tsx",
    "controls.tsx",
    "keyboard.ts",
    "toolbar.tsx",
    "clipboard.ts",
    "database.ts",
    "serializable.ts",
    "topology.ts",
    "grid-cell.ts",
    "surfaces.tsx",
    "pointer-session.ts",
    "interaction-handle.ts",
  ]);
});

test("keeps documentation above the sticky product workbench", async ({ page }) => {
  await page.goto("/demo");

  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  const pageHeader = page.locator("[data-page-header]");
  const workbench = page.getByRole("region", { name: "Demo workbench" });
  const tablist = page.getByRole("tablist", { name: "Demo and source files" });
  const initialBreadcrumb = await breadcrumb.boundingBox();
  const initialHeader = await pageHeader.boundingBox();
  const initialTabs = await tablist.boundingBox();
  expect(initialBreadcrumb).not.toBeNull();
  expect(initialHeader).not.toBeNull();
  expect(initialTabs).not.toBeNull();
  expect(initialBreadcrumb!.y + initialBreadcrumb!.height).toBeLessThanOrEqual(initialHeader!.y);
  expect(initialHeader!.y + initialHeader!.height).toBeLessThanOrEqual(initialTabs!.y);
  await expect(page.locator("[data-page-header] >> nav[aria-label='Breadcrumb']")).toHaveCount(0);
  await expect(workbench.getByRole("heading", { name: "Document" })).toHaveCount(0);
  await expect(workbench.locator("[data-page-header]")).toHaveCount(0);

  await tablist.getByRole("tab", { name: "DocumentDemoRoute.tsx" }).click();
  await expect(page.getByText("routes/document-demo/DocumentDemoRoute.tsx")).toBeVisible();
  await expect(workbench.getByRole("tabpanel").locator("pre")).toContainText("export function DocumentDemoRoute()");
  await page.evaluate(() => window.scrollTo(0, 900));
  const stickyTabs = await tablist.boundingBox();
  expect(stickyTabs).not.toBeNull();
  expect(stickyTabs!.y).toBeLessThanOrEqual(9);
});
