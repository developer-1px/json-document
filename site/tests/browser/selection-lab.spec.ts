import { expect, test, type Locator, type Page } from "@playwright/test";

test("affordance와 family를 왕복해도 family별 selection이 보존된다", async ({ page }) => {
  await page.goto("/demo/selection");
  await expect(page.getByRole("heading", { level: 1, name: "Selection Workbench" })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Selection family" });
  const objects = page.getByRole("region", { name: "Objects selection workbench" });

  await objects.getByRole("button", { name: "Object Beta" }).click();
  await objects.getByRole("button", { name: "Object Gamma" }).click({ modifiers: ["Meta"] });
  expect((await json(page, "object-selection-json")).keys).toEqual(["beta", "gamma"]);

  await objects.getByRole("button", { name: "Layer list" }).click();
  await expect(objects.getByRole("button", { name: /Object /, pressed: true })).toHaveCount(2);
  await objects.getByRole("button", { name: "Cards" }).click();
  await expect(objects.getByRole("button", { name: /Object /, pressed: true })).toHaveCount(2);

  await navigation.getByRole("button", { name: /Order/ }).click();
  const order = page.getByRole("region", { name: "Order selection workbench" });
  await order.getByRole("button", { name: "Order Delta" }).click();
  expect((await json(page, "order-selection-json")).ranges[0].focus).toEqual({ recordId: "delta" });

  await navigation.getByRole("button", { name: /Objects/ }).click();
  expect((await json(page, "object-selection-json")).keys).toEqual(["beta", "gamma"]);
  await navigation.getByRole("button", { name: /Order/ }).click();
  expect((await json(page, "order-selection-json")).ranges[0].focus).toEqual({ recordId: "delta" });
});

test("한 family의 document mutation이 모든 projection에 나타나고 다른 family에서 undo된다", async ({ page }) => {
  await page.goto("/demo/selection");
  const navigation = page.getByRole("navigation", { name: "Selection family" });
  const objects = page.getByRole("region", { name: "Objects selection workbench" });

  await objects.getByRole("button", { name: "Object Beta" }).click();
  await objects.getByRole("button", { name: "Rename" }).click();
  await expect(page.getByTestId("shared-record-beta")).toContainText("Beta ★");
  expect((await json(page, "object-document-json")).records.find((record: { id: string }) => record.id === "beta").label).toBe("Beta ★");

  await navigation.getByRole("button", { name: /Order/ }).click();
  await expect(page.getByRole("region", { name: "Order selection workbench" }).getByRole("button", { name: "Order Beta ★" })).toBeVisible();
  await navigation.getByRole("button", { name: /Grid/ }).click();
  await expect(page.getByRole("region", { name: "Grid selection workbench" }).getByRole("button", { name: "Grid beta label" })).toContainText("Beta ★");
  await navigation.getByRole("button", { name: /Tree/ }).click();
  const tree = page.getByRole("region", { name: "Tree selection workbench" });
  await expect(tree.getByRole("button", { name: "Tree Beta ★" })).toBeVisible();

  await tree.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("shared-record-beta")).toContainText("Beta · Review");
  await expect(tree.getByRole("button", { name: "Tree Beta" })).toBeVisible();
  await navigation.getByRole("button", { name: /Objects/ }).click();
  expect((await json(page, "object-selection-json")).keys).toEqual(["beta"]);
  await expect(page.getByRole("region", { name: "Objects selection workbench" }).getByRole("button", { name: "Object Beta" })).toBeVisible();
});

test("shared record 삭제와 undo가 모든 family selection snapshot을 함께 reconcile한다", async ({ page }) => {
  await page.goto("/demo/selection");
  const navigation = page.getByRole("navigation", { name: "Selection family" });
  const objects = page.getByRole("region", { name: "Objects selection workbench" });

  await objects.getByRole("button", { name: "Delete" }).click();
  expect((await json(page, "object-document-json")).records.map((record: { id: string }) => record.id)).toEqual(["delta"]);
  expect(await json(page, "object-selection-json")).toEqual({ kind: "explicit", keys: [], primaryKey: null });

  await navigation.getByRole("button", { name: /Order/ }).click();
  expect((await json(page, "order-selection-json")).ranges).toEqual([]);
  await navigation.getByRole("button", { name: /Grid/ }).click();
  expect((await json(page, "grid-selection-json")).ranges).toEqual([]);
  await navigation.getByRole("button", { name: /Tree/ }).click();
  expect((await json(page, "tree-selection-json")).ranges).toEqual([]);
  await navigation.getByRole("button", { name: /Protocols/ }).click();
  expect(await json(page, "protocol-selection-json")).toEqual({ kind: "explicit", keys: [], primaryKey: null });

  await navigation.getByRole("button", { name: /Order/ }).click();
  const order = page.getByRole("region", { name: "Order selection workbench" });
  await order.getByRole("button", { name: "Undo" }).click();
  expect((await json(page, "order-document-json")).records).toHaveLength(4);
  expect((await json(page, "order-selection-json")).ranges[0].anchor).toEqual({ recordId: "alpha" });
  await navigation.getByRole("button", { name: /Objects/ }).click();
  expect(await json(page, "object-selection-json")).toEqual({ kind: "explicit", keys: ["alpha"], primaryKey: "alpha" });
});

test("geometry·topology·all·scope·mask와 inspector 계약을 같은 document에서 관찰한다", async ({ page }) => {
  await page.goto("/demo/selection");
  const navigation = page.getByRole("navigation", { name: "Selection family" });
  const objects = page.getByRole("region", { name: "Objects selection workbench" });

  await objects.getByLabel("Point hit mode").selectOption("deepest");
  await objects.getByRole("button", { name: "Hit overlap" }).click();
  expect(await json(page, "object-selection-json")).toEqual({ kind: "explicit", keys: ["alpha"], primaryKey: "alpha" });
  await objects.getByRole("button", { name: "Contract inspector" }).click();
  const inspector = page.getByTestId("object-contract-inspector");
  for (const heading of ["physical input", "platform adapter", "family command", "lifecycle result", "history policy"]) {
    await expect(inspector).toContainText(heading);
  }
  await expect(inspector).toContainText("deepest");

  await objects.getByLabel("Region hit mode").selectOption("contains");
  await drag(page, page.getByTestId("object-stage"), { x: 8, y: 8 }, { x: 145, y: 112 });
  expect((await json(page, "object-selection-json")).keys).toEqual(["alpha"]);

  await navigation.getByRole("button", { name: /Tree/ }).click();
  const tree = page.getByRole("region", { name: "Tree selection workbench" });
  await tree.getByRole("button", { name: "Tree Beta" }).click();
  await tree.getByRole("button", { name: "Tree Gamma" }).click({ modifiers: ["Shift"] });
  await tree.getByRole("button", { name: "Toggle Alpha" }).click();
  await expect(page.getByTestId("tree-visible-order")).toHaveText("visible: alpha → delta");
  expect((await json(page, "tree-selection-json")).ranges).toEqual([{ anchor: { recordId: "alpha" }, focus: { recordId: "alpha" } }]);

  await navigation.getByRole("button", { name: /Protocols/ }).click();
  const protocols = page.getByRole("region", { name: "Protocols selection workbench" });
  await protocols.getByRole("button", { name: "Select all" }).click();
  await protocols.getByRole("button", { name: "Exclude Beta" }).click();
  expect(await json(page, "protocol-selection-json")).toEqual({ kind: "all", universe: "workspace:v1", excludedKeys: ["beta"], primaryKey: "alpha" });
  await protocols.getByRole("button", { name: "Switch universe" }).click();
  expect(await json(page, "protocol-selection-json")).toEqual({ kind: "explicit", keys: [], primaryKey: null });
  await protocols.getByRole("button", { name: "Enter text edit" }).click();
  await protocols.getByRole("button", { name: "Soft mask" }).click();
  await protocols.getByRole("button", { name: "Raster strip" }).click();
  await expect(protocols.getByText("0.33", { exact: true })).toBeVisible();
  expect((await json(page, "protocol-document-json")).records).toHaveLength(4);
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
