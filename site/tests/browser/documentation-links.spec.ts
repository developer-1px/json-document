import { expect, test } from "@playwright/test";

test("Architecture reaches target boundaries and the remaining TBD through real body links", async ({ page }) => {
  await page.goto("/docs/architecture");
  await page.locator("[data-doc-content] article").getByRole("link", { name: "Document Types", exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/document-types$/);
  await page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "현재 후보별 상태", exact: true }).click();
  await expect(page.getByRole("heading", { name: "현재 후보별 상태", level: 2 })).toBeInViewport();
  await page.locator("[data-doc-content] article").getByRole("link", { name: "Tree", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tree Document Type · TBD" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "목표 경계 · TBD" })).toBeVisible();
});

test("protocol and building-block landings preserve the owner hierarchy", async ({ page }) => {
  for (const path of ["/docs/foundation", "/docs/building-blocks", "/docs/editing"]) {
    await page.goto(path);
    const toc = page.getByRole("navigation", { name: "On this page" });
    await expect(toc).toBeVisible();
    expect(await toc.getByRole("link").evaluateAll((links) => links.every((link) =>
      document.getElementById(decodeURIComponent((link as HTMLAnchorElement).hash.slice(1))) !== null,
    ))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
  await expect(page.getByRole("heading", { level: 1, name: "Editing Protocol" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Hands Profile · TBD" })).toBeVisible();
});

test("API TOC uses the renderer's underscores and exposes the collaboration text subpath", async ({ page }) => {
  await page.goto("/docs/api/rich-text");
  const link = page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "RICH_TEXT_PROFILE_V1", exact: true });
  await expect(link).toHaveAttribute("href", "#rich_text_profile_v1");
  await link.click();
  await expect(page.getByRole("heading", { level: 2, name: "RICH_TEXT_PROFILE_V1", exact: true })).toBeInViewport();

  await page.goto("/docs/api/collaboration");
  await page.getByRole("navigation", { name: "On this page" })
    .getByRole("link", { name: "@interactive-os/json-document-collaboration/text", exact: true }).click();
  await expect(page.getByRole("heading", { level: 3, name: "createTextRuntime", exact: true })).toBeVisible();
});
