import { expect, test, type Page } from "@playwright/test";

test("official overview exposes the product hierarchy", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "json-document" })).toBeVisible();
  await expect(page.getByText("Agent-native artifact editing의 개발 정본.")).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Site navigation" });
  await expect(navigation.getByRole("group", { name: "Start" })).toHaveCount(0);
  await expect(navigation.getByRole("group", { name: "Core" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Dependency map" }).getByRole("link")).toHaveText([
    "JSON Document",
    "Hands",
    "Artifact",
  ]);
  await expect(navigation.getByRole("link", { name: "Why" })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Replica" })).toHaveCount(0);
  await navigation.getByRole("button", { name: "JSON Document" }).click();
  await expect(navigation.getByRole("group", { name: "JSON Document" }).getByRole("link")).toHaveText([
    "Why",
    "Concept Map",
    "API Reference",
  ]);
  await expect(navigation.getByRole("link", { name: "Replica" })).toHaveCount(0);
  await navigation.getByRole("button", { name: "Collaboration" }).click();
  await expect(navigation.getByRole("group", { name: "Collaboration" }).getByRole("link")).toHaveText([
    "Replica",
    "Lifecycle",
    "Collaborative History",
    "Text",
  ]);
  await navigation.getByRole("button", { name: "Editing" }).click();
  await expect(navigation.getByRole("group", { name: "Editing" }).getByRole("link")).toHaveText([
    "Intent guide",
    "Intent",
    "Topology",
    "Selection",
    "Clipboard",
    "History",
  ]);
  await navigation.getByRole("button", { name: "Hands" }).click();
  await expect(navigation.getByRole("group", { name: "Hands" }).getByRole("link")).toHaveText([
    "Overview",
    "Official Hands · TBD",
    "Order",
    "Object",
    "Tree",
    "Database",
    "Composer",
    "Mention",
  ]);
  await navigation.getByRole("button", { name: "Adapter" }).click();
  await expect(navigation.getByRole("group", { name: "Adapter" }).getByRole("link")).toHaveText([
    "Overview",
    "Keyboard",
    "Clipboard",
    "Contenteditable",
  ]);
  await navigation.getByRole("button", { name: "Connector" }).click();
  await expect(navigation.getByRole("group", { name: "Connector" }).getByRole("link")).toHaveText([
    "Overview",
    "React Reference",
    "React Hook Form",
    "Ajv",
    "Zod",
    "TanStack Table",
  ]);
  await navigation.getByRole("button", { name: "Affordance" }).click();
  await expect(navigation.getByRole("group", { name: "Affordance" }).getByRole("link")).toHaveText([
    "Focus",
    "Caret",
    "Select",
    "Typeahead",
    "Activate",
    "Escape",
    "Expand/Collapse",
    "Undo",
    "Delete",
    "Rename",
    "Nudge",
    "Hover",
    "Double-click",
    "Triple-click",
    "Context menu",
    "Drag",
    "Marquee",
    "Drop",
    "Duplicate",
    "Resize",
    "Pan",
    "Scroll",
    "Zoom",
    "Snap",
    "Not-allowed",
  ]);
  await expect(navigation.getByRole("group", { name: "Demos" })).toHaveCount(0);
  await expect(navigation.getByRole("group", { name: "Reference" })).toHaveCount(0);
  await navigation.getByRole("button", { name: "Artifact" }).click();
  await expect(navigation.getByRole("group", { name: "Artifact" }).getByRole("link")).toHaveText(["MD · PPT · Sheet"]);
  expect(await navigation.getByRole("group").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")))).toEqual([
    "JSON Document",
    "Editing",
    "Adapter",
    "Connector",
    "Affordance",
    "Hands",
    "Artifact",
    "Collaboration",
  ]);
  expect(await navigation.getByRole("group", { name: "Collaboration" }).evaluate((element) => ({
    borderTopWidth: getComputedStyle(element).borderTopWidth,
    paddingTop: getComputedStyle(element).paddingTop,
  }))).toEqual({ borderTopWidth: "1px", paddingTop: "16px" });
  await expect(navigation.getByRole("link", { name: "Extensions" })).toHaveCount(0);
  expect(requests.some(isLegacyRequest)).toBe(false);
});

test("mobile navigation preserves the product groups without duplicating documentation pages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const siteNavigation = page.getByRole("navigation", { name: "Site navigation" });
  await expect(siteNavigation.getByRole("group", { name: "JSON Document" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "Core" })).toHaveCount(0);
  await expect(siteNavigation.getByRole("group", { name: "Editing" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "Hands" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "Artifact" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "Adapter" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "Demos" })).toHaveCount(0);
  await expect(siteNavigation.getByRole("group", { name: "Connector" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "Affordance" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "Collaboration" })).toBeVisible();

  await page.goto("/docs/concepts");
  await expect(page.getByRole("navigation", { name: "Documentation pages" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Documentation sections" })).toBeVisible();
  await expect(siteNavigation.getByRole("link", { name: "Concept Map" })).toHaveAttribute("aria-current", "page");
});

test("official docs routes render with route metadata in a real browser", async ({ page }) => {
  await page.goto("/docs");

  const siteNavigation = page.getByRole("navigation", { name: "Site navigation" });
  await expect(page).toHaveTitle("json-document Docs - json-document");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "값을 다루는 하나의 계약" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "값을 다루는 하나의 계약" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Documentation pages" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
  await expect(siteNavigation.getByRole("group", { name: "JSON Document" }).getByRole("link", { name: "Why" })).toHaveAttribute("aria-current", "page");
  await siteNavigation.getByRole("button", { name: "Connector" }).click();
  await siteNavigation.getByRole("group", { name: "Connector" }).getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page).toHaveTitle("Connector Docs - json-document");
  await expect(page.getByRole("heading", { level: 1, name: "json-document Connectors" })).toBeVisible();
  await expect(page.locator("[data-live-demo]")).toHaveCount(0);

  await page.getByRole("link", { name: "API Reference" }).first().click();
  await expect(page).toHaveTitle("json-document API - json-document");
  await expect(page.getByRole("heading", { level: 1, name: "json-document API" })).toBeVisible();
});

test("Editing docs and API demos keep one Korean reading flow", async ({ page }) => {
  await page.goto("/docs/selection");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await page.locator('[data-live-demo="/demo/selection"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-live-demo="/demo/selection"]')).toBeVisible();
  await expect(page.getByRole("region", { name: "Demo workbench" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "모드와 블록 선택하기" })).toBeVisible();

  await page.goto("/editors");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
});

test("Connector pages declare the connection before the live demo", async ({ page }) => {
  const routes = [
    "/connectors/react",
    "/connectors/react-hook-form",
    "/connectors/ajv",
    "/connectors/zod",
    "/connectors/zod/validate",
    "/connectors/tanstack-table",
    "/adapters/keyboard",
    "/adapters/clipboard",
    "/adapters/contenteditable",
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 2, name: "The connection" })).toBeVisible();
    await expect(page.locator("[data-connector-connection] figure").first()).toBeVisible();
    await expect(page.getByText("Install", { exact: true })).toBeVisible();
    await expect(page.getByText("Live demo", { exact: true })).toBeVisible();
    expect(await page.locator("[data-connector-connection]").evaluate((connection) => {
      const demo = document.querySelector("[data-connector-live-demo]");
      return demo !== null
        && Boolean(connection.compareDocumentPosition(demo) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);
  }
});

test("Adapter and Connector menus expose contract docs while demos stay embedded", async ({ page }) => {
  await page.goto("/docs/adapter-keyboard");
  const navigation = page.getByRole("navigation", { name: "Site navigation" });
  await expect(navigation.getByRole("group", { name: "Adapter" }).getByRole("link")).toHaveText([
    "Overview",
    "Keyboard",
    "Clipboard",
    "Contenteditable",
  ]);
  await expect(page.getByRole("heading", { level: 1, name: "Keyboard Adapter" })).toBeVisible();
  await expect(page.locator("[data-live-demo]")).toHaveCount(1);

  await page.goto("/docs/connector-zod-validate");
  await expect(navigation.getByRole("group", { name: "Connector" }).getByRole("link")).toHaveText([
    "Overview",
    "React Reference",
    "React Hook Form",
    "Ajv",
    "Zod",
    "Validate",
    "TanStack Table",
  ]);
  await expect(page.getByRole("heading", { level: 1, name: "Zod Validate" })).toBeVisible();
  await expect(page.locator("[data-live-demo]")).toHaveCount(1);
});

test("docs and demos share the page frame while preserving their content modes", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  await page.goto("/docs");
  const docsFrame = await pageFrameSnapshot(page);
  await expect(page.locator("[data-page-header]")).toHaveCount(1);
  await expect(page.locator("[data-petite-cat]")).toHaveCount(1);

  await page.goto("/docs/api");
  await expect(page.locator('[data-petite-cat="patch"]')).toHaveCount(1);

  await page.goto("/demo");
  const demoFrame = await pageFrameSnapshot(page);
  await expect(page.locator("[data-page-header]")).toHaveCount(1);

  expect(docsFrame).toEqual(demoFrame);
  expect(demoFrame.width).toBeGreaterThan(1000);
});

test("ordinary pages reuse one petite decorative cat without covering intro copy", async ({ page }) => {
  test.setTimeout(60_000);
  const illustrations = new Set<string>();
  const routes = [
    "/docs",
    "/docs/concepts",
    "/docs/connectors",
    "/docs/adapters",
    "/docs/api",
    "/docs/topology",
    "/docs/clipboard",
    "/docs/history",
    "/editors",
    "/demo",
    "/demo/sheet",
    "/demo/selection",
    "/demo/topology",
    "/demo/clipboard",
    "/demo/history",
    "/editing/rich-text",
    "/docs/database",
    "/demo/database",
    "/connectors",
    "/connectors/react",
    "/connectors/ajv",
    "/connectors/zod",
    "/connectors/zod/validate",
    "/connectors/tanstack-table",
    "/adapters",
    "/adapters/keyboard",
    "/adapters/clipboard",
    "/adapters/contenteditable",
  ];

  for (const route of routes) {
    await page.goto(route);
    const artwork = page.locator("[data-petite-cat]");
    await expect(artwork, route).toHaveCount(1);
    illustrations.add(await artwork.getAttribute("data-petite-cat") ?? "");
    await expect(artwork.locator("img")).toHaveAttribute("alt", "");
    await expect.poll(() => artwork.locator("img").evaluate((image) => (
      (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0
    ))).toBe(true);
    expect(await petiteCatLayout(page)).toMatchObject({
      artworkLongEdge: 192,
      imageLoaded: true,
      overlapsCopy: false,
      pageOverflow: false,
    });
  }
  expect([...illustrations].sort()).toEqual([
    "braces",
    "branch",
    "clipboard",
    "connector",
    "cursor",
    "database",
    "debug",
    "package",
    "patch",
    "peek",
    "sleep",
  ]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  await expect(page.locator("[data-petite-cat]")).toHaveCount(1);
  await expect.poll(() => page.locator("[data-petite-cat] img").evaluate((image) => (
    (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0
  ))).toBe(true);
  expect(await petiteCatLayout(page)).toMatchObject({
    artworkLongEdge: 112,
    imageLoaded: true,
    overlapsCopy: false,
    pageOverflow: false,
  });
});

test("code blocks preserve source whitespace with a compact visual rhythm", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs/api");

  const block = page.getByRole("figure", { name: "TypeScript" }).first();
  await expect(block).toBeVisible();
  await expect(block.locator('xpath=ancestor::div[@data-source-highlighter]')).toHaveAttribute("data-source-highlighter", "shiki");
  await expect(block.getByRole("button", { name: "Copy" }).locator("svg")).toBeVisible();

  const snapshot = await block.evaluate((element) => {
    const code = element.querySelector("code");
    const pre = element.querySelector("pre");
    const figureRect = element.getBoundingClientRect();
    const preRect = pre?.getBoundingClientRect();
    const lines = [...element.querySelectorAll("[data-code-line]")].slice(0, 4);
    const tops = lines.map((line) => line.getBoundingClientRect().top);

    return {
      fontSize: code ? getComputedStyle(code).fontSize : null,
      topInset: preRect ? Math.round((preRect.top - figureRect.top) * 10) / 10 : null,
      lineGaps: tops.slice(1).map((top, index) => Math.round((top - (tops[index] ?? top)) * 10) / 10),
      source: pre?.textContent,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

  expect(snapshot.fontSize).toBe("13px");
  expect(snapshot.topInset).toBeLessThanOrEqual(1);
  expect(snapshot.lineGaps.every((gap) => gap >= 20 && gap <= 21)).toBe(true);
  expect(snapshot.source).toContain('import { createJSONDocument } from "@interactive-os/json-document";');
  expect(snapshot.pageOverflow).toBe(false);

  await block.getByRole("button", { name: "Copy" }).click();
  await expect(block.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("createJSONDocument");
});

test("inline code stays distinct without drawing a border", async ({ page }) => {
  await page.goto("/docs/api");

  const inlineCode = page.locator("code").filter({ hasText: /^document\.value$/ }).first();
  await expect(inlineCode).toBeVisible();
  expect(await inlineCode.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderWidth: style.borderWidth,
      backgroundColor: style.backgroundColor,
      fontFamily: style.fontFamily,
    };
  })).toMatchObject({
    borderWidth: "0px",
    backgroundColor: "rgb(251, 248, 242)",
  });
});

test("docs chrome groups with paper and type instead of rest-state borders", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/docs/selection");

  const navigation = page.getByRole("navigation", { name: "Site navigation" });
  expect(await navigation.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderRightWidth: style.borderRightWidth,
      borderBottomWidth: style.borderBottomWidth,
    };
  })).toEqual({
    backgroundColor: "rgb(251, 248, 242)",
    borderRightWidth: "0px",
    borderBottomWidth: "0px",
  });
  expect(await navigation.getByRole("link", { name: "json-document" }).evaluate((element) => (
    getComputedStyle(element).borderBottomWidth
  ))).toBe("0px");
  expect(await navigation.getByRole("button", { name: "Editing" }).evaluate((element) => (
    getComputedStyle(element).borderLeftColor
  ))).toBe("rgb(222, 109, 85)");
  const currentCat = navigation.getByRole("link", { name: "Selection", exact: true }).locator("svg");
  await expect(currentCat).toHaveCount(1);
  expect(await currentCat.evaluate((element) => getComputedStyle(element).color)).toBe("rgb(222, 109, 85)");
  await expect(navigation.locator('a[aria-current="page"] svg')).toHaveCount(1);

  const heading = page.getByRole("heading", { level: 2, name: "대상을 하나 고르기" });
  expect(await heading.evaluate((element) => ({
    borderTopWidth: getComputedStyle(element).borderTopWidth,
    fontSize: getComputedStyle(element).fontSize,
  }))).toEqual({
    borderTopWidth: "0px",
    fontSize: "18px",
  });

  const horizon = page.locator("[data-page-header] [data-petite-cat]").locator("xpath=..");
  expect(await horizon.evaluate((element) => getComputedStyle(element).borderBottomWidth)).toBe("1px");

  const liveDemo = page.locator('[data-live-demo="/demo/selection"]');
  expect(await liveDemo.evaluate((element) => getComputedStyle(element).borderWidth)).toBe("0px");

  const code = page.getByRole("figure", { name: "TypeScript" }).first();
  expect(await code.evaluate((element) => {
    const lineNumber = element.querySelector("[data-line-number]");
    return {
      borderWidth: getComputedStyle(element).borderWidth,
      backgroundColor: getComputedStyle(element.querySelector("pre")!).backgroundColor,
      lineNumberBorderRightWidth: lineNumber ? getComputedStyle(lineNumber).borderRightWidth : null,
    };
  })).toEqual({
    borderWidth: "0px",
    backgroundColor: "rgb(251, 248, 242)",
    lineNumberBorderRightWidth: "0px",
  });

  await page.goto("/docs/connector-react");
  await page.locator('[data-live-demo="/connectors/react"]').scrollIntoViewIfNeeded();
  expect(await page.getByLabel("Document title").evaluate((element) => (
    getComputedStyle(element).borderColor
  ))).toBe("rgb(216, 209, 197)");

  await page.goto("/demo/selection");
  expect(await page.getByRole("region", { name: "모드와 블록 선택하기" }).evaluate((element) => ({
    borderWidth: getComputedStyle(element).borderWidth,
    backgroundColor: getComputedStyle(element).backgroundColor,
  }))).toEqual({
    borderWidth: "0px",
    backgroundColor: "rgb(251, 248, 242)",
  });
  const unselected = page.getByRole("button", { name: "bravo · Middle" });
  expect(await unselected.getAttribute("data-selected")).not.toBe("true");

  await unselected.click();
  await expect(unselected).toHaveAttribute("data-selected", "true");
  await expect.poll(async () => unselected.evaluate((element) => getComputedStyle(element).outlineColor))
    .toBe("rgb(222, 109, 85)");

  await page.goto("/demo/sheet");
  expect(await page.getByRole("columnheader", { name: "Name" }).evaluate((element) => (
    getComputedStyle(element).borderWidth
  ))).not.toBe("0px");
});

test("editor demos keep one product app under the page lobby", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/demo/tree");

  await expect(page.locator("[data-page-header]")).toHaveCount(1);
  await expect(page.locator("[data-product-app]")).toHaveCount(1);
  const app = page.locator("[data-product-app]");
  await expect(app.getByRole("toolbar", { name: "Tree actions" })).toBeVisible();
  await expect(app.getByRole("treeitem").or(app.getByText("Fruit", { exact: true })).first()).toBeVisible();
  await expect(app.getByRole("button", { name: "Collapse Fruit" })).toBeVisible();
  expect(await app.getByRole("button", { name: "Collapse Fruit" }).evaluate((element) => (
    getComputedStyle(element).backgroundColor
  ))).toBe("rgba(0, 0, 0, 0)");

  await page.goto("/demo/selection");
  await expect(page.locator("[data-product-app]")).toHaveCount(0);
});

test("cat palette gives impact to interaction states and keeps code ink-led", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/docs/connector-react");
  await page.locator('[data-live-demo="/connectors/react"]').scrollIntoViewIfNeeded();

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

  const currentLink = page.getByRole("navigation", { name: "Site navigation" })
    .getByRole("group", { name: "Connector" })
    .getByRole("link", { name: "React Reference", exact: true });
  expect(await currentLink.locator("svg").evaluate((element) => getComputedStyle(element).color)).toBe("rgb(222, 109, 85)");

  await page.goto("/docs/api");
  const code = page.getByRole("figure", { name: "TypeScript" }).first();
  await expect(code.locator("pre")).toBeVisible();
  await expect(code.locator("xpath=..")).toHaveAttribute("data-source-highlighter", "shiki");
  const codePalette = await code.evaluate((element) => ({
    backgroundColor: getComputedStyle(element.querySelector("pre")!).backgroundColor,
    fontSize: getComputedStyle(element.querySelector("code")!).fontSize,
    keyword: getComputedStyle([...element.querySelectorAll("[data-code-line] > span")]
      .find((token) => token.textContent === "import")!).color,
    usesImpactSyntax: [...element.querySelectorAll("[data-code-line] > span")]
      .some((token) => getComputedStyle(token).color === "rgb(222, 109, 85)"),
  }));
  expect(codePalette).toEqual({
    backgroundColor: "rgb(251, 248, 242)",
    fontSize: "13px",
    keyword: "rgb(207, 34, 46)",
    usesImpactSyntax: false,
  });
  expect(await code.locator("[data-code-line] > span").filter({ hasText: '"@interactive-os/json-document"' })
    .evaluate((element) => getComputedStyle(element).color))
    .toBe("rgb(10, 48, 105)");

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
    .getByRole("link", { name: "json-document" })
    .click();
  await expect(page).toHaveTitle("json-document - Agent artifact editing");
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
