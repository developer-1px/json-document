import { expect, test } from "@playwright/test";

test("Order Demo copies, pastes, deletes, and restores with history", async ({ page }) => {
  await page.goto("/demo/order");
  await page.getByText("Inspect editing state", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Order Demo" })).toBeVisible();

  await page.getByRole("button", { name: "Inbox" }).click();
  await page.getByRole("button", { name: "Today" }).click({ modifiers: ["Shift"] });
  await expect(page.getByText("2 selected", { exact: false })).toBeVisible();
  await page.getByLabel("Order actions").getByRole("button", { name: "Copy", exact: true }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByLabel("Order actions").getByRole("button", { name: "Paste", exact: true }).click();
  await expect(page.locator('[data-item-id][data-selected="true"]')).toHaveCount(2);
  expect((await json(page, "order-demo-document")).items.map((item: { readonly label: string }) => item.label))
    .toEqual(["Inbox", "Today", "Later", "Done", "Inbox", "Today"]);

  await page.getByLabel("Order actions").getByRole("button", { name: "Delete" }).click();
  expect((await json(page, "order-demo-document")).items).toHaveLength(4);
  await page.getByLabel("Order actions").getByRole("button", { name: "Undo" }).click();
  expect((await json(page, "order-demo-document")).items).toHaveLength(6);
});

test("Object Demo fills selected keys and restores color with undo", async ({ page }) => {
  await page.goto("/demo/object");
  await page.getByText("Inspect editing state", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Object Demo" })).toBeVisible();

  await page.getByRole("button", { name: "Note" }).click();
  await page.getByRole("button", { name: "Card" }).click({ modifiers: ["Meta"] });
  await expect(page.getByText("2 selected", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Fill #4d6a8a" }).click();
  expect((await json(page, "object-demo-document")).objects.slice(0, 2).map((object: { readonly color: string }) => object.color))
    .toEqual(["#4d6a8a", "#4d6a8a"]);

  await page.getByLabel("Object actions").getByRole("button", { name: "Copy", exact: true }).click();
  await page.getByLabel("Object actions").getByRole("button", { name: "Paste", exact: true }).click();
  expect((await json(page, "object-demo-document")).objects).toHaveLength(5);
  await page.getByLabel("Object actions").getByRole("button", { name: "Undo" }).click();
  expect((await json(page, "object-demo-document")).objects).toHaveLength(3);
});

test("Tree Demo uses host visible order and restores a cut with undo", async ({ page }) => {
  await page.goto("/demo/tree");
  await page.getByText("Inspect editing state", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tree Demo" })).toBeVisible();
  expect(await json(page, "tree-demo-visible")).toEqual(["fruit", "apple", "pear", "veg", "kale", "pea"]);

  await page.getByRole("button", { name: "Collapse Fruit" }).click();
  expect(await json(page, "tree-demo-visible")).toEqual(["fruit", "veg", "kale", "pea"]);

  await page.getByRole("button", { name: "Vegetables", exact: true }).click();
  await page.getByLabel("Tree actions").getByRole("button", { name: "Cut", exact: true }).click();
  expect((await json(page, "tree-demo-document")).nodes.map((node: { readonly id: string }) => node.id))
    .toEqual(["fruit", "apple", "pear"]);
  await page.getByRole("button", { name: "Fruit", exact: true }).click();
  await page.getByLabel("Tree actions").getByRole("button", { name: "Paste", exact: true }).click();
  await page.getByLabel("Tree actions").getByRole("button", { name: "Undo" }).click();
  expect((await json(page, "tree-demo-document")).nodes.map((node: { readonly id: string }) => node.id))
    .toEqual(["fruit", "apple", "pear"]);
});

async function json(page: import("@playwright/test").Page, testId: string) {
  return JSON.parse(await page.getByTestId(testId).innerText());
}
