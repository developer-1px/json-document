import { expect, test, type Page } from "@playwright/test";

test("Selection Demo changes Selection without changing document or History", async ({ page }) => {
  await page.goto("/demo/selection");
  const before = await json(page, "selection-demo-document");

  await page.getByRole("button", { name: "extend" }).click();
  await page.getByRole("button", { name: /charlie/ }).click();

  expect((await json(page, "selection-demo-selection")).ranges[0]).toMatchObject({
    anchor: { blockId: "alpha" },
    focus: { blockId: "charlie" },
  });
  expect(await json(page, "selection-demo-document")).toEqual(before);
  expect(await json(page, "selection-demo-history")).toEqual({ canUndo: false, canRedo: false });
});

test("Topology Demo recomputes the interval from visible order", async ({ page }) => {
  await page.goto("/demo/topology");
  expect(await json(page, "topology-demo-interval")).toEqual(["alpha", "bravo", "charlie"]);

  await page.getByRole("button", { name: "sorted" }).click();
  expect(await json(page, "topology-demo-interval")).toEqual(["alpha", "delta", "charlie"]);
  expect(await json(page, "topology-demo-endpoints")).toEqual({ anchor: "alpha", focus: "charlie" });
});

test("Clipboard Demo carries Selection through payload and paste", async ({ page }) => {
  await page.goto("/demo/clipboard");
  await page.getByRole("button", { name: "Copy this block" }).click();
  await page.getByRole("region", { name: "복사할 블록 선택하기" }).getByRole("button", { name: "Copy", exact: true }).click();
  expect((await json(page, "clipboard-demo-payload")).blocks).toHaveLength(1);

  await page.getByRole("button", { name: "payload 붙여넣기" }).click();
  expect((await json(page, "clipboard-demo-document")).blocks).toHaveLength(4);
});

test("History Demo restores document value and Selection together", async ({ page }) => {
  await page.goto("/demo/history");
  const initialValue = await json(page, "history-demo-document");
  const initialSelection = await json(page, "history-demo-selection");

  await page.getByRole("button", { name: "편집 적용" }).click();
  const editedValue = await json(page, "history-demo-document");
  const editedSelection = await json(page, "history-demo-selection");
  expect(editedValue).not.toEqual(initialValue);
  expect(editedSelection).not.toEqual(initialSelection);

  await page.getByRole("button", { name: "Undo" }).click();
  expect(await json(page, "history-demo-document")).toEqual(initialValue);
  expect(await json(page, "history-demo-selection")).toEqual(initialSelection);

  await page.getByRole("button", { name: "Redo" }).click();
  expect(await json(page, "history-demo-document")).toEqual(editedValue);
  expect(await json(page, "history-demo-selection")).toEqual(editedSelection);
});

test("Hands document embeds genre demos instead of linking standalone pages", async ({ page }) => {
  await page.goto("/editors");
  const article = page.getByRole("article");
  await expect(page.getByRole("heading", { level: 1, name: "Hands" })).toBeVisible();
  await expect(article.locator('[data-live-demo="/demo"]')).toBeVisible();
  await expect(article.getByRole("link", { name: "Order" })).toHaveAttribute("href", "/docs/order");
  await expect(article.getByRole("link", { name: "Object" })).toHaveAttribute("href", "/docs/object");
  await expect(article.getByRole("link", { name: "Tree" })).toHaveAttribute("href", "/docs/tree");
  await expect(article.locator('[data-live-demo="/demo/sheet"]')).toBeVisible();
  await expect(article.locator('[data-live-demo="/demo/kanban"]')).toBeVisible();
  await expect(article.getByRole("link", { name: "Database" })).toHaveAttribute("href", "/docs/database");
  await expect(article.getByRole("link", { name: "Composer" })).toHaveAttribute("href", "/docs/composer");
  await expect(article.getByRole("link", { name: "Mention" })).toHaveAttribute("href", "/docs/mention");
});

test("legacy Showcase path opens Hands", async ({ page }) => {
  await page.goto("/demos");
  await expect(page).toHaveURL(/\/editors$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hands" })).toBeVisible();
});

async function json(page: Page, testId: string): Promise<any> {
  return JSON.parse(await page.getByTestId(testId).innerText());
}
