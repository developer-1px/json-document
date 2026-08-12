import { expect, test, type Locator, type Page } from "@playwright/test";

test("Selection Lab compares Order and Grid range families", async ({ page }) => {
  await page.goto("/demo/selection");
  await expect(page.getByRole("heading", { level: 1, name: "Selection Lab" })).toBeVisible();

  const order = page.getByRole("region", { name: "Order selection variant" });
  await order.getByRole("button", { name: "Order Beta" }).click();
  await order.getByRole("button", { name: "Order Delta" }).click({ modifiers: ["Shift"] });
  await expect(order.getByRole("button", { pressed: true })).toHaveCount(3);
  expect((await json(page, "order-selection-json")).ranges).toEqual([
    { anchor: { itemId: "order-b" }, focus: { itemId: "order-d" } },
  ]);

  await order.getByRole("button", { name: "Delete order selection" }).click();
  expect((await json(page, "order-document-json")).items.map((item: { id: string }) => item.id)).toEqual(["order-a"]);
  await order.getByRole("button", { name: "Undo" }).click();
  await expect(order.getByRole("button", { pressed: true })).toHaveCount(3);

  const grid = page.getByRole("region", { name: "Grid selection variant" });
  await grid.getByRole("button", { name: "Grid A1" }).click();
  await grid.getByRole("button", { name: "Grid B2" }).click({ modifiers: ["Shift"] });
  await grid.getByRole("button", { name: "Grid C3" }).click({ modifiers: ["Meta"] });
  await expect(grid.getByRole("button", { pressed: true })).toHaveCount(5);
  expect((await json(page, "grid-selection-json")).ranges).toHaveLength(2);

  await grid.getByRole("button", { name: "Fill grid selection" }).click();
  const filled = await json(page, "grid-document-json");
  expect(filled.rows[0].cells).toEqual({ a: "Selected", b: "Selected", c: "C1" });
  expect(filled.rows[2].cells.c).toBe("Selected");
  await grid.getByRole("button", { name: "Undo" }).click();
  await expect(grid.getByRole("button", { pressed: true })).toHaveCount(5);
});

test("Selection Lab keeps geometry in the Object host and selection in the set engine", async ({ page }) => {
  await page.goto("/demo/selection");
  const objects = page.getByRole("region", { name: "Objects selection variant" });
  const stage = page.getByTestId("object-stage");

  await drag(page, stage, { x: 8, y: 8 }, { x: 275, y: 125 });
  await expect(objects.getByRole("button", { pressed: true })).toHaveCount(2);
  expect(await json(page, "object-selection-json")).toEqual({
    selectedIds: ["object-a", "object-b"],
    primaryId: "object-b",
  });

  await page.keyboard.down("Shift");
  await drag(page, stage, { x: 230, y: 130 }, { x: 350, y: 225 });
  await page.keyboard.up("Shift");
  await expect(objects.getByRole("button", { pressed: true })).toHaveCount(3);
  expect((await json(page, "object-selection-json")).selectedIds).toEqual([
    "object-a",
    "object-b",
    "object-d",
  ]);

  await objects.getByRole("button", { name: "Color object selection" }).click();
  await objects.getByRole("button", { name: "Object Gamma" }).click();
  await objects.getByRole("button", { name: "Undo" }).click();
  expect((await json(page, "object-document-json")).objects.map((object: { color: string }) => object.color)).toEqual([
    "#f59e0b",
    "#3b82f6",
    "#10b981",
    "#f43f5e",
  ]);
  await expect(objects.getByRole("button", { pressed: true })).toHaveCount(3);
});

test("Selection Lab normalizes Tree ranges after host visibility changes", async ({ page }) => {
  await page.goto("/demo/selection");
  const tree = page.getByRole("region", { name: "Tree selection variant" });

  await tree.getByRole("button", { name: "Tree Alpha child" }).click();
  await tree.getByRole("button", { name: "Tree Beta child" }).click({ modifiers: ["Shift"] });
  await expect(tree.getByRole("button", { pressed: true })).toHaveCount(3);

  await tree.getByRole("button", { name: "Collapse Alpha" }).click();
  await expect(page.getByTestId("tree-visible-order")).toHaveText("visible: workspace → alpha → beta → beta-child");
  expect((await json(page, "tree-selection-json")).ranges).toEqual([
    { anchor: { nodeId: "alpha" }, focus: { nodeId: "beta-child" } },
  ]);
  await expect(tree.getByRole("button", { pressed: true })).toHaveCount(3);

  await tree.getByRole("button", { name: "Delete tree selection" }).click();
  expect((await json(page, "tree-document-json")).nodes.map((node: { id: string }) => node.id)).toEqual(["workspace"]);
  await tree.getByRole("button", { name: "Undo" }).click();
  expect((await json(page, "tree-document-json")).nodes).toHaveLength(5);
  expect((await json(page, "tree-selection-json")).ranges[0].anchor.nodeId).toBe("alpha");
});

async function json(page: Page, testId: string): Promise<any> {
  return JSON.parse(await page.getByTestId(testId).innerText());
}

async function drag(
  page: Page,
  target: Locator,
  start: { readonly x: number; readonly y: number },
  end: { readonly x: number; readonly y: number },
) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (box === null) throw new Error("Object stage has no bounds");
  await page.mouse.move(box.x + start.x, box.y + start.y);
  await page.mouse.down();
  await page.mouse.move(box.x + end.x, box.y + end.y, { steps: 6 });
  await page.mouse.up();
}
