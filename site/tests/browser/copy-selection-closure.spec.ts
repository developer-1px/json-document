import { expect, test, type Locator, type Page } from "@playwright/test";

test("code-like surfaces share contained Select All and model-backed copy", async ({ page }) => {
  await page.goto("/docs/adapter-clipboard");
  const docsCode = page.getByRole("figure", { name: "TypeScript" }).first().locator("pre");
  const docsText = await selectAllAndCopy(page, docsCode);
  expect(docsText).toContain("createWebClipboardSurface");

  await page.goto("/connectors/react");
  const install = page.getByRole("figure", { name: "Install command" }).locator("pre");
  const installText = await selectAllAndCopy(page, install);
  expect(installText).toContain("npm i ");
  expect(installText).not.toMatch(/^\$ /);

  await page.goto("/demo/annotation");
  await page.getByText("Annotation output", { exact: true }).click();
  const annotation = page.locator('pre[data-testid="annotation-structured-output"]');
  expect(JSON.parse(await selectAllAndCopy(page, annotation))).toMatchObject({
    annotations: expect.any(Array),
  });

  await page.goto("/editing/rich-text");
  const richTextCode = page.getByRole("region", { name: "Read-only Rich Text code projection" }).locator("pre");
  expect(await selectAllAndCopy(page, richTextCode)).toContain('{ "canonical": true }');
});

async function selectAllAndCopy(page: Page, surface: Locator): Promise<string> {
  await surface.click();
  await surface.press(process.platform === "darwin" ? "Meta+a" : "Control+a");
  await surface.press(process.platform === "darwin" ? "Meta+c" : "Control+c");
  return page.evaluate(() => navigator.clipboard.readText());
}
