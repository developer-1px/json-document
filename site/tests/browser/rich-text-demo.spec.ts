import { expect, test, type Page } from "@playwright/test";

test("Rich Text Lab commits contenteditable input through JSON Patch and restores history", async ({ page }) => {
  await page.goto("/editing/rich-text");

  const editor = page.getByTestId("rich-text-editor");
  await expect(editor).toHaveAttribute("contenteditable", "true");
  await expect(editor.getByRole("heading", { level: 2, name: "Canonical Rich Text" })).toBeVisible();
  await expect(editor.locator("strong")).toHaveText("Canonical Rich Text");
  await expect(editor.locator("em")).toHaveText("JSONDocument");

  const editableText = editor.locator('[data-rich-text-node-id="text-editable"]');
  await editableText.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    (element.closest('[contenteditable="true"]') as HTMLElement | null)?.focus();
  });
  await page.keyboard.type(" OK");

  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요. OK",
  });
  expect(await json(page, "rich-text-patch-json")).toEqual([{
    op: "replace",
    path: "/content/2/content/0/text",
    value: "여기를 선택하고 직접 입력해 보세요. OK",
  }]);
  expect((await json(page, "rich-text-selection-json")).selection.ranges[0].focus).toMatchObject({
    kind: "text",
    nodeId: "text-editable",
    offset: 23,
  });

  await page.keyboard.press("Control+z");
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요.",
  });

  await page.getByRole("button", { name: "Redo" }).click();
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요. OK",
  });
});

test("Rich Text Lab exposes a deterministic sample intent for inspection", async ({ page }) => {
  await page.goto("/editing/rich-text");
  await page.getByRole("button", { name: "Apply sample intent" }).click();

  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요. ✓",
  });
  expect(await json(page, "rich-text-patch-json")).toEqual([{
    op: "replace",
    path: "/content/2/content/0/text",
    value: "여기를 선택하고 직접 입력해 보세요. ✓",
  }]);
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
});

test("Rich Text Lab connects Enter, IME, selection restore, and Clipboard representations to the DOM", async ({ page }) => {
  await page.goto("/editing/rich-text");
  const editor = page.getByTestId("rich-text-editor");

  await setSelection(page, "text-editable", 3, 3);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await json(page, "rich-text-document-json")).content.length).toBe(4);
  const afterSplit = await json(page, "rich-text-document-json");
  expect(afterSplit.content[2]).toMatchObject({ type: "paragraph", content: [{ text: "여기를" }] });
  expect(afterSplit.content[3]).toMatchObject({ type: "paragraph", content: [{ text: " 선택하고 직접 입력해 보세요." }] });

  const splitTextId = afterSplit.content[3].content[0].id;
  await setSelection(page, splitTextId, 0, 0);
  await page.keyboard.press("Backspace");
  await expect.poll(async () => (await json(page, "rich-text-document-json")).content.length).toBe(3);
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요.",
  });

  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+z");
  await expect.poll(() => domSelection(page)).toMatchObject({ nodeId: "text-editable", anchorOffset: 3, focusOffset: 3 });

  await setSelection(page, "text-editable", 3, 3);
  await editor.evaluate((root) => {
    root.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
    root.dispatchEvent(new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertCompositionText",
      data: "한글",
      isComposing: true,
    }));
    root.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "한글" }));
  });
  await expect.poll(async () => textNode(await json(page, "rich-text-document-json"), "text-editable")?.text)
    .toBe("여기를한글 선택하고 직접 입력해 보세요.");
  await page.getByRole("button", { name: "Undo" }).click();
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요.",
  });

  await setSelection(page, "text-heading", 0, 9);
  const copied = await editor.evaluate((root) => {
    const data = new DataTransfer();
    root.dispatchEvent(new ClipboardEvent("copy", { bubbles: true, cancelable: true, clipboardData: data }));
    return {
      types: Array.from(data.types),
      structured: data.getData("application/vnd.interactive-os.rich-text+json"),
      html: data.getData("text/html"),
      plain: data.getData("text/plain"),
    };
  });
  expect(copied.types).toEqual([
    "application/vnd.interactive-os.rich-text+json",
    "text/html",
    "text/plain",
  ]);
  expect(JSON.parse(copied.structured)).toMatchObject({ content: [{ text: "Canonical", marks: [{ type: "strong" }] }] });
  expect(copied.html).toContain("<strong>Canonical</strong>");
  expect(copied.plain).toBe("Canonical");

  await setSelection(page, "text-editable", 0, 0);
  await dispatchPaste(editor, { structured: copied.structured, html: "<p><em>wrong fallback</em></p>", plain: "wrong fallback" });
  await expect.poll(async () => (await json(page, "rich-text-document-json")).content[2].content[0]?.marks)
    .toEqual([{ type: "strong" }]);

  const insertedId = (await json(page, "rich-text-document-json")).content[2].content[0].id;
  await setSelection(page, insertedId, 9, 9);
  await dispatchPaste(editor, { html: "<p><em>HTML</em></p>", plain: "wrong plain" });
  await expect.poll(async () => textNodeByText(await json(page, "rich-text-document-json"), "HTML")?.marks)
    .toEqual([{ type: "emphasis" }]);

  const htmlId = textNodeByText(await json(page, "rich-text-document-json"), "HTML").id;
  await setSelection(page, htmlId, 4, 4);
  await dispatchPaste(editor, { plain: " plain" });
  await expect.poll(async () => textNodeByText(await json(page, "rich-text-document-json"), " plain")?.text).toBe(" plain");

  const plainId = textNodeByText(await json(page, "rich-text-document-json"), " plain").id;
  await setSelection(page, plainId, 0, 1);
  const cutTypes = await editor.evaluate((root) => {
    const data = new DataTransfer();
    root.dispatchEvent(new ClipboardEvent("cut", { bubbles: true, cancelable: true, clipboardData: data }));
    return Array.from(data.types);
  });
  expect(cutTypes).toEqual([
    "application/vnd.interactive-os.rich-text+json",
    "text/html",
    "text/plain",
  ]);
  await expect.poll(async () => textNode(await json(page, "rich-text-document-json"), plainId)?.text).toBe("plain");
});

async function json(page: Page, testId: string): Promise<any> {
  return JSON.parse(await page.getByTestId(testId).innerText());
}

function textNode(document: any, id: string): any {
  const queue = [document];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node?.id === id) return node;
    if (Array.isArray(node?.content)) queue.push(...node.content);
  }
  return null;
}

function textNodeByText(document: any, text: string): any {
  const queue = [document];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node?.type === "text" && node.text === text) return node;
    if (Array.isArray(node?.content)) queue.push(...node.content);
  }
  return null;
}

async function setSelection(page: Page, nodeId: string, anchorOffset: number, focusOffset: number): Promise<void> {
  await page.getByTestId("rich-text-editor").evaluate((root, options) => {
    const element = root.querySelector<HTMLElement>(`[data-rich-text-node-id="${CSS.escape(options.nodeId)}"]`)!;
    const text = element.firstChild!;
    window.getSelection()?.setBaseAndExtent(text, options.anchorOffset, text, options.focusOffset);
    (root as HTMLElement).focus();
    root.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  }, { nodeId, anchorOffset, focusOffset });
}

async function domSelection(page: Page): Promise<unknown> {
  return page.getByTestId("rich-text-editor").evaluate((root) => {
    const selection = window.getSelection();
    const element = selection?.anchorNode?.parentElement?.closest<HTMLElement>("[data-rich-text-node-id]");
    return { nodeId: element?.dataset.richTextNodeId, anchorOffset: selection?.anchorOffset, focusOffset: selection?.focusOffset };
  });
}

async function dispatchPaste(
  editor: ReturnType<Page["getByTestId"]>,
  values: { readonly structured?: string; readonly html?: string; readonly plain?: string },
): Promise<void> {
  await editor.evaluate((root, representations) => {
    const data = new DataTransfer();
    if (representations.structured !== undefined) data.setData("application/vnd.interactive-os.rich-text+json", representations.structured);
    if (representations.html !== undefined) data.setData("text/html", representations.html);
    if (representations.plain !== undefined) data.setData("text/plain", representations.plain);
    root.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
  }, values);
}
