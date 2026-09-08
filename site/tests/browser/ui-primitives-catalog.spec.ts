import { expect, test } from "@playwright/test";

test("design system catalog shows tokens and canonical primitives", async ({ page }) => {
  await page.goto("/demo/ui-primitives");
  await expect(page.getByRole("heading", { level: 1, name: "Design system" })).toBeVisible();
  await expect(page.getByTestId("design-system-catalog")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Demo", exact: true })).toHaveCount(0);
  await expect(page.getByText("UiPrimitivesCatalogRoute.tsx", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("token-color-background-canvas")).toBeVisible();
  await expect(page.getByTestId("token-color-line-accent")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole("link", { name: "Controls", exact: true }).click();
  const catalogNavigation = page.getByRole("navigation", { name: "Design system sections" });
  const controlsHeading = page.getByRole("heading", { level: 2, name: "Controls" });
  const [navigationBox, headingBox] = await Promise.all([catalogNavigation.boundingBox(), controlsHeading.boundingBox()]);
  expect(navigationBox).not.toBeNull();
  expect(headingBox).not.toBeNull();
  expect(headingBox!.y).toBeGreaterThanOrEqual(navigationBox!.y + navigationBox!.height);

  const showroom = page.getByRole("region", { name: "Showroom" });
  await expect(showroom.getByRole("article")).toHaveCount(3);
  await showroom.getByRole("radio", { name: "Edit" }).click();
  await expect(showroom.getByText("Editing is active.", { exact: false })).toBeVisible();
  await showroom.getByRole("button", { name: "Market research" }).click();
  await expect(showroom.getByRole("heading", { name: "Market research" })).toBeVisible();
  const showroomSend = showroom.getByRole("button", { name: "Send request" });
  await expect(showroomSend).toBeDisabled();
  await showroom.getByRole("textbox", { name: "Ask about this artifact" }).fill("Tighten the opening");
  await expect(showroomSend).toBeEnabled();

  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy", exact: true })).toBeVisible();

  const filter = page.getByRole("button", { name: "Filter ready rows" });
  await expect(filter).toHaveAttribute("aria-pressed", "true");
  await filter.click();
  await expect(filter).toHaveAttribute("aria-pressed", "false");

  const compact = page.getByRole("button", { name: "Compact" });
  const comfortable = page.getByRole("button", { name: "Comfortable" });
  await expect(compact).toHaveAttribute("aria-pressed", "true");
  await comfortable.click();
  await expect(comfortable).toHaveAttribute("aria-pressed", "true");

  const canvas = page.getByRole("radio", { name: "Canvas" }).first();
  await canvas.focus();
  await canvas.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "JSON" }).first()).toHaveAttribute("aria-checked", "true");

  const tablist = page.getByRole("tablist", { name: "Inspector values" });
  await tablist.getByRole("tab", { name: "Document" }).focus();
  await tablist.getByRole("tab", { name: "Document" }).press("ArrowRight");
  await expect(tablist.getByRole("tab", { name: "Selection" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Selection" })).toContainText("Selection panel");

  await page.getByRole("button", { name: "Today" }).click();
  const contextual = page.getByLabel("Catalog contextual actions");
  await contextual.hover();
  await expect(contextual.getByRole("button", { name: "Duplicate" })).toBeVisible();
  await expect(contextual.getByRole("button", { name: "Delete" })).toBeVisible();

  await page.getByRole("button", { name: "Model" }).click();
  await expect(page.getByRole("listbox", { name: "Model" })).toBeVisible();
  await page.getByRole("option", { name: "Precise" }).click();
  await expect(page.getByRole("button", { name: "Model" })).toHaveText("Precise");

  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await expect(page.getByTestId("design-system-menu-action")).toHaveText("Last menu action: rename");

  const commands = page.getByRole("listbox", { name: "Commands" });
  await commands.focus();
  await commands.press("ArrowDown");
  await commands.press("Enter");
  await expect(commands.getByRole("option", { name: "Export" })).toHaveAttribute("aria-selected", "true");

  await expect(page.getByRole("grid", { name: "Calendar", exact: true })).toBeVisible();
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue("2026-08-03");
  await expect(page.getByRole("gridcell", { name: "Inbox" })).toBeVisible();
  await expect(page.getByTestId("design-system-files")).toHaveText("Drop files here");
  await expect(page.getByLabel("Move card")).toBeVisible();
  await expect(page.getByLabel("Resize panel")).toBeVisible();
  await expect(page.getByLabel("Move control point")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Wait animations" })).toBeVisible();
  await expect(page.getByText("Thinking…")).toBeVisible();
});
