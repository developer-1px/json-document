import { expect, test, type Page } from "@playwright/test";

test("Widgets catalog redirects to affordance usage", async ({ page }) => {
  await page.goto("/widgets");
  await expect(page).toHaveURL(/\/docs\/affordance$/);
  await expect(page.getByRole("heading", { level: 1, name: "Affordance" })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Site navigation" });
  await expect(navigation.getByRole("link", { name: "Select", exact: true })).toHaveAttribute("href", "/docs/affordance/select");
  await expect(navigation.getByRole("link", { name: "Expand/Collapse", exact: true })).toHaveAttribute("href", "/docs/affordance/fold");
  await expect(navigation.getByRole("link", { name: "Drag", exact: true })).toHaveAttribute("href", "/docs/affordance/drag");
  await expect(navigation.getByRole("link", { name: "Undo", exact: true })).toHaveAttribute("href", "/docs/affordance/history");
  const content = page.getByRole("main");
  await expect(content.getByRole("link", { name: "Select" }).first()).toHaveAttribute("href", "/docs/affordance/select");
  await expect(content.getByRole("link", { name: "Expand/Collapse" }).first()).toHaveAttribute("href", "/docs/affordance/fold");
  await expect(content.getByRole("link", { name: "Drag" }).first()).toHaveAttribute("href", "/docs/affordance/drag");
  await expect(content.getByRole("link", { name: "Undo" }).first()).toHaveAttribute("href", "/docs/affordance/history");
  await expect(content.getByRole("link", { name: "Focus" }).first()).toHaveAttribute("href", "/docs/affordance/focus");
  await expect(content.getByRole("link", { name: "Resize" }).first()).toHaveAttribute("href", "/docs/affordance/resize");
});

test("Toolbar binds Undo and Redo to canUndo and canRedo", async ({ page }) => {
  await page.goto("/widgets/toolbar");
  const listbox = page.getByRole("listbox", { name: "Order items" });
  const undo = page.getByRole("toolbar", { name: "History" }).getByRole("button", { name: "Undo" });
  const redo = page.getByRole("toolbar", { name: "History" }).getByRole("button", { name: "Redo" });
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  expect(await json(page, "widget-toolbar-commands")).toEqual({
    undo: { name: "undo", disabled: true },
    redo: { name: "redo", disabled: true },
  });

  await page.getByRole("option", { name: "Inbox" }).click();
  await expect(listbox).toBeFocused();
  await expect(listbox).toHaveAttribute("aria-activedescendant", "widget-toolbar-option-inbox");
  await page.keyboard.press("Delete");
  await expect(listbox).toHaveAttribute("aria-activedescendant", "widget-toolbar-option-today");
  await expect(page.locator("#widget-toolbar-option-today")).toHaveCount(1);
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

  await redo.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("option", { name: "Inbox" })).toHaveCount(0);
  await undo.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: "Inbox" })).toBeVisible();
});

test("Toolbar consumes canonical Command press timing and pointer cancellation", async ({ page }) => {
  await page.goto("/widgets/toolbar");
  const custom = page.getByRole("button", { name: "Select Today" });

  await custom.focus();
  await page.keyboard.press("Enter");
  expect(await json(page, "widget-toolbar-press-count")).toBe(1);
  await page.keyboard.press("Space");
  expect(await json(page, "widget-toolbar-press-count")).toBe(2);

  await custom.click();
  expect(await json(page, "widget-toolbar-press-count")).toBe(3);

  const box = await custom.boundingBox();
  if (!box) throw new Error("custom Press bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 20, box.y + box.height + 20);
  await page.mouse.up();
  expect(await json(page, "widget-toolbar-press-count")).toBe(3);
  await expect(custom).not.toHaveAttribute("data-pressed", "true");

  await custom.focus();
  await page.keyboard.down("Space");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Space");
  expect(await json(page, "widget-toolbar-press-count")).toBe(3);
  await expect(custom).not.toHaveAttribute("data-pressed", "true");

  await custom.dispatchEvent("click", { detail: 0 });
  expect(await json(page, "widget-toolbar-press-count")).toBe(4);
});

test("Listbox typeahead jumps to the matching label", async ({ page }) => {
  await page.goto("/widgets/listbox");
  await page.getByRole("listbox", { name: "Order items" }).focus();
  await page.keyboard.type("T");
  expect(await json(page, "widget-listbox-selected")).toEqual(["inbox"]);
  expect(await json(page, "widget-listbox-focus")).toBe("today");
});

test("Listbox leaves modified printable keys for history commands", async ({ page }) => {
  await page.goto("/widgets/listbox");
  const listbox = page.getByRole("listbox", { name: "Order items" });
  await page.getByRole("option", { name: "Today" }).click();
  await page.keyboard.press("Delete");
  await expect(page.getByRole("option", { name: "Today" })).toHaveCount(0);
  await listbox.focus();
  await page.keyboard.press("ControlOrMeta+Z");
  await expect(page.getByRole("option", { name: "Today" })).toBeVisible();
  await expect(listbox).toBeFocused();
});

test("Listbox keeps selection and active state separate", async ({ page }) => {
  await page.goto("/widgets/listbox");
  const listbox = page.getByRole("listbox", { name: "Order items" });
  await page.getByRole("option", { name: "Today" }).click();
  await expect(listbox).toBeFocused();
  await expect(listbox).toHaveAttribute("aria-activedescendant", "widget-listbox-option-today");
  expect(await json(page, "widget-listbox-selected")).toEqual(["today"]);
  expect(await json(page, "widget-listbox-focus")).toBe("today");

  await page.keyboard.down("Shift");
  await page.getByRole("option", { name: "Done" }).click();
  await page.keyboard.up("Shift");
  expect(await json(page, "widget-listbox-selected")).toEqual(["today", "later", "done"]);

  await page.getByRole("option", { name: "Today" }).click();
  await page.keyboard.press("ArrowDown");
  expect(await json(page, "widget-listbox-selected")).toEqual(["today"]);
  expect(await json(page, "widget-listbox-focus")).toBe("later");
  await expect(listbox).toHaveAttribute("aria-activedescendant", "widget-listbox-option-later");

  await page.keyboard.press("Enter");
  expect(await json(page, "widget-listbox-selected")).toEqual(["later"]);
  await page.keyboard.press("Delete");
  await expect(page.getByRole("option", { name: "Later" })).toHaveCount(0);
  await expect(listbox).toBeFocused();
  await expect(listbox).toHaveAttribute("aria-activedescendant", "widget-listbox-option-inbox");
  await expect(page.locator("#widget-listbox-option-done")).toHaveCount(1);
});

test("Grid reads topology and selected cells from Sheet", async ({ page }) => {
  await page.goto("/widgets/grid");
  expect(await json(page, "widget-grid-topology")).toEqual({
    rowIds: ["alpha", "beta", "gamma"],
    columnIds: ["task", "owner"],
  });

  await page.getByRole("gridcell", { name: "Alpha" }).click();
  const grid = page.getByRole("grid", { name: "Sheet cells" });
  await expect(grid).toBeFocused();
  await expect(grid).toHaveAttribute("aria-activedescendant", "widget-grid-cell-alpha-task");
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
  await expect(grid).toHaveAttribute("aria-activedescendant", "widget-grid-cell-alpha-owner");
  await expect(page.locator("#widget-grid-cell-alpha-owner")).toHaveCount(1);
});

test("Document reads selected keys, focus, and text offset", async ({ page }) => {
  await page.goto("/widgets/document");
  const document = page.getByRole("listbox", { name: "Document blocks" });
  await page.getByRole("option", { name: "Select a range" }).click();
  await expect(document).toBeFocused();
  await expect(document).toHaveAttribute("aria-activedescendant", "widget-document-option-select");
  expect(await json(page, "widget-document-selected")).toEqual(["select"]);
  expect(await json(page, "widget-document-focus")).toBe("select");
  expect(await json(page, "widget-document-offset")).toEqual({
    write: null,
    select: 0,
    move: null,
  });
  await page.keyboard.press("Delete");
  await expect(page.getByRole("option", { name: "Select a range" })).toHaveCount(0);
  await expect(document).toBeFocused();
  await expect(document).toHaveAttribute("aria-activedescendant", "widget-document-option-move");
  await expect(page.locator("#widget-document-option-move")).toHaveCount(1);
});

test("Canvas reads selected objects on a plane", async ({ page }) => {
  await page.goto("/widgets/canvas");
  const canvas = page.getByRole("listbox", { name: "Canvas objects" });
  await page.getByRole("option", { name: "Card" }).click();
  await expect(canvas).toBeFocused();
  await expect(canvas).toHaveAttribute("aria-activedescendant", "widget-canvas-option-card");
  expect(await json(page, "widget-canvas-selected")).toEqual(["card"]);
  expect(await json(page, "widget-canvas-focus")).toBe("card");
  await page.keyboard.press("Delete");
  await expect(page.getByRole("option", { name: "Card" })).toHaveCount(0);
  await expect(canvas).toBeFocused();
  await expect(canvas).toHaveAttribute("aria-activedescendant", "widget-canvas-option-chip");
  await expect(page.locator("#widget-canvas-option-chip")).toHaveCount(1);
});

test("Tree reads visible topology and selected keys", async ({ page }) => {
  await page.goto("/widgets/tree");
  expect(await json(page, "widget-tree-topology")).toEqual({
    visibleIds: ["fruit", "apple", "pear", "veg", "kale"],
  });
  const tree = page.getByRole("tree", { name: "Visible nodes" });
  await page.getByRole("treeitem", { name: "Apple" }).click();
  await expect(tree).toBeFocused();
  await expect(tree).toHaveAttribute("aria-activedescendant", "widget-tree-item-apple");
  await expect(page.getByRole("treeitem", { name: "Fruit" })).toHaveAttribute("aria-expanded", "true");
  expect(await json(page, "widget-tree-selected")).toEqual(["apple"]);
  expect(await json(page, "widget-tree-focus")).toBe("apple");
});

test("Tree left collapses and right expands the focused parent", async ({ page }) => {
  await page.goto("/widgets/tree");
  await page.getByRole("treeitem", { name: "Fruit" }).click();
  await page.keyboard.press("ArrowLeft");
  expect(await json(page, "widget-tree-topology")).toEqual({
    visibleIds: ["fruit", "veg", "kale"],
  });
  await page.keyboard.press("ArrowRight");
  expect(await json(page, "widget-tree-topology")).toEqual({
    visibleIds: ["fruit", "apple", "pear", "veg", "kale"],
  });

  await page.keyboard.press("ArrowRight");
  expect(await json(page, "widget-tree-focus")).toBe("apple");
  await page.getByRole("treeitem", { name: "Pear" }).click();
  await page.keyboard.press("ArrowLeft");
  expect(await json(page, "widget-tree-focus")).toBe("fruit");
  await page.getByRole("treeitem", { name: "Apple" }).click();
  await page.keyboard.press("ArrowRight");
  expect(await json(page, "widget-tree-focus")).toBe("apple");
});

test("Tree exposes treeitems without nested native controls", async ({ page }) => {
  await page.goto("/widgets/tree");
  const tree = page.getByRole("tree", { name: "Visible nodes" });
  await expect(tree.getByRole("button")).toHaveCount(0);
  await expect(tree.getByRole("treeitem")).toHaveCount(5);
  await expect(page.getByRole("treeitem", { name: "Fruit" })).toHaveAttribute("aria-level", "1");
  await expect(page.getByRole("treeitem", { name: "Fruit" })).toHaveAttribute("aria-posinset", "1");
  await expect(page.getByRole("treeitem", { name: "Fruit" })).toHaveAttribute("aria-setsize", "2");
  await expect(page.getByRole("treeitem", { name: "Pear" })).toHaveAttribute("aria-level", "2");
  await expect(page.getByRole("treeitem", { name: "Pear" })).toHaveAttribute("aria-posinset", "2");
  await expect(page.getByRole("treeitem", { name: "Pear" })).toHaveAttribute("aria-setsize", "2");
});

test("Board reads columns and selected cards", async ({ page }) => {
  await page.goto("/widgets/board");
  await expect(page.getByRole("group", { name: "Board columns" })).toBeVisible();
  expect(await json(page, "widget-board-columns")).toEqual([
    { id: "todo", cardIds: ["write", "review"] },
    { id: "doing", cardIds: ["draw"] },
    { id: "done", cardIds: [] },
  ]);
  await page.getByRole("option", { name: "Draw the board" }).click();
  const doing = page.getByRole("listbox", { name: "Doing" });
  await expect(doing).toBeFocused();
  await expect(doing).toHaveAttribute("aria-activedescendant", "widget-board-option-draw");
  expect(await json(page, "widget-board-selected")).toEqual(["draw"]);
  expect(await json(page, "widget-board-focus")).toBe("draw");

  await page.keyboard.press("ArrowUp");
  const todo = page.getByRole("listbox", { name: "Todo" });
  await expect(todo).toBeFocused();
  await expect(todo).toHaveAttribute("aria-activedescendant", "widget-board-option-review");
  await expect(doing).not.toHaveAttribute("aria-activedescendant", /.+/);
  await page.keyboard.press("Delete");
  await expect(page.getByRole("option", { name: "Review copy" })).toHaveCount(0);
  await expect(doing).toBeFocused();
  await expect(doing).toHaveAttribute("aria-activedescendant", "widget-board-option-draw");
  await expect(todo).not.toHaveAttribute("aria-activedescendant", /.+/);
  await expect(page.locator("#widget-board-option-draw")).toHaveCount(1);
});

test("Board modifier click toggles cards and drag moves a card", async ({ page }) => {
  await page.goto("/widgets/board");
  await page.getByRole("option", { name: "Write the brief" }).click();
  await page.keyboard.down("ControlOrMeta");
  await page.getByRole("option", { name: "Review copy" }).click();
  await page.keyboard.up("ControlOrMeta");
  expect(await json(page, "widget-board-selected")).toEqual(["write", "review"]);

  await page.getByRole("option", { name: "Write the brief" }).dragTo(page.getByRole("listbox", { name: "Done" }));
  expect(await json(page, "widget-board-columns")).toEqual([
    { id: "todo", cardIds: ["review"] },
    { id: "doing", cardIds: ["draw"] },
    { id: "done", cardIds: ["write"] },
  ]);

  await page.getByRole("option", { name: "Draw the board" }).dragTo(
    page.getByRole("option", { name: "Review copy" }),
  );
  expect(await json(page, "widget-board-columns")).toEqual([
    { id: "todo", cardIds: ["draw", "review"] },
    { id: "doing", cardIds: [] },
    { id: "done", cardIds: ["write"] },
  ]);
});

test("Canvas escape cancels an in-progress marquee", async ({ page }) => {
  await page.goto("/widgets/canvas");
  await page.getByRole("option", { name: "Card" }).click();
  expect(await json(page, "widget-canvas-selected")).toEqual(["card"]);
  const canvas = page.getByRole("listbox", { name: "Canvas objects" });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas bounding box");
  await canvas.focus();
  await page.mouse.move(box.x + box.width - 24, box.y + box.height - 24);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 8, box.y + box.height - 8);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(await json(page, "widget-canvas-selected")).toEqual(["card"]);
});

async function json(page: Page, testId: string): Promise<unknown> {
  return JSON.parse(await page.getByTestId(testId).innerText());
}
