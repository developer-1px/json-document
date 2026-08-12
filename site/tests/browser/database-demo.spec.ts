import { expect, test } from "@playwright/test";

test("Database Table edits five property types while native text lease stays outside structural selection", async ({ page }) => {
  await page.goto("/demo/database");
  await expect(page.getByRole("heading", { level: 1, name: "Database Table v1" })).toBeVisible();
  const grid = page.getByRole("grid", { name: "Notion-style database" });
  await expect(grid.getByRole("columnheader")).toContainText(["Name", "Note", "Score", "Status", "Complete", "Row"]);

  const title = page.getByRole("textbox", { name: "Name page-1" });
  await title.focus();
  await expect(page.getByTestId("native-text-lease")).toContainText("page-1/name");
  await title.dispatchEvent("compositionstart");
  await expect(page.getByTestId("native-text-lease")).toContainText("composing");
  await title.dispatchEvent("compositionend");
  await title.fill("Selection engine");
  await page.getByRole("heading", { level: 1, name: "Database Table v1" }).click();
  await expect(page.getByTestId("native-text-lease")).toHaveText("Structural navigation");

  await page.getByRole("textbox", { name: "Note page-1" }).fill("Native text is leased");
  await page.getByRole("spinbutton", { name: "Score page-1" }).fill("8");
  await page.getByRole("combobox", { name: "Status page-1" }).selectOption("progress");
  await page.getByRole("checkbox", { name: "Complete page-1" }).uncheck();
  await page.getByRole("heading", { level: 1, name: "Database Table v1" }).click();

  const json = page.getByTestId("database-document-json");
  await expect(json).toContainText("Selection engine");
  await expect(json).toContainText("Native text is leased");
  await expect(json).toContainText('"score": 8');
  await expect(json).toContainText('"status": "progress"');
  await expect(json).toContainText('"complete": false');
  await expect(page.getByTestId("database-selection-json")).not.toContainText("caret");
  await expect(page.getByTestId("database-selection-json")).not.toContainText("composition");
});

test("Database Table persists view projection and restores record plus selection with history", async ({ page }) => {
  await page.goto("/demo/database");
  await page.getByRole("button", { name: "Score descending" }).click();
  await page.getByRole("button", { name: "Backlog only" }).click();
  await page.getByRole("button", { name: "Hide notes" }).click();
  await page.getByRole("button", { name: "Score first" }).click();

  const rows = page.getByRole("grid", { name: "Notion-style database" }).locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveAttribute("data-record-id", "page-3");
  await expect(rows.nth(1)).toHaveAttribute("data-record-id", "page-4");
  await expect(page.getByTestId("database-view-json")).toContainText('"propertyOrder"');
  await expect(page.getByTestId("database-view-json")).toContainText('"note": false');
  await expect(page.getByTestId("database-view-json")).toContainText('"direction": "descending"');
  await expect(page.getByTestId("database-view-json")).toContainText('"value": "backlog"');

  const nameHeader = page.getByRole("columnheader", { name: /Name title/ });
  const scoreHeader = page.getByRole("columnheader", { name: /Score number/ });
  await nameHeader.dragTo(scoreHeader);
  await expect(page.getByTestId("database-view-json")).toContainText('"name",\n    "score"');

  await page.getByRole("button", { name: "Backlog only" }).click();
  await page.getByRole("button", { name: "New record" }).click();
  await expect(page.getByTestId("database-document-json")).toContainText('"id": "page-5"');
  await expect(page.getByTestId("database-selection-json")).toContainText('"recordId": "page-5"');
  await page.getByRole("button", { name: "Delete selected" }).click();
  await expect(page.getByTestId("database-document-json")).not.toContainText('"id": "page-5"');
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("database-document-json")).toContainText('"id": "page-5"');
  await expect(page.getByTestId("database-selection-json")).toContainText('"recordId": "page-5"');
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByTestId("database-document-json")).not.toContainText('"id": "page-5"');
});
