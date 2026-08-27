import { expect, test } from "@playwright/test";

const pages = [
  ["/editors", 6],
  ["/docs/topology", 1],
  ["/docs/selection", 1],
  ["/docs/clipboard", 1],
  ["/docs/history", 1],
  ["/docs/order", 1],
  ["/docs/object", 2],
  ["/docs/tree", 1],
  ["/docs/database", 1],
  ["/docs/ui-primitives", 1],
  ["/docs/adapter-keyboard", 1],
  ["/docs/adapter-clipboard", 1],
  ["/docs/adapter-virtual-selection", 1],
  ["/docs/adapter-contenteditable", 1],
  ["/docs/connector-react", 1],
  ["/docs/connector-react-hook-form", 1],
  ["/docs/connector-ajv", 1],
  ["/docs/connector-zod", 1],
  ["/docs/connector-zod-validate", 1],
  ["/docs/connector-tanstack-table", 1],
  ["/docs/react-editing", 1],
  ["/docs/collaboration", 1],
  ["/docs/affordance/select", 3],
  ["/docs/affordance/drag", 2],
  ["/docs/affordance/fold", 1],
  ["/docs/affordance/history", 1],
] as const;

test("every standalone demo is rendered through a Demo Bench inside its canonical document", async ({ page }) => {
  test.setTimeout(60_000);
  for (const [path, count] of pages) {
    await page.goto(path);
    await expect(page.locator("[data-live-demo]")).toHaveCount(count);
    await expect(page.getByRole("region", { name: /^Live demo:/ })).toHaveCount(count);
  }
});

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
