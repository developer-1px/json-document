import { expect, test } from "@playwright/test";

test("an embedded demo stays interactive and exposes its source", async ({ page }) => {
  await page.goto("/docs/selection");
  const liveDemo = page.locator('[data-live-demo="/demo/selection"]');
  await liveDemo.scrollIntoViewIfNeeded();
  await expect(liveDemo.getByRole("tablist", { name: "Demo and source files" })).toBeVisible();

  await liveDemo.getByRole("button", { name: /bravo · Middle/ }).click();
  await expect(liveDemo.getByTestId("selection-demo-selection")).toContainText("bravo");

  await liveDemo.getByRole("tab", { name: "SelectionDemoRoute.tsx" }).click();
  await expect(liveDemo.getByText("routes/editing-demos/SelectionDemoRoute.tsx")).toBeVisible();
  await expect(liveDemo.locator('[role="tabpanel"]:visible').getByText(/export function SelectionDemoRoute/)).toBeVisible();
  await expect(liveDemo.locator('[data-source-highlighter="shiki"]')).toBeVisible();
  await expect(liveDemo.getByRole("figure", { name: "TSX" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Selection Demo 열기" })).toHaveCount(0);
});
