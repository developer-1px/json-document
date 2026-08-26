import { expect, test } from "@playwright/test";

test("Database Table edits five property types while native text lease stays outside structural selection", async ({ page }) => {
  await page.goto("/demo/database");
  await expect(page.getByRole("heading", { level: 1, name: "Database Demo" })).toBeVisible();
  const grid = page.getByRole("grid", { name: "Notion-style database" });
  await expect(grid.getByRole("columnheader")).toContainText(["Name", "Note", "Score", "Status", "Complete", "Row"]);

  const title = page.getByRole("textbox", { name: "Name page-1" });
  const titleCell = title.locator("xpath=ancestor::*[@role='gridcell']");
  const cellBox = await titleCell.boundingBox();
  await title.focus();
  await expect.poll(async () => titleCell.evaluate((cell) => {
    const cellStyle = getComputedStyle(cell);
    const controlStyle = getComputedStyle(cell.querySelector("input")!);
    return {
      borderLeft: cellStyle.borderLeftWidth,
      borderRight: cellStyle.borderRightWidth,
      cellRing: cellStyle.boxShadow,
      controlRing: controlStyle.boxShadow,
    };
  })).toEqual({
    borderLeft: "0px",
    borderRight: "0px",
    cellRing: expect.not.stringMatching(/^none$/),
    controlRing: "none",
  });
  expect(await titleCell.boundingBox()).toEqual(cellBox);
  await expect(page.getByTestId("native-text-lease")).toContainText("page-1/name");
  await title.dispatchEvent("compositionstart");
  await expect(page.getByTestId("native-text-lease")).toContainText("composing");
  await title.dispatchEvent("compositionend");
  await title.fill("Selection engine");
  await page.getByRole("heading", { level: 1, name: "Database Demo" }).click();
  await expect(page.getByTestId("native-text-lease")).toHaveText("Structural navigation");

  await page.getByRole("textbox", { name: "Note page-1" }).fill("Native text is leased");
  await page.getByRole("spinbutton", { name: "Score page-1" }).fill("8");
  await page.getByRole("combobox", { name: "Status page-1" }).selectOption("progress");
  await page.getByRole("checkbox", { name: "Complete page-1" }).uncheck();
  await page.getByRole("heading", { level: 1, name: "Database Demo" }).click();

  const json = page.getByTestId("database-document-json");
  await expect(json).toContainText("Selection engine");
  await expect(json).toContainText("Native text is leased");
  await expect(json).toContainText('"score": 8');
  await expect(json).toContainText('"status": "progress"');
  await expect(json).toContainText('"complete": false');
  await expect(page.getByTestId("database-selection-json")).not.toContainText("caret");
  await expect(page.getByTestId("database-selection-json")).not.toContainText("composition");
});

test("Database Table header hands persist view projection and restore records with history", async ({ page }) => {
  await page.goto("/demo/database");
  await expect(page.getByRole("button", { name: "Backlog only" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Score descending" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Hide notes" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Score first" })).toHaveCount(0);

  const scoreHeader = page.getByRole("columnheader", { name: /Score number/ });
  await scoreHeader.click();
  await expect(scoreHeader).toHaveAttribute("aria-sort", "ascending");
  await scoreHeader.click();
  await expect(scoreHeader).toHaveAttribute("aria-sort", "descending");
  await expect(page.getByTestId("database-view-json")).toContainText('"direction": "descending"');

  const rows = page.getByRole("grid", { name: "Notion-style database" }).locator("tbody tr");
  await expect(rows.nth(0)).toHaveAttribute("data-record-id", "page-2");

  const noteHeader = page.getByRole("columnheader", { name: /Note text/ });
  await noteHeader.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Hide" }).click();
  await expect(page.getByRole("columnheader", { name: /Note text/ })).toHaveCount(0);
  await expect(page.getByTestId("database-view-json")).toContainText('"visible": false');

  await page.getByRole("columnheader", { name: "Show Note" }).click();
  await expect(page.getByRole("columnheader", { name: /Note text/ })).toBeVisible();

  const statusHeader = page.getByRole("columnheader", { name: /Status select/ });
  await statusHeader.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Filter Backlog" }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveAttribute("data-record-id", "page-3");
  await expect(rows.nth(1)).toHaveAttribute("data-record-id", "page-4");
  await expect(page.getByTestId("database-view-json")).toContainText('"value": "backlog"');

  const nameHeader = page.getByRole("columnheader", { name: /Name title/ });
  await nameHeader.dragTo(scoreHeader);
  await expect(page.getByTestId("database-view-json")).toContainText('"columns"');

  const handle = page.locator("[data-resize-edge=e][data-property-id=score]");
  const box = await handle.boundingBox();
  if (!box) throw new Error("resize handle");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + box.height / 2);
  await page.mouse.up();
  await expect.poll(async () => JSON.parse(await page.getByTestId("database-view-json").textContent() ?? "{}").projection.columns.find((column: { propertyId: string }) => column.propertyId === "score")?.width).toBeGreaterThan(160);

  await page.getByRole("button", { name: "New record" }).click();
  await expect(page.getByTestId("database-document-json")).toContainText('"id": "record-1"');
  await expect(page.getByTestId("database-selection-json")).toContainText('"recordId": "record-1"');
  await page.getByRole("button", { name: "Delete selected" }).click();
  await expect(page.getByTestId("database-document-json")).not.toContainText('"id": "record-1"');
  await page.getByLabel("Database editor").focus();
  await page.keyboard.press("ControlOrMeta+Z");
  await expect(page.getByTestId("database-document-json")).toContainText('"id": "record-1"');
  await expect(page.getByTestId("database-selection-json")).toContainText('"recordId": "record-1"');
  await page.keyboard.press("ControlOrMeta+Shift+Z");
  await expect(page.getByTestId("database-document-json")).not.toContainText('"id": "record-1"');
});
