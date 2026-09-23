import { expect, test } from "@playwright/test";

test("Object routes platform history shortcuts from its editing surface", async ({ page }) => {
  await page.goto("/demo/object");
  const note = page.getByRole("button", { name: "Note" });
  await note.click();
  await page.getByRole("button", { name: "Fill #4d6a8a" }).click();
  await expect(note).toHaveCSS("background-color", "rgb(77, 106, 138)");
  await note.focus();
  await page.keyboard.press("ControlOrMeta+Z");
  await expect(note).toHaveCSS("background-color", "rgb(222, 109, 85)");
  await page.keyboard.press("ControlOrMeta+Shift+Z");
  await expect(note).toHaveCSS("background-color", "rgb(77, 106, 138)");
});

test("Object uses native clipboard and a separate canonical duplicate command", async ({ page }) => {
  await page.goto("/demo/object");
  const note = page.getByRole("button", { name: "Note" });
  await note.click();
  await page.keyboard.press("ControlOrMeta+C");
  await page.getByRole("button", { name: "Card" }).click();
  await page.keyboard.press("ControlOrMeta+V");
  await expect(page.getByRole("button", { name: "Note" })).toHaveCount(2);
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(page.getByRole("button", { name: "Note" })).toHaveCount(3);
  const notes = (await json(page, "object-demo-document")).objects
    .filter((object: { readonly label: string }) => object.label === "Note");
  expect(notes.map((object: { readonly x: number; readonly y: number }) => [object.x, object.y]))
    .toEqual([[24, 24], [48, 48], [72, 72]]);
});

test("Order repeated select-all and cancelled rename preserve selected items and document history", async ({ page }) => {
  await page.goto("/demo/order");
  const order = page.getByLabel("Editable order").locator("ol");
  await order.focus();
  for (const modifier of ["Meta", "Control"]) {
    await order.press(`${modifier}+a`);
    await order.press(`${modifier}+a`);
    await expect(order.locator('[data-selected="true"]')).toHaveCount(4);
  }
  await order.press("F2");
  const rename = page.getByRole("textbox", { name: "Rename Inbox" });
  await rename.fill("Unsaved");
  await rename.press("Escape");
  await expect(page.getByRole("button", { name: /Inbox/ })).toBeFocused();
  await expect(order.locator('[data-selected="true"]')).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
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

test("Order moves focus without changing selection and renames the focused item", async ({ page }) => {
  await page.goto("/demo/order");
  const order = page.getByLabel("Editable order").locator("ol");
  const inbox = page.getByRole("button", { name: /Inbox/ });
  const today = page.getByRole("button", { name: /Today/ });
  await order.focus();
  await expect(inbox).toHaveAttribute("data-selected", "true");
  await expect(inbox).toHaveAttribute("data-focus", "true");

  await page.keyboard.press("ArrowDown");
  await expect(today).toHaveAttribute("data-focus", "true");
  await expect(today).toHaveAttribute("data-selected", "false");
  await expect(inbox).toHaveAttribute("data-selected", "true");

  await page.keyboard.press("F2");
  const rename = page.getByRole("textbox", { name: "Rename Today" });
  await rename.fill("Now");
  await rename.press("Enter");
  await expect(page.getByRole("button", { name: /Now/ })).toBeVisible();
  await expect(inbox).toHaveAttribute("data-selected", "true");

  await page.keyboard.press("ControlOrMeta+Z");
  await expect(page.getByRole("button", { name: /Today/ })).toBeVisible();
});

test("Order native copy and paste bypass typeahead", async ({ page }) => {
  await page.goto("/demo/order");
  const today = page.getByRole("button", { name: /Today/ });
  const later = page.getByRole("button", { name: /Later/ });
  await today.click();
  await page.keyboard.press("ControlOrMeta+C");
  await later.click();
  await page.keyboard.press("ControlOrMeta+V");
  await expect(page.getByRole("button", { name: /Today/ })).toHaveCount(2);
});

test("Document dogfoods caret and native double and triple click counts", async ({ page }) => {
  await page.goto("/demo");
  const text = page.getByRole("textbox", { name: "Block 1 text" });
  await expect(text).toHaveCSS("cursor", "text");
  await text.click({ clickCount: 2 });
  await expect(page.getByTestId("document-click-count")).toHaveText("click count 2");
  await text.click({ clickCount: 3 });
  await expect(page.getByTestId("document-click-count")).toHaveText("click count 3");
});

test("Tree repeated select-all uses the collapsed visible topology", async ({ page }) => {
  await page.goto("/demo/tree");
  await page.getByRole("button", { name: "Collapse Fruit" }).click();
  const tree = page.getByLabel("Editable tree").locator("ul");
  await tree.focus();
  for (const modifier of ["Meta", "Control"]) {
    await tree.press(`${modifier}+a`);
    await tree.press(`${modifier}+a`);
    await expect(tree.locator('[data-selected="true"]')).toHaveCount(4);
    await expect(page.getByRole("button", { name: "Apple", exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
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

test("Tree composes native clipboard events with visible topology", async ({ page }) => {
  await page.goto("/demo/tree");
  await page.getByRole("button", { name: "Vegetables", exact: true }).click();
  await page.keyboard.press("ControlOrMeta+C");
  await page.getByRole("button", { name: "Fruit", exact: true }).click();
  await page.keyboard.press("ControlOrMeta+V");
  await expect(page.getByRole("button", { name: "Vegetables", exact: true })).toHaveCount(2);
});

test("Kanban moves a card to another column", async ({ page }) => {
  await page.goto("/demo/kanban");
  await expect(page.getByRole("heading", { level: 1, name: "Kanban", exact: true })).toBeVisible();
  const card = page.getByRole("button", { name: "Write the brief" });
  const done = page.locator("[data-kanban-column-id=done]");
  await card.dragTo(done);
  await expect(done.getByRole("button", { name: "Write the brief" })).toBeVisible();
  await page.getByLabel("Kanban board").focus();
  await page.keyboard.press("ControlOrMeta+Z");
  await expect(page.locator("[data-kanban-column-id=todo]").getByRole("button", { name: "Write the brief" })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Shift+Z");
  await expect(done.getByRole("button", { name: "Write the brief" })).toBeVisible();

  await page.getByRole("button", { name: "Draw the board" }).dragTo(
    page.getByRole("button", { name: "Review copy" }),
  );
  await expect(page.locator("[data-kanban-column-id=todo] [data-kanban-card-id]")).toHaveText([
    "Draw the board",
    "Review copy",
  ]);
});

async function json(page: import("@playwright/test").Page, testId: string) {
  return JSON.parse(await page.getByTestId(testId).innerText());
}
