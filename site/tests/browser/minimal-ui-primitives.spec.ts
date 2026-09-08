import { expect, test } from "@playwright/test";

test("context actions keep a visible tooltip, focus ring hook, and compact hit target", async ({ page }) => {
  await page.goto("/demo");
  const copy = page.getByLabel("Document actions").getByRole("button", { name: "Copy", exact: true });
  const tooltip = page.getByRole("tooltip", { name: "Copy" });

  await copy.hover();
  await expect(tooltip).toBeVisible();
  const box = await copy.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(32);
  expect(box!.height).toBeGreaterThanOrEqual(32);

  await copy.focus();
  await expect(copy).toBeFocused();
  await expect(tooltip).toBeVisible();
  await expect(copy).not.toHaveCSS("box-shadow", "none");
});

test("canonical Tabs and inline Choice own roving keyboard selection", async ({ page }) => {
  await page.goto("/demo");
  const tablist = page.getByRole("tablist", { name: "Demo and source files" });
  const demo = tablist.getByRole("tab", { name: "Demo", exact: true });
  await demo.focus();
  await demo.press("ArrowRight");
  const source = tablist.getByRole("tab", { name: "DocumentDemoRoute.tsx" });
  await expect(source).toBeFocused();
  await expect(source).toHaveAttribute("aria-selected", "true");

  await page.goto("/demo/selection");
  const replace = page.getByRole("radio", { name: "replace" });
  await replace.focus();
  await replace.press("ArrowRight");
  const extend = page.getByRole("radio", { name: "extend" });
  await expect(extend).toBeFocused();
  await expect(extend).toHaveAttribute("aria-checked", "true");
});
