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
    const geometry = await heading.evaluate(element => {
      const range = document.getSelection()!.getRangeAt(0).getBoundingClientRect();
      return { x: range.x, height: range.height, headingX: element.getBoundingClientRect().x };
    });
    expect(geometry.height).toBeGreaterThan(0);
    expect(geometry.x).toBeGreaterThanOrEqual(0);
    expect(geometry.x).toBeLessThan(geometry.headingX);
    await page.keyboard.press("ArrowRight");
    await expect.poll(position).toBe(depth + 1);
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
    expect(copied).toBe("# ");
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
