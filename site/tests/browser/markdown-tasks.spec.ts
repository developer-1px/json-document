import {expect, test} from "@playwright/test";
import type {Locator} from "@playwright/test";

async function caret(editor: Locator, offset: number) {
  await editor.evaluate((root, offset) => {
    root.focus();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (offset <= node.textContent!.length) {
        document.getSelection()!.setBaseAndExtent(node, offset, node, offset);
        document.dispatchEvent(new Event("selectionchange"));
        return;
      }
      offset -= node.textContent!.length;
    }
    throw new Error("offset outside source");
  }, offset);
}

test("native task checkbox toggles with click and Space, sharing source history", async ({page}) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", {name:"Markdown 문서"});
  await editor.click(); await page.keyboard.press("ControlOrMeta+a");
  const source = "- [ ] 한글 할 일\n- item\n12. ordered\n";
  await editor.evaluate((root, source) => {
    const data = new DataTransfer(); data.setData("text/plain", source);
    root.dispatchEvent(new ClipboardEvent("paste", {clipboardData:data, bubbles:true, cancelable:true}));
  }, source);
  await expect.poll(() => editor.textContent()).toBe(source);
  const check = editor.getByRole("checkbox", {name:"한글 할 일"});
  await expect(check).toBeEnabled(); await expect(check).not.toBeChecked();
  await check.click(); await expect(check).toBeChecked();
  await expect.poll(() => editor.textContent()).toBe(source.replace("[ ]", "[x]"));
  await expect(check).toBeFocused();
  await page.keyboard.press("Space"); await expect(check).not.toBeChecked();
  await expect.poll(() => editor.textContent()).toBe(source);
  await page.keyboard.press("ControlOrMeta+z"); await expect(check).toBeChecked();
  await page.keyboard.press("ControlOrMeta+z"); await expect(check).not.toBeChecked();
  await page.keyboard.press("ControlOrMeta+Shift+z"); await expect(check).toBeChecked();
  await page.keyboard.press("ControlOrMeta+Shift+z"); await expect(check).not.toBeChecked();
  const sizes = await editor.evaluate(root => ["task", "list"].map(kind => {
    const element = root.querySelector(kind === "task" ? "[data-markdown-task-control]" : `[data-markdown-marker="${kind}"]`)!;
    return {width:element.getBoundingClientRect().width, height:element.getBoundingClientRect().height};
  }));
  expect(sizes[0]!.width).toBeCloseTo(sizes[1]!.width, 1);
  expect(sizes[0]!.height).toBeCloseTo(sizes[1]!.height, 1);
  await page.screenshot({path:"/tmp/bear-todo-ui.png", fullPage:true});
});

for (const prefix of ["- [ ] ", "12. [x] ", "  - [X] "]) {
  for (const direction of ["Backspace", "Delete"]) {
    test(`${prefix} ${direction} removes one checkbox and one Undo restores it`, async ({page}) => {
      await page.goto("/applications/bear");
      const editor = page.getByRole("textbox", {name:"Markdown 문서"});
      await editor.click(); await page.keyboard.press("ControlOrMeta+a");
      const source = prefix + "본문  공백\n\nnext";
      await editor.evaluate((root, source) => {
    const data = new DataTransfer(); data.setData("text/plain", source);
    root.dispatchEvent(new ClipboardEvent("paste", {clipboardData:data, bubbles:true, cancelable:true}));
  }, source);
  await expect.poll(() => editor.textContent()).toBe(source);
      const start = prefix.length - prefix.trimStart().length;
      await caret(editor, direction === "Backspace" ? prefix.length : start);
      await page.keyboard.press(direction);
      await expect.poll(() => editor.textContent()).toBe(prefix.slice(0,start) + "본문  공백\n\nnext");
      await expect(editor.getByRole("checkbox")).toHaveCount(0);
      await page.keyboard.press("ControlOrMeta+z");
      await expect.poll(() => editor.textContent()).toBe(source);
      await expect(editor.getByRole("checkbox")).toHaveCount(1);
      await page.keyboard.press("ControlOrMeta+Shift+z");
      await expect.poll(() => editor.textContent()).toBe(prefix.slice(0,start) + "본문  공백\n\nnext");
    });
  }
}
