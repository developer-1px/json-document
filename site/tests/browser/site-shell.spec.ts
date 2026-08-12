import { expect, test, type Page } from "@playwright/test";

test("official overview exposes the product hierarchy", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "json-document" })).toBeVisible();
  await expect(page.getByText("One JSON document. Any editor.")).toBeVisible();
  await expect(page.getByRole("img", { name: "A small cat struggling to press an oversized Enter key." })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Site navigation" });
  await expect(navigation.getByRole("group", { name: "Start" }).getByRole("link")).toHaveText(["Overview", "Quickstart"]);
  await expect(navigation.getByRole("group", { name: "Core" }).getByRole("link")).toHaveText(["Concepts", "API Reference"]);
  await expect(navigation.getByRole("group", { name: "Editing" }).getByRole("link")).toHaveText(["Document", "Sheet", "Selection Lab", "Database"]);
  await expect(navigation.getByRole("group", { name: "Connectors" }).getByRole("link")).toHaveText(["Overview", "Connector guide", "React", "Zod", "TanStack Table", "Web Platform"]);
  await expect(navigation.getByRole("link", { name: "Workbench" })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Extensions" })).toHaveCount(0);
  expect(requests.some(isLegacyRequest)).toBe(false);
});

test("mobile navigation preserves the product groups without duplicating documentation pages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const siteNavigation = page.getByRole("navigation", { name: "Site navigation" });
  await expect(siteNavigation.getByRole("group", { name: "Start" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "Core" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "Editing" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "Connectors" })).toBeVisible();

  await page.goto("/docs/tutorial");
  await expect(page.getByRole("navigation", { name: "Documentation pages" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Documentation sections" })).toBeVisible();
  await expect(siteNavigation.getByRole("link", { name: "Quickstart" })).toHaveAttribute("aria-current", "page");
});

test("official docs routes render with route metadata in a real browser", async ({ page }) => {
  await page.goto("/docs");

  await expect(page).toHaveTitle("json-document Docs - json-document");
  await expect(page.getByRole("heading", { level: 1, name: "json-document Docs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "배경" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Documentation pages" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();

  const siteNavigation = page.getByRole("navigation", { name: "Site navigation" });
  await siteNavigation.getByRole("group", { name: "Connectors" }).getByRole("link", { name: "Connector guide" }).click();
  await expect(page).toHaveTitle("Connector Docs - json-document");
  await expect(page.getByRole("heading", { level: 1, name: "json-document Connectors" })).toBeVisible();

  await page.getByRole("link", { name: "API Reference" }).first().click();
  await expect(page).toHaveTitle("json-document API - json-document");
  await expect(page.getByRole("heading", { level: 1, name: "json-document API" })).toBeVisible();
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
    pageOutlineTop: 16,
    pageOutlineSide: "right",
  });

  await page.getByRole("navigation", { name: "Site navigation" })
    .getByRole("group", { name: "Start" })
    .getByRole("link", { name: "Overview" })
    .click();
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
    const pageOutline = document.querySelector('nav[aria-label="On this page"]');
    const documentContent = document.querySelector("main > div > div");
    const outlineRect = pageOutline?.getBoundingClientRect();
    const contentRect = documentContent?.getBoundingClientRect();

    return {
      windowScrollY: Math.round(window.scrollY),
      mainOverflowY: main ? getComputedStyle(main).overflowY : null,
      siteNavTop: siteNav ? Math.round(siteNav.getBoundingClientRect().top) : null,
      pageOutlineTop: pageOutline ? Math.round(pageOutline.getBoundingClientRect().top) : null,
      pageOutlineSide: outlineRect && contentRect && outlineRect.left >= contentRect.right ? "right" : "overlap",
    };
  });
}
