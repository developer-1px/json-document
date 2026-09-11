import { expect, test } from "@playwright/test";

test("URL Usage consumes the public policies and links to the owner documentation", async ({page}) => {
  await page.goto("/demo/document-url");
  const input = page.getByRole("textbox", {name:"문서 URL"});
  await expect(input).toHaveValue("notes/page");
  await expect(page.getByLabel("일반 링크", {exact:true})).toHaveText("notes/page");
  await expect(page.getByLabel("Rich Text 링크", {exact:true})).toHaveText("거절");
  await input.fill("mailto:a@example.test");
  await expect(page.getByLabel("이미지", {exact:true})).toHaveText("거절");
  await expect(page.getByLabel("Rich Text 링크", {exact:true})).toHaveText("mailto:a@example.test");
  await input.fill("javascript:alert(1)");
  for (const name of ["일반 링크","이미지","Rich Text 링크"]) await expect(page.getByLabel(name, {exact:true})).toHaveText("거절");
  await input.fill("../notes");
  for (const name of ["일반 링크","이미지","Rich Text 링크"]) await expect(page.getByLabel(name, {exact:true})).toHaveText("../notes");
  await page.screenshot({path:test.info().outputPath("url-usage.png")});
  await page.goto("/docs/api/document-url");
  await expect(page.locator("[data-doc-content]")).toContainText("resolveDocumentURL(value:");
  await expect(page.locator("[data-doc-content]")).toContainText("controlCharacters");
});
