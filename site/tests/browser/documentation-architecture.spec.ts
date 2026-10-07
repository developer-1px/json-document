import { expect, test } from "@playwright/test";

test("architecture connects a module to both its usages, source, and product", async ({page}) => {
  await page.goto("/docs/architecture");
  await expect(page.getByRole("heading", {level:1,name:"Architecture"})).toBeVisible();
  const content = page.locator('[data-doc-content]');
  const packages = await content.locator('a[href^="/docs/api/"]').evaluateAll(links => [...new Set(links.map(link => link.getAttribute("href")))]);
  expect(packages.length).toBe(35);
  await content.getByRole("link", {name:"Markdown React",exact:true}).first().click();
  await expect(page).toHaveURL(/\/docs\/api\/markdown-react$/);
  await expect(content.getByRole("heading", {name:"책임과 사용 경로"})).toBeVisible();
  await expect(content.getByRole("link", {name:"Bear",exact:true})).toHaveAttribute("href","/applications/bear");
  await expect(content.getByRole("link", {name:"Streaming Markdown",exact:true}).first()).toHaveAttribute("href","/demo/markdown");
  await content.getByRole("link", {name:"Markdown caret",exact:true}).first().click();
  await expect(page.getByRole("textbox", {name:"Markdown 편집"})).toBeVisible();
  await expect(page.getByRole("tablist", {name:"Demo and source files"})).toBeVisible();
  await page.getByRole("tab",{name:"MarkdownCaretRoute.tsx",exact:true}).click();
  await page.getByRole("tab",{name:"MarkdownEditingSurface.tsx",exact:true}).click();
  await expect(page.getByRole("link",{name:"API Reference",exact:true})).toHaveAttribute("href","/docs/api/markdown-react");
});

test("responsibility catalog exposes actual modules and previously hidden streaming usage", async ({page}, testInfo) => {
  await page.goto("/docs/connectors");
  const content = page.locator('[data-doc-content]');
  await expect(content.getByRole("link", {name:"Markdown React",exact:true})).toBeVisible();
  await expect(content.getByRole("link", {name:"Rich Text React",exact:true})).toBeVisible();
  const navigation = page.getByRole("navigation",{name:"Site navigation"});
  await expect(navigation.getByRole("link",{name:"Streaming Markdown",exact:true})).toBeVisible();
  await navigation.getByRole("link",{name:"Streaming Markdown",exact:true}).click();
  await expect(page).toHaveURL(/\/demo\/markdown$/);
  await page.setViewportSize({width:390,height:844});
  await page.goto("/docs/architecture");
  await expect(page.getByRole("heading",{level:1,name:"Architecture"})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto("/docs/architecture");
  await expect(page.getByRole("heading",{level:1,name:"Architecture"})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath("architecture.png"),fullPage:false});
});
