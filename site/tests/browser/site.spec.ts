import { expect, test, type Page } from "@playwright/test";

test("official overview exposes the v3 documentation and editing demo", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "json-document" })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Site navigation" });
  await expect(navigation.getByRole("link", { name: "Docs" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Quickstart" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "API reference" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Demo" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Workbench" })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Extensions" })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Recipes" })).toHaveCount(0);
  expect(requests.some(isLegacyRequest)).toBe(false);
});

test("minimal document demo completes selection, clipboard, edit, move, undo, and redo", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1, name: "Document demo" })).toBeVisible();

  const surface = page.getByRole("region", { name: "Editable document" }).locator('[tabindex="0"]');
  await surface.focus();
  await surface.press("ArrowDown");
  await expect(page.locator('article[data-block-id="select"]')).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { name: "Select block 1" }).click();
  await page.getByRole("button", { name: "Select block 2" }).click({ modifiers: ["Meta"] });
  await expect(page.getByText("2 selected", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Copy", exact: true }).click();

  await page.getByRole("button", { name: "Select block 4" }).click();
  await page.getByRole("button", { name: "Paste", exact: true }).click();
  await expect(page.locator("article[data-selected=true]")).toHaveCount(2);
  await expect(page.getByRole("textbox", { name: "Block 6 text" })).toHaveValue(/Shift-click/);

  await page.getByRole("textbox", { name: "Block 5 text" }).fill("한글 편집도 같은 transaction을 사용합니다.");
  await page.getByRole("button", { name: "Select block 5" }).click();
  await page.getByRole("button", { name: "Select block 6" }).click({ modifiers: ["Meta"] });
  await page.getByRole("button", { name: "Move up" }).click();

  const moved = await canonicalDocument(page);
  expect(moved.blocks.map((block) => block.id)).toEqual(["welcome", "select", "clipboard", "block-1", "block-2", "json"]);

  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("article[data-selected=true]")).toHaveCount(2);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("article[data-selected=true]")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(4);

  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  const redone = await canonicalDocument(page);
  expect(redone.blocks).toHaveLength(6);
  expect(redone.blocks.find((block) => block.id === "block-1")?.text).toBe("한글 편집도 같은 transaction을 사용합니다.");
  await expect(page.locator("article[data-selected=true]")).toHaveCount(2);
});

test("official docs routes render with route metadata in a real browser", async ({ page }) => {
  await page.goto("/docs");

  await expect(page).toHaveTitle("json-document Docs - json-document");
  await expect(page.getByRole("heading", { level: 1, name: "json-document Docs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "배경" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Documentation pages" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();

  await page.getByRole("link", { name: "API reference" }).first().click();
  await expect(page).toHaveTitle("json-document API - json-document");
  await expect(page.getByRole("heading", { level: 1, name: "json-document API" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
});

test("official site uses window scroll with sticky desktop navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/docs/api");
  await expect(page.getByRole("heading", { level: 1, name: "json-document API" })).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 1200));

  await expect.poll(() => scrollSnapshot(page)).toMatchObject({
    windowScrollY: 1200,
    mainOverflowY: "visible",
    siteNavTop: 0,
    docsNavTop: 16,
  });

  await page.getByRole("link", { name: "Overview" }).click();
  await expect(page).toHaveTitle("json-document - Headless JSON editing");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

function isLegacyRequest(url: string): boolean {
  return [
    "/src/playgrounds/",
    "/apps/outliner/src/",
    "/apps/mobile-cms/src/",
    "/packages/json-document/src/application/react-document/index.ts",
    "/packages/json-document/src/application/session/index.ts",
  ].some((part) => url.includes(part));
}

async function scrollSnapshot(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector("#main-content");
    const siteNav = document.querySelector('nav[aria-label="Site navigation"]');
    const docsNav = document.querySelector('nav[aria-label="Documentation pages"]');

    return {
      windowScrollY: Math.round(window.scrollY),
      mainOverflowY: main ? getComputedStyle(main).overflowY : null,
      siteNavTop: siteNav ? Math.round(siteNav.getBoundingClientRect().top) : null,
      docsNavTop: docsNav ? Math.round(docsNav.getBoundingClientRect().top) : null,
    };
  });
}

async function canonicalDocument(page: Page): Promise<{ blocks: Array<{ id: string; text: string }> }> {
  return JSON.parse(await page.getByTestId("canonical-json").innerText()) as { blocks: Array<{ id: string; text: string }> };
}
