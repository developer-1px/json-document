import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1366, height: 900 } });

const representativeRoutes = [
  "/",
  "/docs",
  "/docs/api/ui-primitives-react",
  "/demo/order",
  "/demo/sheet",
  "/demo/annotation",
  "/demo/ui-primitives",
  "/viewer",
  "/connectors/react",
  "/widgets/toolbar",
] as const;

test("role-first design remains stable across the site route families", async ({ page }) => {
  for (const path of representativeRoutes) {
    await page.goto(path);
    await expect(page.locator("#main-content")).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("Demo chrome and selection use quiet, separated state grammar", async ({ page }) => {
  await page.goto("/demo/order");

  const pageHeader = page.locator("[data-page-header]");
  const workbench = page.getByRole("region", { name: "Demo workbench" });
  const tabs = workbench.getByRole("tablist", { name: "Demo and source files" });
  const expand = workbench.getByRole("button", { name: "Expand demo" });
  const selected = workbench.locator('[data-ui-control="selectable"][data-selected="true"]').first();
  const [headerBox, workbenchBox, tabsBox, expandBox] = await Promise.all([
    pageHeader.boundingBox(),
    workbench.boundingBox(),
    tabs.boundingBox(),
    expand.boundingBox(),
  ]);
  expect(headerBox).not.toBeNull();
  expect(workbenchBox).not.toBeNull();
  expect(tabsBox).not.toBeNull();
  expect(expandBox).not.toBeNull();
  expect(workbenchBox!.y - (headerBox!.y + headerBox!.height)).toBeGreaterThanOrEqual(24);
  expect(Math.abs((tabsBox!.y + tabsBox!.height / 2) - (expandBox!.y + expandBox!.height / 2))).toBeLessThanOrEqual(2);

  await expect(selected).toBeVisible();
  await selected.click();
  const state = await selected.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, border: style.borderColor, outline: style.outlineColor, boxShadow: style.boxShadow };
  });
  expect(state.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(state.border).not.toBe("rgb(222, 109, 85)");
  expect(state.outline).toBe("rgba(0, 0, 0, 0)");
  expect(state.boxShadow).toContain("inset");
});
