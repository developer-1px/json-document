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

test("docs and demos share the page frame while preserving their content modes", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  await page.goto("/docs");
  const docsFrame = await pageFrameSnapshot(page);
  await expect(page.locator("[data-page-header]")).toHaveCount(1);
  await expect(page.locator("[data-petite-cat]")).toHaveCount(1);

  await page.goto("/docs/api");
  await expect(page.locator('[data-petite-cat="braces"]')).toHaveCount(1);

  await page.goto("/demo");
  const demoFrame = await pageFrameSnapshot(page);
  await expect(page.locator("[data-page-header]")).toHaveCount(1);

  expect(docsFrame).toEqual(demoFrame);
  expect(demoFrame.width).toBeGreaterThan(1000);
});

test("ordinary pages reuse one petite decorative cat without covering intro copy", async ({ page }) => {
  const illustrations = new Set<string>();
  const routes = [
    "/docs",
    "/docs/tutorial",
    "/docs/connectors",
    "/docs/api",
    "/demo",
    "/demo/sheet",
    "/demo/selection",
    "/demo/database",
    "/connectors",
    "/connectors/react",
    "/connectors/web",
    "/connectors/zod",
    "/connectors/tanstack-table",
  ];

  for (const route of routes) {
    await page.goto(route);
    const artwork = page.locator("[data-petite-cat]");
    await expect(artwork).toHaveCount(1);
    illustrations.add(await artwork.getAttribute("data-petite-cat") ?? "");
    await expect(artwork.locator("img")).toHaveAttribute("alt", "");
    expect(await petiteCatLayout(page)).toMatchObject({
      artworkLongEdge: 192,
      imageLoaded: true,
      overlapsCopy: false,
      pageOverflow: false,
    });
  }
  expect([...illustrations].sort()).toEqual(["braces", "cursor", "peek", "sleep"]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  await expect(page.locator("[data-petite-cat]")).toHaveCount(1);
  expect(await petiteCatLayout(page)).toMatchObject({
    artworkLongEdge: 112,
    imageLoaded: true,
    overlapsCopy: false,
    pageOverflow: false,
  });
});

test("code blocks preserve source whitespace with a compact visual rhythm", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/docs/tutorial");

  const block = page.getByRole("figure", { name: "TypeScript" }).first();
  await expect(block).toBeVisible();

  const snapshot = await block.evaluate((element) => {
    const code = element.querySelector("code");
    const pre = element.querySelector("pre");
    const lines = [...element.querySelectorAll("[data-code-line]")].slice(0, 4);
    const tops = lines.map((line) => line.getBoundingClientRect().top);

    return {
      fontSize: code ? getComputedStyle(code).fontSize : null,
      lineGaps: tops.slice(1).map((top, index) => Math.round((top - (tops[index] ?? top)) * 10) / 10),
      source: pre?.textContent,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

  expect(snapshot.fontSize).toBe("14px");
  expect(snapshot.lineGaps.every((gap) => gap >= 22 && gap <= 24)).toBe(true);
  expect(snapshot.source).toContain('";\n\nconst initialBoard');
  expect(snapshot.pageOverflow).toBe(false);
});

test("cat palette gives impact to interaction states and keeps code ink-led", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/connectors/react");

  const titleInput = page.getByLabel("Document title");
  expect(await titleInput.evaluate(controlSnapshot)).toMatchObject({
    backgroundColor: "rgb(255, 255, 255)",
    borderColor: "rgb(216, 209, 197)",
    color: "rgb(41, 40, 36)",
  });

  await titleInput.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  expect((await titleInput.evaluate(controlSnapshot)).boxShadow).toContain("rgba(222, 109, 85, 0.25)");

  const currentLink = page.getByRole("navigation", { name: "Site navigation" }).getByRole("link", { name: "React" });
  expect(await currentLink.evaluate((element) => getComputedStyle(element).borderLeftColor)).toBe("rgb(222, 109, 85)");

  const code = page.getByRole("figure", { name: "TypeScript" }).first();
  const codePalette = await code.evaluate((element) => ({
    backgroundColor: getComputedStyle(element.querySelector("pre")!).backgroundColor,
    fontSize: getComputedStyle(element.querySelector("code")!).fontSize,
    keyword: getComputedStyle(element.querySelector('[data-code-token="keyword"]')!).color,
    usesImpactSyntax: [...element.querySelectorAll("[data-code-token]")]
      .some((token) => getComputedStyle(token).color === "rgb(222, 109, 85)"),
  }));
  expect(codePalette).toEqual({
    backgroundColor: "rgb(251, 248, 242)",
    fontSize: "14px",
    keyword: "rgb(41, 40, 36)",
    usesImpactSyntax: false,
  });
  expect(await page.locator('[data-code-token="string"]').first().evaluate((element) => getComputedStyle(element).color))
    .toBe("rgb(96, 120, 111)");

  await page.goto("/demo/database");
  const selectedCell = page.locator('[role="gridcell"][data-selected="true"]').first();
  expect(await selectedCell.evaluate((element) => ({
    backgroundColor: getComputedStyle(element).backgroundColor,
    borderColor: getComputedStyle(element).borderColor,
  }))).toEqual({
    backgroundColor: "rgb(251, 248, 242)",
    borderColor: "rgb(222, 109, 85)",
  });
  expect(await page.getByRole("combobox").first().evaluate(controlSnapshot)).toMatchObject({
    backgroundColor: "rgb(255, 255, 255)",
    borderColor: "rgb(216, 209, 197)",
  });
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
    const documentContent = document.querySelector("[data-doc-content]");
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

async function pageFrameSnapshot(page: Page) {
  return page.locator("[data-page-frame]").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width) };
  });
}

function controlSnapshot(element: Element) {
  const style = getComputedStyle(element);
  return {
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
    boxShadow: style.boxShadow,
    color: style.color,
  };
}

async function petiteCatLayout(page: Page) {
  return page.evaluate(() => {
    const artwork = document.querySelector<HTMLElement>("[data-petite-cat]");
    const image = artwork?.querySelector<HTMLImageElement>("img");
    const intro = artwork?.parentElement;
    const copy = intro?.firstElementChild;
    const artRect = artwork?.getBoundingClientRect();
    const copyRect = copy?.getBoundingClientRect();

    return {
      artworkLongEdge: artRect ? Math.round(Math.max(artRect.width, artRect.height)) : 0,
      imageLoaded: Boolean(image?.complete && image.naturalWidth > 0),
      overlapsCopy: Boolean(artRect && copyRect
        && artRect.left < copyRect.right
        && artRect.right > copyRect.left
        && artRect.top < copyRect.bottom
        && artRect.bottom > copyRect.top),
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
}
