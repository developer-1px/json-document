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
  await page.getByLabel("TanStack view and editing").getByRole("button", { name: "Copy" }).click();
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

test("TanStack Table Connector fills disjoint ranges in visible order", async ({ page }) => {
  await page.goto("/connectors/tanstack-table");
  await page.getByRole("button", { name: "Score descending" }).click();
  await page.getByRole("button", { name: "Score first" }).click();
  await page.getByRole("button", { name: "Hide status" }).click();

  const scoreR3 = page.getByRole("gridcell").filter({ has: page.getByRole("textbox", { name: "score r3" }) });
  const nameR2 = page.getByRole("gridcell").filter({ has: page.getByRole("textbox", { name: "name r2" }) });
  const scoreR1 = page.getByRole("gridcell").filter({ has: page.getByRole("textbox", { name: "score r1" }) });
  await scoreR3.click();
  await nameR2.click({ modifiers: ["Shift"] });
  await scoreR1.click({ modifiers: ["Meta"] });

  await expect(page.getByRole("gridcell", { selected: true })).toHaveCount(5);
  expect(JSON.parse(await page.getByTestId("tanstack-selection-json").innerText()).ranges).toHaveLength(2);

  await page.getByRole("button", { name: "Fill selected" }).click();
  let value = JSON.parse(await page.getByTestId("tanstack-document-json").innerText()) as SheetValue;
  expect(rowCells(value, "r3")).toEqual({ name: "Selected", status: "Ready", score: "Selected" });
  expect(rowCells(value, "r2")).toEqual({ name: "Selected", status: "Ready", score: "Selected" });
  expect(rowCells(value, "r1")).toEqual({ name: "Alpha", status: "Draft", score: "Selected" });

  const nameR4 = page.getByRole("gridcell").filter({ has: page.getByRole("textbox", { name: "name r4" }) });
  await nameR4.click();
  await page.getByRole("button", { name: "Undo" }).click();
  value = JSON.parse(await page.getByTestId("tanstack-document-json").innerText()) as SheetValue;
  expect(rowCells(value, "r3")).toEqual({ name: "Gamma", status: "Ready", score: 3 });
  await expect(page.getByRole("gridcell", { selected: true })).toHaveCount(5);
  expect(JSON.parse(await page.getByTestId("tanstack-selection-json").innerText()).ranges).toHaveLength(2);
});

test("TanStack Table and Web Platform Connectors compose for native structured clipboard events", async ({ page }) => {
  await page.goto("/connectors/tanstack-table");
  const nameR1 = page.getByRole("gridcell").filter({ has: page.getByRole("textbox", { name: "name r1" }) });
  const statusR2 = page.getByRole("gridcell").filter({ has: page.getByRole("textbox", { name: "status r2" }) });
  await nameR1.click();
  await statusR2.click({ modifiers: ["Shift"] });

  const copied = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>('[aria-label="TanStack Table editing"]')!;
    const data = new DataTransfer();
    const defaultAllowed = surface.dispatchEvent(new ClipboardEvent("copy", { clipboardData: data, bubbles: true, cancelable: true }));
    return {
      defaultAllowed,
      structured: data.getData("application/vnd.interactive-os.sheet+json"),
      text: data.getData("text/plain"),
    };
  });
  expect(copied.defaultAllowed).toBe(false);
  expect(copied.text).toBe("Alpha\tDraft\nBeta\tReady");

  await page.getByRole("gridcell").filter({ has: page.getByRole("textbox", { name: "status r3" }) }).click();
  const pasted = await page.evaluate((structured) => {
    const surface = document.querySelector<HTMLElement>('[aria-label="TanStack Table editing"]')!;
    const data = new DataTransfer();
    data.setData("application/vnd.interactive-os.sheet+json", structured);
    return surface.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, copied.structured);
  expect(pasted).toBe(false);

  const value = JSON.parse(await page.getByTestId("tanstack-document-json").innerText()) as SheetValue;
  expect(rowCells(value, "r3")).toEqual({ name: "Gamma", status: "Alpha", score: "Draft" });
  expect(rowCells(value, "r4")).toEqual({ name: "Delta", status: "Beta", score: "Ready" });
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
