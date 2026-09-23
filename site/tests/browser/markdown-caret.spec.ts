import { expect, test, type Page } from "@playwright/test";

const source = "A **한글** B __raw__ C";

async function model(page: Page): Promise<string> {
  const text = await page.getByTestId("markdown-source-json").textContent();
  return JSON.parse(text!).source as string;
}

async function select(page: Page, anchor: number, focus = anchor) {
  await page.getByTestId("markdown-editor").evaluate((root, range) => {
    (root as HTMLElement).focus();
    const locate = (offset: number) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const length = node.textContent!.length;
        if (offset <= length) return { node, offset };
        offset -= length;
      }
      return { node: root, offset: root.childNodes.length };
    };
    // Reveal through the browser's own selectionchange path before editing.
    const a = locate(range.anchor);
    const f = locate(range.focus);
    document.getSelection()!.setBaseAndExtent(a.node, a.offset, f.node, f.offset);
    document.dispatchEvent(new Event("selectionchange"));
  }, { anchor, focus });
}

async function selection(page: Page) {
  return page.getByTestId("markdown-editor").evaluate(root => {
    const selection = document.getSelection()!;
    const offset = (node: Node | null, at: number) => {
      if (!node || !root.contains(node)) return -1;
      const range = document.createRange();
      range.selectNodeContents(root);
      range.setEnd(node, at);
      return range.toString().length;
    };
    return { anchor: offset(selection.anchorNode, selection.anchorOffset), focus: offset(selection.focusNode, selection.focusOffset) };
  });
}

async function paste(page: Page, text: string) {
  await page.getByTestId("markdown-editor").evaluate((root, source) => {
    const data = new DataTransfer();
    data.setData("text/plain", source);
    root.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, text);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/markdown-caret");
  await expect(page.getByTestId("markdown-editor")).toBeVisible();
  const initial = await model(page);
  await select(page, 0, initial.length);
  await paste(page, source);
  await expect.poll(() => model(page)).toBe(source);
});

test("reveals delimiters at caret, hides on exit, and preserves native directional selection", async ({ page }) => {
  const markers = page.getByTestId("markdown-editor").locator("[data-markdown-delimiter]");
  await select(page, 0);
  await expect(markers.nth(0)).toBeHidden();
  await select(page, 5);
  await expect(markers.nth(0)).toBeVisible();
  await expect(markers.nth(1)).toBeVisible();
  await expect(markers.nth(2)).toBeHidden();
  await expect.poll(() => selection(page)).toEqual({ anchor: 5, focus: 5 });
  await page.keyboard.press("Shift+ArrowLeft");
  await expect.poll(() => selection(page)).toEqual({ anchor: 5, focus: 4 });
  await select(page, source.length);
  await expect(markers.nth(0)).toBeHidden();
  await expect(markers.nth(2)).toBeHidden();
  await expect.poll(() => model(page)).toBe(source);
  await page.getByRole("heading", { name: "Markdown 원문을 직접 편집합니다." }).click();
  await expect(markers.nth(0)).toBeHidden();
});

test("native typing/deleting and history restore the exact raw source and caret", async ({ page }) => {
  await select(page, 6, 4);
  await page.keyboard.type("new");
  await expect.poll(() => model(page)).toBe("A **new** B __raw__ C");
  await expect.poll(() => selection(page)).toEqual({ anchor: 7, focus: 7 });
  await page.keyboard.press("ControlOrMeta+z");
  // Native typing commits per input: undo each keystroke.
  await page.keyboard.press("ControlOrMeta+z");
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => model(page)).toBe(source);
  await expect.poll(() => selection(page)).toEqual({ anchor: 6, focus: 4 });
  await page.keyboard.press("Backspace");
  await expect.poll(() => model(page)).toBe("A **** B __raw__ C");
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => model(page)).toBe(source);
  await expect.poll(() => selection(page)).toEqual({ anchor: 6, focus: 4 });
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect.poll(() => model(page)).toBe("A **** B __raw__ C");
});

test("Korean Chromium composition commits once with no orphaned jamo", async ({ page }) => {
  await select(page, 6, 4);
  const client = await page.context().newCDPSession(page);
  for (const text of ["ㅎ", "하", "한", "한ㄱ", "한그", "한글입력"]) {
    await client.send("Input.imeSetComposition", { text, selectionStart: text.length, selectionEnd: text.length });
    await expect.poll(() => model(page)).toBe(source);
  }
  await client.send("Input.insertText", { text: "한글입력" });
  await client.detach();
  await expect.poll(() => model(page)).toBe("A **한글입력** B __raw__ C");
  await expect.poll(() => selection(page)).toEqual({ anchor: 8, focus: 8 });
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => model(page)).toBe(source);
  await expect.poll(() => selection(page)).toEqual({ anchor: 6, focus: 4 });
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect.poll(() => model(page)).toBe("A **한글입력** B __raw__ C");
});

test("native copy/cut/paste uses Markdown source; literal paste preserves CRLF and HTML", async ({ page }) => {
  await select(page, 2, 8);
  await page.keyboard.press("ControlOrMeta+c");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("**한글**");
  await page.keyboard.press("ControlOrMeta+x");
  await expect.poll(() => model(page)).toBe("A  B __raw__ C");
  await page.keyboard.press("ControlOrMeta+v");
  await expect.poll(() => model(page)).toBe(source);
  await select(page, 0, source.length);
  const literal = "<img src=x onerror=alert(1)> **raw**  \r\n__tail__\r\n";
  await paste(page, literal);
  await expect.poll(() => model(page)).toBe(literal);
  await expect(page.getByTestId("markdown-editor").locator("img")).toHaveCount(0);
  await select(page, 1);
  await page.keyboard.type("!");
  await expect.poll(() => model(page)).toBe("<!" + literal.slice(1));
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => model(page)).toBe(literal);
});

test("IME-consumed Enter confirms Korean text and inserts exactly one newline", async ({ page }) => {
  await select(page, 6, 4);
  const client = await page.context().newCDPSession(page);
  await client.send("Input.imeSetComposition", { text: "한국", selectionStart: 2, selectionEnd: 2 });
  // Model the OS-consumed Enter: keydown reaches the root, but no native paragraph input follows.
  await client.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 229 });
  await expect.poll(() => model(page)).toBe(source);
  await client.send("Input.insertText", { text: "한국" });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await expect.poll(() => model(page)).toBe("A **한국\n** B __raw__ C");
  await expect.poll(() => selection(page)).toEqual({ anchor: 7, focus: 7 });
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => model(page)).toBe("A **한국** B __raw__ C");
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => model(page)).toBe(source);
  await expect.poll(() => selection(page)).toEqual({ anchor: 6, focus: 4 });
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect.poll(() => model(page)).toBe("A **한국\n** B __raw__ C");
  await page.keyboard.press("Enter");
  await expect.poll(() => model(page)).toBe("A **한국\n\n** B __raw__ C");
  await client.detach();
});

test("IME Enter with native paragraph input still inserts only one newline", async ({ page }) => {
  await select(page, source.length);
  const client = await page.context().newCDPSession(page);
  await client.send("Input.imeSetComposition", { text: "한글", selectionStart: 2, selectionEnd: 2 });
  await page.keyboard.down("Enter");
  await client.send("Input.insertText", { text: "한글" });
  await page.keyboard.up("Enter");
  await expect.poll(() => model(page)).toBe(source + "한글\n");
  await expect.poll(() => selection(page)).toEqual({ anchor: source.length + 3, focus: source.length + 3 });
  await page.keyboard.type("next");
  await expect.poll(() => model(page)).toBe(source + "한글\nnext");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("tail");
  await expect.poll(() => model(page)).toBe(source + "한글\nnext\n\ntail");
  await client.detach();
});

test("unclosed delimiters and surrogate-pair deletion stay editable", async ({ page }) => {
  await select(page, 0, source.length);
  await paste(page, "**😀");
  await select(page, 4);
  await page.keyboard.press("Backspace");
  await expect.poll(() => model(page)).toBe("**");
  await page.keyboard.type("done**");
  await expect.poll(() => model(page)).toBe("**done**");
  await expect(page.getByTestId("markdown-editor").locator("strong")).toHaveText("done");
});

test("Usage exposes every Markdown owner and its API reference through source tabs", async ({ page }) => {
  await page.getByRole("tab", { name: "MarkdownCaretRoute.tsx", exact: true }).click();
  for (const name of ["text.ts", "MarkdownEditingSurface.tsx", "markdown-dom.ts", "source-runs.ts", "parser.ts", "syntax.ts", "text-change.ts", "lease.ts", "plain-text.ts", "text-index.ts", "history-patch.ts"]) {
    await expect(page.getByRole("tab", { name, exact: true })).toBeVisible();
  }
  await page.getByRole("tab", { name: "markdown-dom.ts", exact: true }).click();
  await expect(page.getByRole("link", { name: "API Reference", exact: true })).toHaveAttribute("href", "/docs/api/markdown-web");
  await page.getByRole("link", { name: "API Reference", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Markdown Web DOM 계약", exact: true })).toBeVisible();
});

test("long source edits keep surrounding DOM and restore exact source and caret", async ({ page }) => {
  const unit = "Markdown 원문을 **그대로 보존**합니다. 한글 입력과 __방향 있는 선택__을 확인합니다. 문서를 읽고 수정합니다.\n";
  const longSource = unit.repeat(Math.ceil(50_000 / unit.length)).slice(0, 50_000);
  await select(page, 0, source.length);
  await paste(page, longSource);
  await expect.poll(() => model(page)).toBe(longSource);
  for (const offset of [0, 25_000, 50_000]) {
    const retained = await page.getByTestId("markdown-editor").locator("strong").nth(10).elementHandle();
    await select(page, offset);
    await page.keyboard.type("x");
    await expect.poll(() => model(page)).toBe(longSource.slice(0, offset) + "x" + longSource.slice(offset));
    expect(await retained!.evaluate(node => node.isConnected)).toBe(true);
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => model(page)).toBe(longSource);
    await expect.poll(() => selection(page)).toEqual({ anchor: offset, focus: offset });
    await retained!.dispose();
  }
});
