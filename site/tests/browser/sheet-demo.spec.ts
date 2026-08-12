import { expect, test, type Page } from "@playwright/test";

test("Sheet demo completes rectangular selection, clipboard, edit, undo, and redo", async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") consoleProblems.push(message.text());
  });

  await page.goto("/demo/sheet");
  await expect(page.getByRole("heading", { level: 1, name: "Sheet demo" })).toBeVisible();

  await page.getByRole("textbox", { name: "Name row 1" }).click();
  await page.getByRole("textbox", { name: "Status row 2" }).click({ modifiers: ["Shift"] });
  await expect(page.locator('td[data-selected="true"]')).toHaveCount(4);

  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(page.getByTestId("sheet-clipboard-tsv")).toHaveText("Alpha\tDraft\nBeta\tReady");

  await page.getByRole("textbox", { name: "Status row 3" }).click();
  await page.getByRole("button", { name: "Paste", exact: true }).click();
  let document = await canonicalSheet(page);
  expect(document.rows[2]?.cells).toEqual({ name: "Gamma", status: "Alpha", owner: "Draft" });
  expect(document.rows[3]?.cells).toEqual({ name: "Delta", status: "Beta", owner: "Ready" });
  await expect(page.locator('td[data-selected="true"]')).toHaveCount(4);

  await page.getByRole("button", { name: "Undo", exact: true }).click();
  document = await canonicalSheet(page);
  expect(document.rows[2]?.cells).toEqual({ name: "Gamma", status: "Review", owner: "June" });
  await expect(page.locator('td[data-selected="true"]')).toHaveCount(1);

  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator('td[data-selected="true"]')).toHaveCount(4);
  await page.getByRole("textbox", { name: "Name row 1" }).fill("Alpha edited");
  document = await canonicalSheet(page);
  expect(document.rows[0]?.cells.name).toBe("Alpha edited");
  expect(consoleProblems).toEqual([]);
});

test("Sheet demo fills disjoint ranges and restores their selection with undo", async ({ page }) => {
  await page.goto("/demo/sheet");

  await page.getByRole("textbox", { name: "Name row 1" }).click();
  await page.getByRole("textbox", { name: "Owner row 4" }).click({ modifiers: ["Meta"] });
  await page.getByRole("textbox", { name: "Status row 3" }).click({ modifiers: ["Shift"] });

  await expect(page.locator('td[data-selected="true"]')).toHaveCount(5);
  expect(JSON.parse(await page.getByTestId("sheet-selection-json").innerText()).ranges).toHaveLength(2);

  await page.getByRole("button", { name: "Fill selected" }).click();
  let document = await canonicalSheet(page);
  expect(document.rows[0]?.cells.name).toBe("Selected");
  expect(document.rows[2]?.cells).toEqual({ name: "Gamma", status: "Selected", owner: "Selected" });
  expect(document.rows[3]?.cells).toEqual({ name: "Delta", status: "Selected", owner: "Selected" });

  await page.getByRole("textbox", { name: "Owner row 1" }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  document = await canonicalSheet(page);
  expect(document.rows[0]?.cells.name).toBe("Alpha");
  await expect(page.locator('td[data-selected="true"]')).toHaveCount(5);
  expect(JSON.parse(await page.getByTestId("sheet-selection-json").innerText()).ranges).toHaveLength(2);

  await page.getByRole("button", { name: "Redo", exact: true }).click();
  document = await canonicalSheet(page);
  expect(document.rows[0]?.cells.name).toBe("Selected");
  expect(JSON.parse(await page.getByTestId("sheet-selection-json").innerText()).ranges).toHaveLength(2);
});

async function canonicalSheet(page: Page): Promise<{ rows: Array<{ cells: Record<string, string> }> }> {
  return JSON.parse(await page.getByTestId("sheet-canonical-json").innerText()) as { rows: Array<{ cells: Record<string, string> }> };
}
