import { expect, test, type Page } from "@playwright/test";

test("Document repeated select-all preserves blocks and leaves native text selection owned by the field", async ({ page }) => {
  await page.goto("/demo");
  const surface = page.getByRole("region", { name: "Editable document" }).locator('[tabindex="0"]');
  await surface.focus();
  for (const modifier of ["Meta", "Control"]) {
    await surface.press(`${modifier}+a`);
    await surface.press(`${modifier}+a`);
    await expect(page.locator('article[data-block-id][data-selected="true"]')).toHaveCount(4);
  }
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  const field = page.getByRole("textbox", { name: "Block 1 text" });
  await field.click();
  await field.press("ControlOrMeta+a");
  await expect.poll(() => field.evaluate((node: HTMLTextAreaElement) => [node.selectionStart, node.selectionEnd]))
    .toEqual([0, (await field.inputValue()).length]);
  await expect(page.locator('article[data-block-id][data-selected="true"]')).toHaveCount(1);
});

test("Document keeps native caret and directional range offsets in the editor", async ({ page }) => {
  await page.goto("/demo");
  await page.getByText("Inspect editing state", { exact: true }).click();
  const before = await canonicalDocument(page);
  const text = page.getByRole("textbox", { name: "Block 1 text" });
  const intent = async () => JSON.parse(await page.getByTestId("document-intent-json").innerText());
  await text.focus();
  await text.press("ArrowRight");
  await expect.poll(intent).toMatchObject({ type: "selection.set", blockId: "welcome", offset: 1 });
  await text.press("ArrowRight");
  await expect.poll(intent).toMatchObject({ type: "selection.set", blockId: "welcome", offset: 2 });
  await text.press("Shift+ArrowRight");
  await expect.poll(intent).toMatchObject({ type: "selection.set", blockId: "welcome", offset: 3 });
  await expect.poll(() => text.evaluate((node: HTMLTextAreaElement) => [node.selectionStart, node.selectionEnd])).toEqual([2, 3]);
  await text.press("Shift+ArrowLeft");
  await expect.poll(intent).toMatchObject({ type: "selection.set", blockId: "welcome", offset: 2 });
  await text.press("Shift+ArrowLeft");
  await expect.poll(intent).toMatchObject({ type: "selection.set", blockId: "welcome", offset: 1 });
  await expect.poll(() => text.evaluate((node: HTMLTextAreaElement) => [node.selectionStart, node.selectionEnd, node.selectionDirection])).toEqual([1, 2, "backward"]);
  expect(await canonicalDocument(page)).toEqual(before);
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
});

test("minimal document demo completes selection, clipboard, edit, move, undo, and redo", async ({ page }) => {
  await page.goto("/demo");
  await page.getByText("Inspect editing state", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Document", exact: true })).toBeVisible();

  const surface = page.getByRole("region", { name: "Editable document" }).locator('[tabindex="0"]');
  await surface.focus();
  await surface.press("ArrowDown");
  await expect(page.locator('article[data-block-id="select"]')).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { name: "Select block 1" }).click();
  await page.getByRole("button", { name: "Select block 2" }).click({ modifiers: ["Meta"] });
  await expect(page.getByText("2 selected", { exact: false })).toBeVisible();
  await page.getByLabel("Document actions").getByRole("button", { name: "Copy", exact: true }).click();

  await page.getByRole("button", { name: "Select block 4" }).click();
  await page.getByRole("button", { name: "Paste", exact: true }).click();
  await expect(page.locator("article[data-selected=true]")).toHaveCount(2);
  await expect(page.getByRole("textbox", { name: "Block 6 text" })).toHaveValue(/Shift-click/);
  const pastedIds = (await canonicalDocument(page)).blocks.slice(4).map((block) => block.id);
  expect(new Set(pastedIds).size).toBe(2);

  await page.getByRole("textbox", { name: "Block 5 text" }).fill("한글 편집도 같은 transaction을 사용합니다.");
  await page.getByRole("button", { name: "Select block 5" }).click();
  await page.getByRole("button", { name: "Select block 6" }).click({ modifiers: ["Meta"] });
  await page.getByRole("button", { name: "Move up" }).click();

  const moved = await canonicalDocument(page);
  expect(moved.blocks.map((block) => block.id)).toEqual(["welcome", "select", "clipboard", ...pastedIds, "json"]);

  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(4);

  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  const redone = await canonicalDocument(page);
  expect(redone.blocks.find((block) => block.id === pastedIds[0])?.text).toBe("한글 편집도 같은 transaction을 사용합니다.");
  await expect(page.locator("article[data-selected=true]")).toHaveCount(2);
});

test("Document demo composes native clipboard events with Web Platform Adapter cut history", async ({ page }) => {
  await page.goto("/demo");
  await page.getByText("Inspect editing state", { exact: true }).click();
  await page.getByRole("button", { name: "Select block 1" }).click();

  const clipboard = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>('[aria-label="Editable document"] [tabindex="0"]')!;
    const data = new DataTransfer();
    const copied = surface.dispatchEvent(new ClipboardEvent("copy", { clipboardData: data, bubbles: true, cancelable: true }));
    const cut = surface.dispatchEvent(new ClipboardEvent("cut", { clipboardData: data, bubbles: true, cancelable: true }));
    const pasted = surface.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    return {
      copiedDefaultAllowed: copied,
      cutDefaultAllowed: cut,
      pastedDefaultAllowed: pasted,
      types: [...data.types],
      text: data.getData("text/plain"),
    };
  });

  expect(clipboard).toMatchObject({
    copiedDefaultAllowed: false,
    cutDefaultAllowed: false,
    pastedDefaultAllowed: false,
    text: "A minimal document that still behaves like an editor.",
  });
  expect(clipboard.types).toContain("application/vnd.interactive-os.blocks+json");
  expect((await canonicalDocument(page)).blocks.map((block) => block.text)).toEqual([
    "Shift-click for a range. Mod-click for multiple blocks.",
    "A minimal document that still behaves like an editor.",
    "Copy, cut, paste, move, duplicate, undo, and redo all preserve selection.",
    "Every interaction commits to the canonical JSON shown beside the document.",
  ]);
  await expect(page.getByText("Pasted 1 structured block", { exact: true })).toBeVisible();
});

async function canonicalDocument(page: Page): Promise<{ blocks: Array<{ id: string; text: string }> }> {
  return JSON.parse(await page.getByTestId("canonical-json").innerText()) as { blocks: Array<{ id: string; text: string }> };
}
