import { expect, test } from "@playwright/test";

test("Canvas fills a selected object", async ({ page }) => {
  await page.goto("/demo/canvas");
  await expect(page.getByRole("heading", { level: 1, name: "Canvas", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Note" }).click();
  await page.getByRole("button", { name: "Fill #4d6a8a" }).click();
  await expect(page.getByRole("button", { name: "Note" })).toHaveCSS("background-color", "rgb(77, 106, 138)");
});

test("Order typeahead jumps to the matching label and Escape clears the buffer", async ({ page }) => {
  await page.goto("/demo/order");
  await page.getByLabel("Editable order").locator("ol").focus();
  await page.keyboard.type("T");
  await expect(page.getByRole("button", { name: /Today/ })).toHaveAttribute("data-selected", "true");
  await page.keyboard.press("Escape");
  await page.keyboard.type("I");
  await expect(page.getByRole("button", { name: /Inbox/ })).toHaveAttribute("data-selected", "true");
});

test("Canvas marquee selects several objects and Escape cancels it", async ({ page }) => {
  await page.goto("/demo/canvas");
  const note = page.getByRole("button", { name: "Note" });
  const card = page.getByRole("button", { name: "Card" });
  const chip = page.getByRole("button", { name: "Chip" });
  await card.click();
  await expect(card).toHaveAttribute("data-selected", "true");
  await expect(note).toHaveAttribute("data-selected", "false");

  const canvas = page.getByLabel("Canvas", { exact: true });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas bounding box");
  await canvas.focus();
  await page.mouse.move(box.x + box.width - 8, box.y + box.height - 8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 24, box.y + box.height - 24);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(card).toHaveAttribute("data-selected", "true");
  await expect(note).toHaveAttribute("data-selected", "false");

  await page.mouse.move(box.x + 8, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 8, box.y + box.height - 8);
  await page.mouse.up();
  await expect(note).toHaveAttribute("data-selected", "true");
  await expect(card).toHaveAttribute("data-selected", "true");
  await expect(chip).toHaveAttribute("data-selected", "true");
});

test("Canvas pan moves the viewport without writing object positions", async ({ page }) => {
  await page.goto("/demo/canvas");
  const note = page.getByRole("button", { name: "Note" });
  const canvas = page.getByLabel("Canvas", { exact: true });
  const origin = await note.boundingBox();
  if (!origin) throw new Error("note bounding box");
  await canvas.focus();
  await page.keyboard.down(" ");
  await page.mouse.move(origin.x + origin.width / 2, origin.y + origin.height / 2);
  await page.mouse.down();
  await page.mouse.move(origin.x + origin.width / 2 + 40, origin.y + origin.height / 2);
  await page.mouse.up();
  await page.keyboard.up(" ");
  const moved = await note.boundingBox();
  if (!moved) throw new Error("note bounding box after pan");
  expect(moved.x).toBeGreaterThan(origin.x + 20);
  await expect(note).toHaveCSS("left", "24px");
});

test("Canvas nudges a selected object and snaps a drag to the grid", async ({ page }) => {
  await page.goto("/demo/canvas");
  const note = page.getByRole("button", { name: "Note" });
  await note.click();
  await page.getByLabel("Canvas", { exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(note).toHaveCSS("left", "25px");

  const box = await note.boundingBox();
  if (!box) throw new Error("note bounding box");
  await note.hover();
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2);
  await page.mouse.up();
  await expect(note).toHaveCSS("left", "33px");
});

test("Tree uses host visible order and restores a cut with undo", async ({ page }) => {
  await page.goto("/demo/tree");
  await page.getByText("Inspect editing state", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tree", exact: true })).toBeVisible();
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

test("Kanban moves a card to another column", async ({ page }) => {
  await page.goto("/demo/kanban");
  await expect(page.getByRole("heading", { level: 1, name: "Kanban", exact: true })).toBeVisible();
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
