import { expect, test } from "@playwright/test";

test("TanStack Table Connector edits the visible sorted and filtered Sheet topology", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });

  await page.goto("/connectors/tanstack-table");
  await expect(page.getByRole("heading", { level: 1, name: "TanStack Table Connector" })).toBeVisible();

  await page.getByRole("button", { name: "Ready rows" }).click();
  await page.getByRole("button", { name: "Score descending" }).click();
  await page.getByRole("button", { name: "Score first" }).click();
  await page.getByRole("button", { name: "Hide status" }).click();

  expect(JSON.parse(await page.getByTestId("tanstack-topology").innerText())).toEqual({
    rowIds: ["r3", "r2"],
    columnIds: ["score", "name"],
  });

  const start = page.getByRole("gridcell").filter({ has: page.getByRole("textbox", { name: "score r3" }) });
  const end = page.getByRole("gridcell").filter({ has: page.getByRole("textbox", { name: "name r2" }) });
  await start.click();
  await end.click({ modifiers: ["Shift"] });
  await expect(page.getByRole("gridcell", { selected: true })).toHaveCount(4);
  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.getByTestId("tanstack-clipboard")).toHaveText("3\tGamma\n2\tBeta");

  await editCell(page, "score r3", "30");
  await editCell(page, "name r3", "G");
  await editCell(page, "score r2", "20");
  await editCell(page, "name r2", "B");
  await start.click();
  await page.getByRole("button", { name: "Paste" }).click();

  const pasted = JSON.parse(await page.getByTestId("tanstack-document-json").innerText()) as SheetValue;
  expect(rowCells(pasted, "r3")).toEqual({ name: "Gamma", status: "Ready", score: 3 });
  expect(rowCells(pasted, "r2")).toEqual({ name: "Beta", status: "Ready", score: 2 });

  await page.getByRole("button", { name: "Undo" }).click();
  const undone = JSON.parse(await page.getByTestId("tanstack-document-json").innerText()) as SheetValue;
  expect(rowCells(undone, "r3")).toEqual({ name: "G", status: "Ready", score: 30 });
  expect(rowCells(undone, "r2")).toEqual({ name: "B", status: "Ready", score: 20 });
  await page.getByRole("button", { name: "Redo" }).click();
  const redone = JSON.parse(await page.getByTestId("tanstack-document-json").innerText()) as SheetValue;
  expect(rowCells(redone, "r3")).toEqual({ name: "Gamma", status: "Ready", score: 3 });
  expect(errors).toEqual([]);
});

type SheetValue = { rows: Array<{ id: string; cells: Record<string, unknown> }> };

async function editCell(page: import("@playwright/test").Page, name: string, value: string) {
  const input = page.getByRole("textbox", { name });
  await input.click();
  expect(await input.evaluate((element) => document.activeElement === element)).toBe(true);
  await input.fill(value);
  await input.press("Tab");
}

function rowCells(value: SheetValue, rowId: string) {
  return value.rows.find((row) => row.id === rowId)?.cells;
}
