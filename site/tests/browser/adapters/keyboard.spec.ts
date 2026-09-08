import { expect, test } from "@playwright/test";

test("Keyboard adapter composes Intent, Clipboard, and History", async ({ page }) => {
  await page.goto("/adapters/keyboard");
  const surface = page.getByRole("region", { name: "Keyboard adapter surface" });
  await page.locator('[data-block-id="alpha"]').click({ position: { x: 8, y: 8 } });
  await surface.focus();

  await page.keyboard.press("g");
  expect(JSON.parse(await page.getByTestId("product-keyboard-command-json").innerText())).toEqual({
    type: "open-command-palette",
  });

  await page.keyboard.press("ArrowDown");
  expect(JSON.parse(await page.getByTestId("keyboard-command-json").innerText())).toEqual({
    type: "move",
    direction: "down",
    operation: "replace",
  });
  expect(JSON.parse(await page.getByTestId("keyboard-intent-json").innerText())).toMatchObject({
    type: "selection.set",
    blockId: "beta",
    mode: "replace",
  });
  expect(JSON.parse(await page.getByTestId("keyboard-selection-json").innerText()).ranges[0]?.focus.blockId).toBe("beta");
  await expect(page.getByTestId("keyboard-history-state")).not.toContainText("undo");

  const copied = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[aria-label="Keyboard adapter surface"]')!;
    const data = new DataTransfer();
    root.dispatchEvent(new ClipboardEvent("copy", { clipboardData: data, bubbles: true, cancelable: true }));
    return data.getData("text/plain");
  });
  expect(copied).toBe("Paste inserts a canonical block after the selection.");

  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[aria-label="Keyboard adapter surface"]')!;
    const data = new DataTransfer();
    root.dispatchEvent(new ClipboardEvent("copy", { clipboardData: data, bubbles: true, cancelable: true }));
    root.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  expect((await documentValue(page)).blocks).toHaveLength(4);
  expect(JSON.parse(await page.getByTestId("keyboard-intent-json").innerText()).type).toBe("clipboard.paste");
  await expect(page.getByTestId("keyboard-history-state")).toContainText("undo");

  await page.keyboard.press("ControlOrMeta+z");
  expect((await documentValue(page)).blocks).toHaveLength(3);
  await expect(page.getByTestId("keyboard-history-state")).not.toContainText("undo");

  await surface.focus();
  await page.keyboard.press("Delete");
  expect(JSON.parse(await page.getByTestId("keyboard-intent-json").innerText()).type).toBe("selection.remove");
  expect((await documentValue(page)).blocks.map((block) => block.id)).toEqual(["alpha", "gamma"]);
  await expect(page.getByTestId("keyboard-history-state")).toContainText("undo");

  await page.keyboard.press("ControlOrMeta+z");
  expect((await documentValue(page)).blocks.map((block) => block.id)).toEqual(["alpha", "beta", "gamma"]);
  expect(JSON.parse(await page.getByTestId("keyboard-selection-json").innerText()).ranges[0]?.focus.blockId).toBe("beta");
});

type DocumentValue = { blocks: Array<{ id: string; text: string }> };

async function documentValue(page: import("@playwright/test").Page): Promise<DocumentValue> {
  return JSON.parse(await page.getByTestId("keyboard-document-json").innerText()) as DocumentValue;
}
