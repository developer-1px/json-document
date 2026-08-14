import { expect, test } from "@playwright/test";

test("Simple Canvas fills a selected object", async ({ page }) => {
  await page.goto("/demo/canvas");
  await expect(page.getByRole("heading", { level: 1, name: "Simple Canvas" })).toBeVisible();
  await page.getByRole("button", { name: "Note" }).click();
  await page.getByRole("button", { name: "Fill #4d6a8a" }).click();
  await expect(page.getByRole("button", { name: "Note" })).toHaveCSS("background-color", "rgb(77, 106, 138)");
});

test("Simple Tree uses host visible order and restores a cut with undo", async ({ page }) => {
  await page.goto("/demo/tree");
  await page.getByText("Inspect editing state", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Simple Tree" })).toBeVisible();
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

test("Simple Kanban moves a card to another column", async ({ page }) => {
  await page.goto("/demo/kanban");
  await expect(page.getByRole("heading", { level: 1, name: "Simple Kanban" })).toBeVisible();
  const card = page.getByRole("button", { name: "Write the brief" });
  const done = page.locator("[data-column-id=done]");
  await card.dragTo(done);
  await expect(done.getByRole("button", { name: "Write the brief" })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("[data-column-id=todo]").getByRole("button", { name: "Write the brief" })).toBeVisible();
});

async function json(page: import("@playwright/test").Page, testId: string) {
  return JSON.parse(await page.getByTestId(testId).innerText());
}
