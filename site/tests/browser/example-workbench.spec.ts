import { expect, test } from "@playwright/test";

test("Document Workbench exposes real state, trace, reset, and share restoration", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/examples/document");

  await expect(page.getByRole("heading", { level: 1, name: "Document editing" })).toBeVisible();
  await expect(page.getByRole("figure", { name: "Canonical JSON" })).toContainText("welcome");
  await expect(page.getByRole("figure", { name: "Operation trace" })).toContainText("[]");

  await page.getByRole("textbox", { name: "Workbench block 1 text" }).fill("Shared document state");
  await expect(page.getByRole("figure", { name: "Canonical JSON" })).toContainText("Shared document state");
  await expect(page.getByRole("figure", { name: "Operation trace" })).toContainText("text.replace");
  await expect(page.getByRole("figure", { name: "Operation trace" })).toContainText("/blocks/0/text");

  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  const sharedUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(sharedUrl).toContain("state=");

  await page.goto(sharedUrl);
  await expect(page.getByRole("textbox", { name: "Workbench block 1 text" })).toHaveValue("Shared document state");
  await expect(page.getByText(/revision 0 · 1 selected · 0 observed events/)).toBeVisible();

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("textbox", { name: "Workbench block 1 text" })).toHaveValue("Select a block, then edit the canonical document.");
  await expect.poll(() => new URL(page.url()).searchParams.has("state")).toBe(false);

  await page.goto("/examples/document?state=%7Bbroken");
  await expect(page.getByRole("textbox", { name: "Workbench block 1 text" })).toHaveValue("Select a block, then edit the canonical document.");
});

test("Quickstart opens the shared Workbench route", async ({ page }) => {
  await page.goto("/docs/tutorial");
  await page.getByRole("link", { name: "Open in Example Workbench" }).click();
  await expect(page).toHaveURL(/\/examples\/document$/);
  await expect(page.getByRole("heading", { level: 1, name: "Document editing" })).toBeVisible();
});
