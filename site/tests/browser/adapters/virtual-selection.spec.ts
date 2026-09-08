import { expect, test } from "@playwright/test";

test("Virtual Selection keeps a native mounted Range and copies the complete model", async ({ page }) => {
  await page.goto("/adapters/virtual-selection");
  const surface = page.getByTestId("virtual-selection-surface");
  await expect(surface.locator("[data-row-index]")).toHaveCount(2);
  await expect(page.getByTestId("virtual-selection-model-size")).toHaveText("349,999 model characters");

  await surface.click();
  await page.keyboard.press("ControlOrMeta+A");
  const selected = await page.evaluate(() => window.getSelection()?.toString() ?? "");
  expect(selected).toContain("Model row 0001");
  expect(selected).toContain("Model row 5000");
  expect(selected).not.toContain("Model row 2500");

  await page.keyboard.press("ControlOrMeta+C");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toHaveLength(349_999);
  expect(copied).toContain("Model row 2500");

  const nested = page.getByTestId("virtual-selection-contained");
  await nested.click();
  await page.keyboard.press("ControlOrMeta+A");
  expect(await page.evaluate(() => window.getSelection()?.toString() ?? "")).toBe("nested code mounted");
  await page.keyboard.press("ControlOrMeta+C");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("nested code model\nsecond logical line");
});
