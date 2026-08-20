import { expect, test, type Page } from "@playwright/test";

test("Widgets catalog redirects to affordance usage", async ({ page }) => {
  await page.goto("/widgets");
  await expect(page).toHaveURL(/\/docs\/affordance$/);
  await expect(page.getByRole("heading", { level: 1, name: "어포던스" })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Site navigation" });
  await expect(navigation.getByRole("link", { name: "고르기", exact: true })).toHaveAttribute("href", "/docs/affordance/select");
  await expect(navigation.getByRole("link", { name: "접기", exact: true })).toHaveAttribute("href", "/docs/affordance/fold");
  await expect(navigation.getByRole("link", { name: "드래그", exact: true })).toHaveAttribute("href", "/docs/affordance/drag");
  await expect(navigation.getByRole("link", { name: "되돌리기", exact: true })).toHaveAttribute("href", "/docs/affordance/history");
  const content = page.getByRole("main");
  await expect(content.getByRole("link", { name: "고르기" }).first()).toHaveAttribute("href", "/docs/affordance/select");
  await expect(content.getByRole("link", { name: "접기" }).first()).toHaveAttribute("href", "/docs/affordance/fold");
  await expect(content.getByRole("link", { name: "드래그" }).first()).toHaveAttribute("href", "/docs/affordance/drag");
  await expect(content.getByRole("link", { name: "되돌리기" }).first()).toHaveAttribute("href", "/docs/affordance/history");
  await expect(content.getByRole("link", { name: "초점" }).first()).toHaveAttribute("href", "/docs/affordance/focus");
  await expect(content.getByRole("link", { name: "크기 바꾸기" }).first()).toHaveAttribute("href", "/docs/affordance/resize");
});

test("Toolbar binds Undo and Redo to canUndo and canRedo", async ({ page }) => {
  await page.goto("/widgets/toolbar");
  const undo = page.getByRole("toolbar", { name: "History" }).getByRole("button", { name: "Undo" });
  const redo = page.getByRole("toolbar", { name: "History" }).getByRole("button", { name: "Redo" });
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  expect(await json(page, "widget-toolbar-commands")).toEqual({
    undo: { name: "undo", disabled: true },
    redo: { name: "redo", disabled: true },
  });

  await page.getByRole("option", { name: "Inbox" }).click();
  await page.keyboard.press("Delete");
  await expect(undo).toBeEnabled();
  expect(await json(page, "widget-toolbar-history")).toEqual({ canUndo: true, canRedo: false });
  expect(await json(page, "widget-toolbar-commands")).toEqual({
    undo: { name: "undo", disabled: false },
    redo: { name: "redo", disabled: true },
  });

  await page.getByRole("option", { name: "Today" }).click();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();
  await expect(page.getByRole("option", { name: "Inbox" })).toBeVisible();
  expect(await json(page, "widget-toolbar-keyboard")).toEqual({ type: "undo" });
});

test("Listbox reads selected keys and focus from Order", async ({ page }) => {
  await page.goto("/widgets/listbox");
  await page.getByRole("option", { name: "Today" }).click();
  expect(await json(page, "widget-listbox-selected")).toEqual(["today"]);
  expect(await json(page, "widget-listbox-focus")).toBe("today");

  await page.keyboard.down("Shift");
  await page.getByRole("option", { name: "Done" }).click();
  await page.keyboard.up("Shift");
  expect(await json(page, "widget-listbox-selected")).toEqual(["today", "later", "done"]);

  await page.getByRole("option", { name: "Today" }).click();
  await page.keyboard.press("ArrowDown");
  expect(await json(page, "widget-listbox-selected")).toEqual(["later"]);
  expect(await json(page, "widget-listbox-focus")).toBe("later");
  expect(await json(page, "widget-listbox-keyboard")).toEqual({
    type: "move",
    direction: "down",
    operation: "replace",
  });
});

test("Grid reads topology and selected cells from Sheet", async ({ page }) => {
  await page.goto("/widgets/grid");
  expect(await json(page, "widget-grid-topology")).toEqual({
    rowIds: ["alpha", "beta", "gamma"],
    columnIds: ["task", "owner"],
  });

  await page.getByRole("gridcell", { name: "Alpha" }).click();
  expect(await json(page, "widget-grid-selected")).toEqual([{ rowId: "alpha", columnId: "task" }]);

  await page.keyboard.down("Shift");
  await page.getByRole("gridcell", { name: "Theo" }).click();
  await page.keyboard.up("Shift");
  expect(await json(page, "widget-grid-selected")).toEqual([
    { rowId: "alpha", columnId: "task" },
    { rowId: "alpha", columnId: "owner" },
    { rowId: "beta", columnId: "task" },
    { rowId: "beta", columnId: "owner" },
  ]);

  await page.getByRole("gridcell", { name: "Alpha" }).click();
  await page.keyboard.press("ArrowRight");
  expect(await json(page, "widget-grid-selected")).toEqual([{ rowId: "alpha", columnId: "owner" }]);
  expect(await json(page, "widget-grid-keyboard")).toEqual({
    type: "move",
    direction: "right",
    operation: "replace",
  });
});

test("Document reads selected keys, focus, and text offset", async ({ page }) => {
  await page.goto("/widgets/document");
  await page.getByRole("option", { name: "Select a range" }).click();
  expect(await json(page, "widget-document-selected")).toEqual(["select"]);
  expect(await json(page, "widget-document-focus")).toBe("select");
  expect(await json(page, "widget-document-offset")).toEqual({
    write: null,
    select: 0,
    move: null,
  });
});

test("Canvas reads selected objects on a plane", async ({ page }) => {
  await page.goto("/widgets/canvas");
  await page.getByRole("option", { name: "Card" }).click();
  expect(await json(page, "widget-canvas-selected")).toEqual(["card"]);
  expect(await json(page, "widget-canvas-focus")).toBe("card");
});

test("Tree reads visible topology and selected keys", async ({ page }) => {
  await page.goto("/widgets/tree");
  expect(await json(page, "widget-tree-topology")).toEqual({
    visibleIds: ["fruit", "apple", "pear", "veg", "kale"],
  });
  await page.getByRole("treeitem", { name: "Apple" }).click();
  expect(await json(page, "widget-tree-selected")).toEqual(["apple"]);
  expect(await json(page, "widget-tree-focus")).toBe("apple");
});

test("Board reads columns and selected cards", async ({ page }) => {
  await page.goto("/widgets/board");
  expect(await json(page, "widget-board-columns")).toEqual([
    { id: "todo", cardIds: ["write", "review"] },
    { id: "doing", cardIds: ["draw"] },
    { id: "done", cardIds: [] },
  ]);
  await page.getByRole("option", { name: "Draw the board" }).click();
  expect(await json(page, "widget-board-selected")).toEqual(["draw"]);
  expect(await json(page, "widget-board-focus")).toBe("draw");
});

async function json(page: Page, testId: string): Promise<unknown> {
  return JSON.parse(await page.getByTestId(testId).innerText());
}
