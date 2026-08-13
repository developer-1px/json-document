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

test("Showcase presents every complete editor separately", async ({ page }) => {
  await page.goto("/demos");
  await expect(page.getByRole("heading", { level: 1, name: "Demo Showcase" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Document Demo" })).toHaveAttribute("href", "/demo");
  await expect(page.getByRole("link", { name: "Open Sheet Demo" })).toHaveAttribute("href", "/demo/sheet");
  await expect(page.getByRole("link", { name: "Open Database Demo" })).toHaveAttribute("href", "/demo/database");
});

async function json(page: Page, testId: string): Promise<any> {
  return JSON.parse(await page.getByTestId(testId).innerText());
}
