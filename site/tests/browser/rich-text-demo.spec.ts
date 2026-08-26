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

test("Rich Text Lab preserves consecutive spaces in the canonical document and rendered surface", async ({ page }) => {
  await page.goto("/editing/rich-text");

  const editor = page.getByTestId("rich-text-editor");
  await setSelection(page, "text-editable", 3, 3);
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");

  await expect.poll(async () => textNode(await json(page, "rich-text-document-json"), "text-editable")?.text)
    .toBe("여기를   선택하고 직접 입력해 보세요.");
  await expect(editor).toHaveCSS("white-space", "pre-wrap");
  await expect(editor.locator('[data-rich-text-text-id="text-editable"]')).toHaveText("여기를   선택하고 직접 입력해 보세요.", { useInnerText: true });
  await expect.poll(() => domSelection(page)).toMatchObject({
    nodeId: "text-editable",
    anchorOffset: 5,
    focusOffset: 5,
  });

  await page.getByRole("button", { name: "Undo" }).click();
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요.",
  });
});

test("Rich Text Lab preserves consecutive Enter in empty canonical paragraphs", async ({ page }) => {
  await page.goto("/editing/rich-text");

  const editor = page.getByTestId("rich-text-editor");
  await setSelection(page, "text-editable", 20, 20);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");

  await expect.poll(async () => (await json(page, "rich-text-document-json")).content.length).toBe(9);
  const document = await json(page, "rich-text-document-json");
  expect(document.content.slice(3, 5)).toMatchObject([
    { type: "paragraph", content: [] },
    { type: "paragraph", content: [] },
  ]);
  await expect.poll(() => domSelection(page)).toMatchObject({
    nodeId: document.content[4].id,
    anchorOffset: 0,
    focusOffset: 0,
  });
  await expect(editor.locator("[data-rich-text-placeholder]")).toHaveCount(2);
  await expect(page.getByText("last: block.split", { exact: true })).toBeVisible();
});

test("Rich Text Lab repeatedly joins empty canonical paragraphs with Backspace and Delete", async ({ page }) => {
  await page.goto("/editing/rich-text");
  const editor = page.getByTestId("rich-text-editor");

  await setSelection(page, "text-editable", 20, 20);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");

  await expect.poll(async () => (await json(page, "rich-text-document-json")).content.length).toBe(7);
  await expect(editor.locator("[data-rich-text-placeholder]")).toHaveCount(0);
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요.",
  });

  await page.reload();
  await setSelection(page, "text-editable", 20, 20);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  const splitDocument = await json(page, "rich-text-document-json");
  const firstEmptyId = splitDocument.content[3].id;
  await setChildSelection(page, firstEmptyId, 0);
  await page.keyboard.press("Delete");
  await page.keyboard.press("Delete");

  await expect.poll(async () => (await json(page, "rich-text-document-json")).content.length).toBe(8);
  await expect(page.getByTestId("rich-text-editor").locator("[data-rich-text-placeholder]")).toHaveCount(1);
  await expect.poll(() => domSelection(page)).toMatchObject({ nodeId: firstEmptyId, anchorOffset: 0, focusOffset: 0 });
});

test("Rich Text Lab preserves repeated forward character deletion", async ({ page }) => {
  await page.goto("/editing/rich-text");
  await setSelection(page, "text-editable", 0, 0);
  await page.keyboard.press("Delete");
  await page.keyboard.press("Delete");

  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "를 선택하고 직접 입력해 보세요.",
  });
  await expect.poll(() => domSelection(page)).toMatchObject({ nodeId: "text-editable", anchorOffset: 0, focusOffset: 0 });
});

test("Rich Text Lab preserves the mouse selection and editor focus while applying toolbar formatting", async ({ page }) => {
  await page.goto("/editing/rich-text");
  const editor = page.getByTestId("rich-text-editor");
  await setSelection(page, "text-editable", 0, 3);

  await page.getByRole("button", { name: "Toggle strong" }).click();

  await expect(editor).toBeFocused();
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를",
    marks: [{ type: "strong" }],
  });
  await expect.poll(() => domSelection(page)).toMatchObject({ nodeId: "text-editable", anchorOffset: 0, focusOffset: 3 });
});

test("Rich Text Lab replaces unexpected descendant DOM mutation from the canonical model on publish", async ({ page }) => {
  await page.goto("/editing/rich-text");
  const editor = page.getByTestId("rich-text-editor");
  const editableText = editor.locator('[data-rich-text-text-id="text-editable"]');

  await editableText.evaluate((element) => { element.textContent = "external DOM corruption"; });
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요.",
  });

  await page.getByRole("button", { name: "Apply sample intent" }).click();
  await expect(editableText).toHaveText("여기를 선택하고 직접 입력해 보세요. ✓");
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요. ✓",
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
  await expect.poll(async () => (await json(page, "rich-text-document-json")).content.length).toBe(8);
  const afterSplit = await json(page, "rich-text-document-json");
  expect(afterSplit.content[2]).toMatchObject({ type: "paragraph", content: [{ text: "여기를" }] });
  expect(afterSplit.content[3]).toMatchObject({ type: "paragraph", content: [{ text: " 선택하고 직접 입력해 보세요." }] });

  const splitTextId = afterSplit.content[3].content[0].id;
  await setSelection(page, splitTextId, 0, 0);
  await page.keyboard.press("Backspace");
  await expect.poll(async () => (await json(page, "rich-text-document-json")).content.length).toBe(7);
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요.",
  });

  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+z");
  await expect.poll(() => domSelection(page)).toMatchObject({ nodeId: "text-editable", anchorOffset: 3, focusOffset: 3 });

  await composeWithDOMMutation(page, "text-editable", 3, ["ㅎ", "하", "한", "한ㄱ", "한그", "한글"]);
  await expect.poll(async () => textNode(await json(page, "rich-text-document-json"), "text-editable")?.text)
    .toBe("여기를한글 선택하고 직접 입력해 보세요.");
  await page.getByRole("button", { name: "Undo" }).click();
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요.",
  });

  await setSelection(page, "text-heading", 0, 9);
  const copied = await editor.evaluate((root) => {
    const data = new DataTransfer();
    const event = new Event("copy", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    root.dispatchEvent(event);
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
    const event = new Event("cut", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    root.dispatchEvent(event);
    return Array.from(data.types);
  });
  expect(cutTypes).toEqual([
    "application/vnd.interactive-os.rich-text+json",
    "text/html",
    "text/plain",
  ]);
  await expect.poll(async () => textNode(await json(page, "rich-text-document-json"), plainId)?.text).toBe("plain");
});

test("Rich Text Lab handles Chromium Korean IME composition without orphaned jamo", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium");
  await page.goto("/editing/rich-text");
  await setSelection(page, "text-editable", 3, 3);

  const client = await page.context().newCDPSession(page);
  for (const text of ["ㅎ", "하", "한", "한ㄱ", "한그", "한글"]) {
    await client.send("Input.imeSetComposition", {
      text,
      selectionStart: text.length,
      selectionEnd: text.length,
    });
  }
  await client.send("Input.insertText", { text: "한글" });

  await expect.poll(async () => textNode(await json(page, "rich-text-document-json"), "text-editable")?.text)
    .toBe("여기를한글 선택하고 직접 입력해 보세요.");
  await expect.poll(() => domSelection(page)).toMatchObject({
    nodeId: "text-editable",
    anchorOffset: 5,
    focusOffset: 5,
  });
  await expect(page.getByText("last: composition.commit", { exact: true })).toBeVisible();

  for (const text of ["ㅇ", "이", "입", "입ㄹ", "입려", "입력"]) {
    await client.send("Input.imeSetComposition", {
      text,
      selectionStart: text.length,
      selectionEnd: text.length,
    });
  }
  await client.send("Input.insertText", { text: "입력" });
  await client.detach();

  await expect.poll(async () => textNode(await json(page, "rich-text-document-json"), "text-editable")?.text)
    .toBe("여기를한글입력 선택하고 직접 입력해 보세요.");
  await expect.poll(() => domSelection(page)).toMatchObject({
    nodeId: "text-editable",
    anchorOffset: 7,
    focusOffset: 7,
  });

  await page.getByRole("button", { name: "Undo" }).click();
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를한글 선택하고 직접 입력해 보세요.",
  });
  await page.getByRole("button", { name: "Undo" }).click();
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요.",
  });
});

test("Rich Text Lab renders the complete v1 vocabulary and exposes schema-aware proof intents", async ({ page }) => {
  await page.goto("/editing/rich-text");
  const editor = page.getByTestId("rich-text-editor");
  await expect(editor.locator("blockquote")).toContainText("Blockquote");
  await expect(editor.locator("pre code")).toHaveText('{ "canonical": true }');
  await expect(editor.locator("ol")).toHaveAttribute("start", "2");
  await expect(editor.locator("ul")).toContainText("schema-aware transforms");
  await expect(editor.locator("br")).toHaveCount(1);

  await setSelection(page, "text-editable", 0, 3);
  await page.getByRole("button", { name: "Toggle strong" }).click();
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를",
    marks: [{ type: "strong" }],
  });
  await page.getByRole("button", { name: "Set code attrs" }).click();
  expect(textNode(await json(page, "rich-text-document-json"), "code-block-1")).toMatchObject({
    attrs: { language: "typescript" },
  });
  await page.getByRole("button", { name: "Insert hard break" }).click();
  expect(textNode(await json(page, "rich-text-document-json"), "demo-hard-break")).toMatchObject({ type: "hardBreak" });
});

test("Rich Text Lab maps formatting, hard-break, and platform deletion target ranges", async ({ page }) => {
  await page.goto("/editing/rich-text");
  const editor = page.getByTestId("rich-text-editor");

  await setSelection(page, "text-editable", 0, 3);
  await editor.evaluate((root) => root.dispatchEvent(new InputEvent("beforeinput", {
    bubbles: true, cancelable: true, inputType: "formatBold",
  })));
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를", marks: [{ type: "strong" }],
  });

  const remaining = textNodeByText(await json(page, "rich-text-document-json"), " 선택하고 직접 입력해 보세요.");
  await setSelection(page, remaining.id, 0, 0);
  await editor.evaluate((root) => root.dispatchEvent(new InputEvent("beforeinput", {
    bubbles: true, cancelable: true, inputType: "insertLineBreak",
  })));
  await expect(editor.locator("br")).toHaveCount(2);
  await editor.evaluate((root) => root.dispatchEvent(new InputEvent("beforeinput", {
    bubbles: true, cancelable: true, inputType: "insertLineBreak",
  })));
  await expect(editor.locator("br")).toHaveCount(3);

  await page.reload();
  const prevented = await page.getByTestId("rich-text-editor").evaluate((root) => {
    const text = root.querySelector<HTMLElement>('[data-rich-text-text-id="text-editable"]')!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 3);
    const event = new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "deleteWordForward" });
    Object.defineProperty(event, "getTargetRanges", { value: () => [range] });
    root.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: " 선택하고 직접 입력해 보세요.",
  });
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

async function setChildSelection(page: Page, nodeId: string, offset: number): Promise<void> {
  await page.getByTestId("rich-text-editor").evaluate((root, options) => {
    const container = root.querySelector<HTMLElement>(`[data-rich-text-container-id="${CSS.escape(options.nodeId)}"]`)!;
    window.getSelection()?.setBaseAndExtent(container, options.offset, container, options.offset);
    (root as HTMLElement).focus();
    root.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  }, { nodeId, offset });
}

async function domSelection(page: Page): Promise<unknown> {
  return page.getByTestId("rich-text-editor").evaluate((root) => {
    const selection = window.getSelection();
    const anchor = selection?.anchorNode;
    const element = (anchor instanceof HTMLElement ? anchor : anchor?.parentElement)
      ?.closest<HTMLElement>("[data-rich-text-node-id]");
    return { nodeId: element?.dataset.richTextNodeId, anchorOffset: selection?.anchorOffset, focusOffset: selection?.focusOffset };
  });
}

async function composeWithDOMMutation(
  page: Page,
  nodeId: string,
  offset: number,
  steps: readonly string[],
): Promise<void> {
  await page.getByTestId("rich-text-editor").evaluate((root, options) => {
    const element = root.querySelector<HTMLElement>(`[data-rich-text-text-id="${CSS.escape(options.nodeId)}"]`)!;
    const textNode = element.firstChild as Text;
    const selection = window.getSelection()!;
    selection.setBaseAndExtent(textNode, options.offset, textNode, options.offset);
    (root as HTMLElement).focus();
    root.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    root.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));

    let previousLength = 0;
    for (const text of options.steps) {
      root.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, data: text }));
      const targetRange = new StaticRange({
        startContainer: textNode,
        startOffset: options.offset,
        endContainer: textNode,
        endOffset: options.offset + previousLength,
      });
      const beforeInput = new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertCompositionText",
        data: text,
      });
      Object.defineProperty(beforeInput, "isComposing", { value: true });
      Object.defineProperty(beforeInput, "getTargetRanges", { value: () => [targetRange] });
      root.dispatchEvent(beforeInput);

      const value = textNode.nodeValue ?? "";
      textNode.nodeValue = value.slice(0, options.offset) + text + value.slice(options.offset + previousLength);
      previousLength = text.length;
      selection.setBaseAndExtent(textNode, options.offset + text.length, textNode, options.offset + text.length);
      const input = new InputEvent("input", {
        bubbles: true,
        inputType: "insertCompositionText",
        data: text,
      });
      Object.defineProperty(input, "isComposing", { value: true });
      root.dispatchEvent(input);
    }

    const committed = options.steps.at(-1) ?? "";
    root.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: committed }));
    root.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertFromComposition",
      data: committed,
    }));
  }, { nodeId, offset, steps: [...steps] });
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
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    root.dispatchEvent(event);
  }, values);
}
