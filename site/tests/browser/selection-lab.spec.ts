import { expect, test, type Locator, type Page } from "@playwright/test";

test("affordance 전환은 Objects family의 동일 session과 selection을 유지한다", async ({ page }) => {
  await page.goto("/demo/selection");
  await expect(page.getByRole("heading", { level: 1, name: "Selection Workbench" })).toBeVisible();

  const workbench = page.getByRole("region", { name: "Objects selection workbench" });
  await workbench.getByRole("button", { name: "Object Beta" }).click();
  await workbench.getByRole("button", { name: "Object Gamma" }).click({ modifiers: ["Meta"] });
  expect((await json(page, "object-selection-json")).keys).toEqual(["object-b", "object-c"]);

  await workbench.getByRole("button", { name: "Layer list" }).click();
  await expect(workbench.getByRole("button", { name: /Object /, pressed: true })).toHaveCount(2);
  expect((await json(page, "object-selection-json")).keys).toEqual(["object-b", "object-c"]);

  await workbench.getByRole("button", { name: "Cards" }).click();
  await expect(workbench.getByRole("button", { name: /Object /, pressed: true })).toHaveCount(2);
  expect((await json(page, "object-selection-json")).keys).toEqual(["object-b", "object-c"]);
});

test("Objects host는 geometry mode를 해석하고 inspector가 전체 계약 경로를 노출한다", async ({ page }) => {
  await page.goto("/demo/selection");
  const workbench = page.getByRole("region", { name: "Objects selection workbench" });

  await workbench.getByLabel("Point hit mode").selectOption("deepest");
  await workbench.getByRole("button", { name: "Hit overlap" }).click();
  expect(await json(page, "object-selection-json")).toEqual({ kind: "explicit", keys: ["object-a"], primaryKey: "object-a" });

  await workbench.getByRole("button", { name: "Contract inspector" }).click();
  const inspector = page.getByTestId("object-contract-inspector");
  await expect(inspector).toContainText("physical input");
  await expect(inspector).toContainText("platform adapter");
  await expect(inspector).toContainText("family command");
  await expect(inspector).toContainText("lifecycle result");
  await expect(inspector).toContainText("history policy");
  await expect(inspector).toContainText("deepest");
  await expect(page.getByTestId("object-timeline")).toContainText("deepest overlap hit");

  await workbench.getByLabel("Region hit mode").selectOption("contains");
  const stage = page.getByTestId("object-stage");
  await drag(page, stage, { x: 8, y: 8 }, { x: 145, y: 112 });
  expect((await json(page, "object-selection-json")).keys).toEqual(["object-a"]);
});

test("Order와 Grid는 range 상태, document history, native edit lease를 구분한다", async ({ page }) => {
  await page.goto("/demo/selection");
  await page.getByRole("navigation", { name: "Selection family" }).getByRole("button", { name: /Order/ }).click();
  const order = page.getByRole("region", { name: "Order selection workbench" });
  await order.getByRole("button", { name: "Order Beta" }).click();
  await order.getByRole("button", { name: "Order Delta" }).click({ modifiers: ["Shift"] });
  expect((await json(page, "order-selection-json")).ranges).toEqual([{ anchor: { itemId: "order-b" }, focus: { itemId: "order-d" } }]);
  await order.getByRole("button", { name: "Delete selection" }).click();
  expect((await json(page, "order-document-json")).items.map((item: { id: string }) => item.id)).toEqual(["order-a"]);
  await order.getByRole("button", { name: "Undo" }).click();
  await expect(order.getByRole("button", { name: /Order /, pressed: true })).toHaveCount(3);
  await expect(page.getByTestId("order-timeline")).toContainText("document-mutation");
  await expect(page.getByTestId("order-timeline")).toContainText("undo");

  await page.getByRole("navigation", { name: "Selection family" }).getByRole("button", { name: /Grid/ }).click();
  const grid = page.getByRole("region", { name: "Grid selection workbench" });
  await grid.getByRole("button", { name: "Grid A1" }).click();
  await grid.getByRole("button", { name: "Grid B2" }).click({ modifiers: ["Shift"] });
  await expect(grid.getByRole("button", { name: /Grid /, pressed: true })).toHaveCount(4);
  await grid.getByRole("button", { name: "Edit current" }).click();
  expect((await json(page, "grid-document-json")).editing).toEqual({ kind: "edit", lease: "cell:r2:b" });
  await grid.getByRole("button", { name: "Heatmap" }).click();
  await expect(grid.getByRole("button", { name: /Grid /, pressed: true })).toHaveCount(4);
});

test("Tree topology reconcile과 symbolic all·universe·scope·mask protocol을 관찰한다", async ({ page }) => {
  await page.goto("/demo/selection");
  const navigation = page.getByRole("navigation", { name: "Selection family" });
  await navigation.getByRole("button", { name: /Tree/ }).click();
  const tree = page.getByRole("region", { name: "Tree selection workbench" });
  await tree.getByRole("button", { name: "Tree Alpha child" }).click();
  await tree.getByRole("button", { name: "Tree Beta child" }).click({ modifiers: ["Shift"] });
  await tree.getByRole("button", { name: "Collapse Alpha", exact: true }).first().click();
  await expect(page.getByTestId("tree-visible-order")).toHaveText("visible: workspace → alpha → beta → beta-child");
  expect((await json(page, "tree-selection-json")).ranges).toEqual([{ anchor: { nodeId: "alpha" }, focus: { nodeId: "beta-child" } }]);
  await expect(page.getByTestId("tree-timeline")).toContainText("reconcile");

  await navigation.getByRole("button", { name: /Protocols/ }).click();
  const protocols = page.getByRole("region", { name: "Protocols selection workbench" });
  await protocols.getByRole("button", { name: "Select all" }).click();
  await protocols.getByRole("button", { name: "Exclude Beta" }).click();
  expect(await json(page, "protocol-selection-json")).toEqual({ kind: "all", universe: "filtered:demo:v1", excludedKeys: ["beta"], primaryKey: "alpha" });
  await protocols.getByRole("button", { name: "Switch universe" }).click();
  expect(await json(page, "protocol-selection-json")).toEqual({ kind: "explicit", keys: [], primaryKey: null });
  await protocols.getByRole("button", { name: "Enter text edit" }).click();
  await protocols.getByRole("button", { name: "Soft mask" }).click();
  const session = await json(page, "protocol-document-json");
  expect(session.scoped.scope).toBe("text");
  expect(session.editing).toEqual({ kind: "edit", lease: "native-text:label" });
  expect(session.mask).toEqual({ kind: "mask", representation: [0, 0.5, 1] });
  await protocols.getByRole("button", { name: "Raster strip" }).click();
  await expect(protocols.getByText("0.5", { exact: true })).toBeVisible();
});

async function json(page: Page, testId: string): Promise<any> {
  return JSON.parse(await page.getByTestId(testId).innerText());
}

async function drag(page: Page, target: Locator, start: { readonly x: number; readonly y: number }, end: { readonly x: number; readonly y: number }) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (box === null) throw new Error("Object stage has no bounds");
  await page.mouse.move(box.x + start.x, box.y + start.y);
  await page.mouse.down();
  await page.mouse.move(box.x + end.x, box.y + end.y, { steps: 6 });
  await page.mouse.up();
}
