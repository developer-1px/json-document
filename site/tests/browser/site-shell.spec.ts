import { expect, test, type Page } from "@playwright/test";

test("official overview exposes the product hierarchy", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "json-document" })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Site navigation" });
  await expect(navigation.getByRole("group", { name: "Start" }).getByRole("link")).toHaveText(["Overview", "Quickstart"]);
  await expect(navigation.getByRole("group", { name: "Core" }).getByRole("link")).toHaveText(["Concepts", "API Reference"]);
  await expect(navigation.getByRole("group", { name: "Editing" }).getByRole("link")).toHaveText(["Document", "Sheet", "Selection Lab"]);
  await expect(navigation.getByRole("group", { name: "Connectors" }).getByRole("link")).toHaveText(["Overview", "React", "Zod", "TanStack Table"]);
  await expect(navigation.getByRole("link", { name: "Connector guide" })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Workbench" })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Extensions" })).toHaveCount(0);
  expect(requests.some(isLegacyRequest)).toBe(false);
});

test("mobile navigation preserves product and documentation groups", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const siteNavigation = page.getByRole("navigation", { name: "Site navigation" });
  await expect(siteNavigation.getByRole("group", { name: "Start" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "Core" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "Editing" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "Connectors" })).toBeVisible();

  await page.goto("/docs/tutorial");
  const docsNavigation = page.getByRole("navigation", { name: "Documentation pages" });
  await expect(docsNavigation.getByRole("group", { name: "Start" })).toBeVisible();
  await expect(docsNavigation.getByRole("group", { name: "Core" })).toBeVisible();
  await expect(docsNavigation.getByRole("group", { name: "Connectors" })).toBeVisible();
  await expect(docsNavigation.getByRole("link", { name: "Quickstart" })).toHaveAttribute("aria-current", "page");
});

test("official docs routes render with route metadata in a real browser", async ({ page }) => {
  await page.goto("/docs");

  await expect(page).toHaveTitle("json-document Docs - json-document");
  await expect(page.getByRole("heading", { level: 1, name: "json-document Docs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "배경" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Documentation pages" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();

  const docsNavigation = page.getByRole("navigation", { name: "Documentation pages" }).first();
  await expect(docsNavigation.getByRole("group", { name: "Start" }).getByRole("link")).toHaveText(["Quickstart"]);
  await expect(docsNavigation.getByRole("group", { name: "Core" }).getByRole("link")).toHaveText(["Concepts", "API Reference"]);
  await expect(docsNavigation.getByRole("group", { name: "Connectors" }).getByRole("link")).toHaveText(["Connector guide"]);

  await docsNavigation.getByRole("link", { name: "Connector guide" }).click();
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
    docsNavTop: 16,
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
    const docsNav = document.querySelector('nav[aria-label="Documentation pages"]');

    return {
      windowScrollY: Math.round(window.scrollY),
      mainOverflowY: main ? getComputedStyle(main).overflowY : null,
      siteNavTop: siteNav ? Math.round(siteNav.getBoundingClientRect().top) : null,
      docsNavTop: docsNav ? Math.round(docsNav.getBoundingClientRect().top) : null,
    };
  });
}
