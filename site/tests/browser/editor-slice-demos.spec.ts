import { expect, test } from "@playwright/test";

test("Canvas selection keeps objects absolutely positioned", async ({ page }) => {
  await page.goto("/demo/canvas");
  const note = page.getByRole("button", { name: "Note" });
  const card = page.getByRole("button", { name: "Card" });
  const chip = page.getByRole("button", { name: "Chip" });
  const before = await Promise.all([note, card, chip].map((item) => item.boundingBox()));
  await card.click();
  for (const item of [note, card, chip]) {
    await expect.poll(() => item.evaluate((el) => getComputedStyle(el).position)).toBe("absolute");
  }
  const after = await Promise.all([note, card, chip].map((item) => item.boundingBox()));
  after.forEach((box, index) => {
    expect(box?.x).toBeCloseTo(before[index]?.x ?? 0, 0);
    expect(box?.y).toBeCloseTo(before[index]?.y ?? 0, 0);
  });
});

test("Canvas fills a selected object", async ({ page }) => {
  await page.goto("/demo/canvas");
  await expect(page.getByRole("heading", { level: 1, name: "Canvas", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Note" }).click();
  await page.getByRole("button", { name: "Fill #4d6a8a" }).click();
  await expect(page.getByRole("button", { name: "Note" })).toHaveCSS("background-color", "rgb(77, 106, 138)");
});

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

test("Object composes native clipboard events with its paste offset", async ({ page }) => {
  await page.goto("/demo/object");
  const note = page.getByRole("button", { name: "Note" });
  await note.click();
  await page.keyboard.press("ControlOrMeta+C");
  await page.getByRole("button", { name: "Card" }).click();
  await page.keyboard.press("ControlOrMeta+V");
  await expect(page.getByRole("button", { name: "Note" })).toHaveCount(2);
  const notes = (await json(page, "object-demo-document")).objects
    .filter((object: { readonly label: string }) => object.label === "Note");
  expect(notes.map((object: { readonly x: number; readonly y: number }) => [object.x, object.y]))
    .toEqual([[24, 24], [48, 48]]);
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

test("Canvas drags every selected object together", async ({ page }) => {
  await page.goto("/demo/canvas");
  const note = page.getByRole("button", { name: "Note" });
  const card = page.getByRole("button", { name: "Card" });
  const chip = page.getByRole("button", { name: "Chip" });
  const canvas = page.getByLabel("Canvas", { exact: true });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas bounding box");
  await page.mouse.move(box.x + 8, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 8, box.y + box.height - 8);
  await page.mouse.up();
  await expect(note).toHaveAttribute("data-selected", "true");
  await expect(card).toHaveAttribute("data-selected", "true");
  await expect(chip).toHaveAttribute("data-selected", "true");

  const before = await Promise.all([note, card, chip].map((item) => item.evaluate((el) => ({
    left: parseFloat((el as HTMLElement).style.left),
    top: parseFloat((el as HTMLElement).style.top),
  }))));
  const noteBox = await note.boundingBox();
  if (!noteBox) throw new Error("note bounding box");
  await note.hover();
  await page.mouse.down();
  await page.mouse.move(noteBox.x + noteBox.width / 2 + 40, noteBox.y + noteBox.height / 2);
  await page.mouse.up();
  const after = await Promise.all([note, card, chip].map((item) => item.evaluate((el) => ({
    left: parseFloat((el as HTMLElement).style.left),
    top: parseFloat((el as HTMLElement).style.top),
  }))));
  const dx = after[0].left - before[0].left;
  expect(dx).toBeGreaterThan(0);
  expect(after[1].left - before[1].left).toBe(dx);
  expect(after[2].left - before[2].left).toBe(dx);
  expect(after[0].top).toBe(before[0].top);
  expect(after[1].top).toBe(before[1].top);
  expect(after[2].top).toBe(before[2].top);
});

test("Canvas empty click and idle Escape clear selection", async ({ page }) => {
  await page.goto("/demo/canvas");
  const note = page.getByRole("button", { name: "Note" });
  const card = page.getByRole("button", { name: "Card" });
  const canvas = page.getByLabel("Canvas", { exact: true });
  await card.click();
  await expect(card).toHaveAttribute("data-selected", "true");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas bounding box");
  await canvas.click({ position: { x: box.width - 12, y: box.height - 12 } });
  await expect(card).toHaveAttribute("data-selected", "false");
  await expect(note).toHaveAttribute("data-selected", "false");

  await note.click();
  await expect(note).toHaveAttribute("data-selected", "true");
  await canvas.focus();
  await page.keyboard.press("Escape");
  await expect(note).toHaveAttribute("data-selected", "false");
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
  await page.getByRole("button", { name: "Card" }).click();
  await expect(note).toHaveCSS("left", "33px");
  await expect(page.getByRole("button", { name: "Card" })).toHaveAttribute("data-selected", "true");
});

test("Canvas select-all, delete, and locked objects", async ({ page }) => {
  await page.goto("/demo/canvas");
  const canvas = page.getByLabel("Canvas", { exact: true });
  const note = page.getByRole("button", { name: "Note" });
  const lock = page.getByRole("button", { name: "Lock" });
  await canvas.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await expect(note).toHaveAttribute("data-selected", "true");
  await expect(page.getByRole("button", { name: "Card" })).toHaveAttribute("data-selected", "true");
  await expect(lock).toHaveAttribute("data-selected", "false");

  await lock.click();
  await expect(lock).toHaveAttribute("data-selected", "false");
  await expect(note).toHaveAttribute("data-selected", "true");

  await note.click();
  await canvas.focus();
  await page.keyboard.press("Delete");
  await expect(page.getByRole("button", { name: "Note" })).toHaveCount(0);
});

test("Canvas right-click opens a menu without clearing selection", async ({ page }) => {
  await page.goto("/demo/canvas");
  const card = page.getByRole("button", { name: "Card" });
  const canvas = page.getByLabel("Canvas", { exact: true });
  await card.click();
  await expect(card).toHaveAttribute("data-selected", "true");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas bounding box");
  await canvas.click({ button: "right", position: { x: box.width - 12, y: box.height - 12 } });
  await expect(page.getByRole("menu", { name: "Canvas menu" })).toBeVisible();
  await expect(card).toHaveAttribute("data-selected", "true");
  await expect(page.getByRole("button", { name: "Note" })).toHaveAttribute("data-selected", "false");
});

test("Canvas copy-drag, constrain, resize, and zoom", async ({ page }) => {
  await page.goto("/demo/canvas");
  const note = page.getByRole("button", { name: "Note" });
  const canvas = page.getByLabel("Canvas", { exact: true });
  await note.click();
  const before = await note.evaluate((el) => ({
    left: parseFloat((el as HTMLElement).style.left),
    top: parseFloat((el as HTMLElement).style.top),
    width: parseFloat((el as HTMLElement).style.width),
  }));

  const box = await note.boundingBox();
  if (!box) throw new Error("note bounding box");
  await note.hover();
  await page.mouse.down();
  await page.keyboard.down("Shift");
  await page.mouse.move(box.x + box.width / 2 + 48, box.y + box.height / 2 + 6);
  await page.mouse.up();
  await page.keyboard.up("Shift");
  const constrained = await note.evaluate((el) => ({
    left: parseFloat((el as HTMLElement).style.left),
    top: parseFloat((el as HTMLElement).style.top),
  }));
  expect(constrained.left).toBeGreaterThan(before.left);
  expect(constrained.top).toBe(before.top);

  await note.click();
  const handle = page.locator("[data-resize-edge=se][data-object-id=note]");
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("resize handle");
  await handle.hover();
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + 24, handleBox.y + handleBox.height / 2 + 16);
  await page.mouse.up();
  const resized = await note.evaluate((el) => parseFloat((el as HTMLElement).style.width));
  expect(resized).toBeGreaterThan(before.width);

  await note.click();
  await page.keyboard.down("Alt");
  const noteBox = await note.boundingBox();
  if (!noteBox) throw new Error("note bounding box");
  await note.hover();
  await page.mouse.down();
  await page.mouse.move(noteBox.x + noteBox.width / 2 + 40, noteBox.y + noteBox.height / 2);
  await page.mouse.up();
  await page.keyboard.up("Alt");
  await expect(page.getByRole("button", { name: "Note" })).toHaveCount(2);

  await canvas.focus();
  await canvas.evaluate((element) => {
    element.dispatchEvent(new WheelEvent("wheel", { deltaY: -80, ctrlKey: true, bubbles: true, cancelable: true }));
  });
  const scale = await canvas.evaluate((element) => {
    const inner = element.querySelector(":scope > div");
    return inner ? getComputedStyle(inner).transform : "";
  });
  expect(scale).toMatch(/matrix\((1\.[1-9]|[2-9])/);
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
  const done = page.locator("[data-column-id=done]");
  await card.dragTo(done);
  await expect(done.getByRole("button", { name: "Write the brief" })).toBeVisible();
  await page.getByLabel("Kanban board").focus();
  await page.keyboard.press("ControlOrMeta+Z");
  await expect(page.locator("[data-column-id=todo]").getByRole("button", { name: "Write the brief" })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Shift+Z");
  await expect(done.getByRole("button", { name: "Write the brief" })).toBeVisible();
});

async function json(page: import("@playwright/test").Page, testId: string) {
  return JSON.parse(await page.getByTestId(testId).innerText());
}
