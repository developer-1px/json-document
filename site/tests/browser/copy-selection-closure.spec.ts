import { expect, test, type Locator, type Page } from "@playwright/test";

// One representative code surface; every code-like surface shares this select-all/copy closure.
test("code surfaces contain Select All and copy their model text", async ({ page }) => {
  await page.goto("/docs/adapter-clipboard");
  const docsCode = page.getByRole("figure", { name: "TypeScript" }).first().locator("pre");
  const docsText = await selectAllAndCopy(page, docsCode);
  expect(docsText).toContain("createWebClipboardSurface");
});

async function selectAllAndCopy(page: Page, surface: Locator): Promise<string> {
  await surface.click();
  await surface.press(process.platform === "darwin" ? "Meta+a" : "Control+a");
  await surface.press(process.platform === "darwin" ? "Meta+c" : "Control+c");
  return page.evaluate(() => navigator.clipboard.readText());
}
