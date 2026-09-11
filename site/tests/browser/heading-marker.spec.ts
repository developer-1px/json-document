import { expect, test } from "@playwright/test";

test("heading marker keyboard edits preserve Markdown and undo", async ({ page }) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", { name: "Markdown 문서" });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await editor.evaluate(root => {
    const data = new DataTransfer(); data.setData("text/plain", "# 제목\n\n본문");
    root.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await editor.getByRole("heading").evaluate(heading => {
    const text = heading.querySelector('[data-markdown-kind="text"]')!.firstChild!;
    document.getSelection()!.setBaseAndExtent(text, 0, text, 0);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await page.keyboard.press("ArrowLeft");
  const position = () => editor.evaluate(root => {
    const selection = document.getSelection()!;
    const range = document.createRange(); range.selectNodeContents(root);
    range.setEnd(selection.focusNode!, selection.focusOffset);
    return range.toString().length;
  });
  await expect.poll(position).toBe(1);
  await page.screenshot({path:"/tmp/bear-marker-caret.png"});
  await page.keyboard.insertText("#");
  await expect.poll(() => editor.textContent()).toBe("## 제목\n\n본문");
  await expect(editor.getByRole("heading", {level:2})).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect.poll(() => editor.textContent()).toBe("# 제목\n\n본문");
  await page.keyboard.press("ArrowLeft");
  await expect.poll(position).toBe(0);
  await page.keyboard.press("Delete");
  await expect.poll(() => editor.textContent()).toBe(" 제목\n\n본문");
  await expect(editor.getByRole("heading")).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => editor.textContent()).toBe("# 제목\n\n본문");
});

for (const depth of [1, 2, 3, 4, 5, 6]) {
  test(`H${depth} marker keeps native caret positions, selection and source edits`, async ({ page }) => {
    await page.goto("/applications/bear");
    await page.setViewportSize({ width: 375, height: 812 });
    const editor = page.getByRole("textbox", { name: "Markdown 문서" });
    const source = "#".repeat(depth) + " 제목\n\n본문";
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await editor.evaluate((root, source) => {
      const data = new DataTransfer(); data.setData("text/plain", source);
      root.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    }, source);
    const heading = editor.getByRole("heading", { level: depth, name: "제목", exact: true });
    await heading.evaluate(element => {
      const text = element.querySelector('[data-markdown-kind="text"]')!.firstChild!;
      document.getSelection()!.setBaseAndExtent(text, 0, text, 0);
      document.dispatchEvent(new Event("selectionchange"));
    });
    const position = () => editor.evaluate(root => {
      const selection = document.getSelection()!;
      const range = document.createRange(); range.selectNodeContents(root);
      range.setEnd(selection.focusNode!, selection.focusOffset);
      return range.toString().length;
    });
    await page.keyboard.press("ArrowLeft");
    await expect.poll(position).toBe(depth);
    const marker = heading.locator('[data-markdown-heading-marker]');
    await expect(marker).toHaveAttribute("data-text-projection-edge", "after");
    const assertEdge = async (side: "before" | "after") => {
      const geometry = await marker.evaluate(element => {
        const box = element.getBoundingClientRect();
        const caret = getComputedStyle(element, "::after");
        return {left:box.left, width:box.width, height:box.height, caretLeft:parseFloat(caret.left),
          caretTop:parseFloat(caret.top), caretHeight:parseFloat(caret.height)};
      });
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.width).toBeGreaterThan(0);
      expect(geometry.caretLeft).toBeCloseTo(side === "before" ? 0 : geometry.width, 1);
      expect(geometry.caretTop).toBe(0);
      expect(geometry.caretHeight).toBeCloseTo(geometry.height, 1);
    };
    await assertEdge("after");
    await page.keyboard.press("ArrowLeft");
    await expect.poll(position).toBe(0);
    await expect(marker).toHaveAttribute("data-text-projection-edge", "before");
    await assertEdge("before");
    await page.keyboard.press("ArrowRight");
    await expect.poll(position).toBe(depth);
    await expect(marker).toHaveAttribute("data-text-projection-edge", "after");
    await page.keyboard.press("ArrowRight");
    await expect.poll(position).toBe(depth + 1);
    await expect(editor).not.toHaveAttribute("data-text-projection-caret");
    await page.keyboard.press("ArrowRight");
    await expect.poll(position).toBe(depth + 2);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Shift+ArrowLeft");
    await page.keyboard.press("Shift+ArrowLeft");
    const copied = await editor.evaluate(root => {
      const data = new DataTransfer();
      root.dispatchEvent(new ClipboardEvent("copy", { clipboardData: data, bubbles: true, cancelable: true }));
      return data.getData("text/plain");
    });
    expect(copied).toBe("#".repeat(depth) + " ");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
    await expect.poll(position).toBe(depth);
    await page.keyboard.press("Backspace");
    await expect.poll(() => editor.textContent()).toBe("#".repeat(depth - 1) + " 제목\n\n본문");
    if (depth > 1) await expect(editor.getByRole("heading", {level: depth - 1})).toBeVisible();
    else await expect(editor.getByRole("heading")).toHaveCount(0);
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => editor.textContent()).toBe(source);
    await expect.poll(position).toBe(depth);
    await page.keyboard.insertText("#");
    await expect.poll(() => editor.textContent()).toBe("#".repeat(depth + 1) + " 제목\n\n본문");
    if (depth < 6) await expect(editor.getByRole("heading", {level: depth + 1})).toBeVisible();
    else await expect(editor.getByRole("heading")).toHaveCount(0);
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => editor.textContent()).toBe(source);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });
}

for (const atLineStart of [true, false]) test(`ba95af50: Backspace at ${atLineStart ? "visible line" : "heading body"} start preserves following blocks`, async ({ page }) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", { name: "Markdown 문서" });
  const original = (await editor.textContent())!;
  const heading = editor.getByRole("heading", {level:2});
  await heading.click();
  await heading.evaluate((element, atLineStart) => {
    const text = document.createTreeWalker(element.querySelector('[data-markdown-kind="text"]')!, NodeFilter.SHOW_TEXT).nextNode()!;
    document.getSelection()!.setBaseAndExtent(text, atLineStart ? 5 : 0, text, atLineStart ? 5 : 0);
    document.dispatchEvent(new Event("selectionchange"));
  }, atLineStart);
  if (atLineStart) await page.keyboard.press("ControlOrMeta+ArrowLeft");
  // Visible separator is now part of the line; body start remains one space later.
  const start = original.indexOf("한 줄에서 시작하기") - (atLineStart ? 1 : 0);
  const position = await editor.evaluate(root => {
    const selection = document.getSelection()!;
    const range = document.createRange(); range.selectNodeContents(root);
    range.setEnd(selection.focusNode!, selection.focusOffset);
    return range.toString().length;
  });
  expect(position).toBe(start);
  for (let count = 1; count <= 5; count++) {
    await page.keyboard.press("Backspace");
    await expect.poll(() => editor.textContent(), {timeout:2000}).toBe(original.slice(0, start - count) + original.slice(start));
  }
  for (let count = 0; count < 5; count++) await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => editor.textContent()).toBe(original);
});

test("heading spaces and tabs retain width, individual navigation, edits and undo", async ({ page }) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", { name: "Markdown 문서" });
  const source = "##    제목  \t\n\n본문";
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await editor.evaluate((root, source) => {
    const data = new DataTransfer(); data.setData("text/plain", source);
    root.dispatchEvent(new ClipboardEvent("paste", {clipboardData:data, bubbles:true, cancelable:true}));
  }, source);
  const heading = editor.getByRole("heading", {level:2});
  const geometry = await heading.evaluate(element => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const spans: {text:string, width:number}[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent || !/^\s+$/.test(node.textContent)) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      spans.push({text:node.textContent, width:range.getBoundingClientRect().width});
    }
    return spans;
  });
  expect(geometry.map(span => span.text)).toEqual(["    ", "  \t"]);
  for (const span of geometry) expect(span.width).toBeGreaterThan(0);
  await heading.evaluate(element => {
    const text = document.createTreeWalker(element.querySelector('[data-markdown-kind="text"]')!, NodeFilter.SHOW_TEXT).nextNode()!;
    document.getSelection()!.setBaseAndExtent(text, 0, text, 0);
    document.dispatchEvent(new Event("selectionchange"));
  });
  const position = () => editor.evaluate(root => {
    const selection = document.getSelection()!;
    const range = document.createRange(); range.selectNodeContents(root);
    range.setEnd(selection.focusNode!, selection.focusOffset);
    return range.toString().length;
  });
  for (const offset of [5,4,3,2,0]) {
    await page.keyboard.press("ArrowLeft");
    await expect.poll(position).toBe(offset);
  }
  for (const offset of [2,3,4,5,6]) {
    await page.keyboard.press("ArrowRight");
    await expect.poll(position).toBe(offset);
  }
  await page.keyboard.press("Backspace");
  await expect.poll(() => editor.textContent()).toBe("##   제목  \t\n\n본문");
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => editor.textContent()).toBe(source);
  await expect.poll(position).toBe(6);
  await page.keyboard.insertText(" ");
  await expect.poll(() => editor.textContent()).toBe("##     제목  \t\n\n본문");
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => editor.textContent()).toBe(source);
  for (let i=0; i<4; i++) await page.keyboard.press("Shift+ArrowLeft");
  const copied = await editor.evaluate(root => {
    const data = new DataTransfer();
    root.dispatchEvent(new ClipboardEvent("copy", {clipboardData:data, bubbles:true, cancelable:true}));
    return data.getData("text/plain");
  });
  expect(copied).toBe("    ");
  await page.keyboard.press("Delete");
  await expect.poll(() => editor.textContent()).toBe("##제목  \t\n\n본문");
  await expect(editor.getByRole("heading")).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => editor.textContent()).toBe(source);
  await page.screenshot({path:"/tmp/bear-heading-whitespace.png"});
});
