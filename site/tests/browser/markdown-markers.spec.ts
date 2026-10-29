import {expect, test} from "@playwright/test";

// One representative per deletion contract: atomic block markers and inline delimiters.
const fixtures = [
  ["task", "- [ ] item", "task"], ["quote", "> quote", "blockquote"],
  ["strong", "a **bold** z", "strong"], ["link", "a [label](/path) z", "link"],
] as const;

test("marker projections keep source navigation, deletion, copy and undo", async ({page}) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", {name:"Markdown 문서"});
  for (const [, markdown, kind] of fixtures) {
  const source = markdown + "\n\n후속 **문단**";
  await editor.click(); await page.keyboard.press("ControlOrMeta+a");
  await editor.evaluate((root, source) => {
    const data = new DataTransfer(); data.setData("text/plain", source);
    root.dispatchEvent(new ClipboardEvent("paste", {clipboardData:data,bubbles:true,cancelable:true}));
  }, source);
  const marker = editor.locator(`[data-markdown-marker="${kind}"]`).first();
  await expect(marker).toHaveCount(1);
  const bounds = await marker.evaluate(element => {
    const root=element.closest('[data-markdown-editor]')!;
    const range=document.createRange(); range.selectNodeContents(root);range.setEndBefore(element);
    return {from:range.toString().length, to:range.toString().length + element.textContent!.length};
  });
  // Enter the projected boundary through the same source DOM selection used by clicks.
  await marker.evaluate(element => {
    const text=document.createTreeWalker(element,NodeFilter.SHOW_TEXT).nextNode()!;
    document.getSelection()!.setBaseAndExtent(text,text.textContent!.length,text,text.textContent!.length);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await expect(marker).toHaveAttribute("data-text-projection-edge", "after");
  const position=()=>editor.evaluate(root=>{
    const s=document.getSelection()!,r=document.createRange();r.selectNodeContents(root);r.setEnd(s.focusNode!,s.focusOffset);return r.toString().length;
  });
  await page.keyboard.press("ArrowLeft"); await expect.poll(position).toBe(bounds.from);
  await page.keyboard.press("ArrowRight"); await expect.poll(position).toBe(bounds.to);
  await page.keyboard.press("Shift+ArrowLeft");
  const copied=await editor.evaluate(root=>{
    const data=new DataTransfer();root.dispatchEvent(new ClipboardEvent("copy",{clipboardData:data,bubbles:true,cancelable:true}));return data.getData("text/plain");
  });
  expect(copied).toBe(source.slice(bounds.from,bounds.to));
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Backspace");
  await expect.poll(()=>editor.textContent()).toBe((kind === "task" || kind === "blockquote") ? source.slice(0,bounds.from)+source.slice(bounds.to) : source.slice(0,bounds.to-1)+source.slice(bounds.to));
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(()=>editor.textContent()).toBe(source);
  await expect.poll(position).toBe(bounds.to);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Delete");
  await expect.poll(()=>editor.textContent()).toBe((kind === "task" || kind === "blockquote") ? source.slice(0,bounds.from)+source.slice(bounds.to) : source.slice(0,bounds.from)+source.slice(bounds.from+1));
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(()=>editor.textContent()).toBe(source);
  await page.keyboard.insertText("x");
  await expect.poll(()=>editor.textContent()).toBe(source.slice(0,bounds.from)+"x"+source.slice(bounds.from));
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(()=>editor.textContent()).toBe(source);
  }
});

test("quote Enter continues the box, exits on empty content, and restores with Undo", async ({page}) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", {name:"Markdown 문서"});
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await editor.evaluate(root => {
    const data = new DataTransfer(); data.setData("text/plain", "> first");
    root.dispatchEvent(new ClipboardEvent("paste", {clipboardData:data,bubbles:true,cancelable:true}));
  });
  await page.keyboard.press("Enter");
  await expect.poll(() => editor.textContent()).toBe("> first\n> ");
  await page.keyboard.insertText("second");
  await expect.poll(() => editor.textContent()).toBe("> first\n> second");
  await expect(editor.locator('[data-markdown-kind="blockquote"]')).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect.poll(() => editor.textContent()).toBe("> first\n> second\n> ");
  await page.keyboard.press("Enter");
  await expect.poll(() => editor.textContent()).toBe("> first\n> second\n\n");
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => editor.textContent()).toBe("> first\n> second\n> ");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect.poll(() => editor.textContent()).toBe("> first\n> second\n\n");
  await page.keyboard.insertText("outside");
  await expect.poll(() => editor.textContent()).toBe("> first\n> second\n\noutside");
  await expect(editor.locator('[data-markdown-kind="blockquote"]')).not.toContainText("outside");
});

test("native quote entry preserves its DOM side and vertical goal through selection synchronization", async ({page}) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", {name:"Markdown 문서"});
  const source = "abcdefghij\n> quote text\n> next line\n\nabcdefghij";
  await editor.click(); await page.keyboard.press("ControlOrMeta+a");
  await editor.evaluate((root, source) => {
    const data = new DataTransfer(); data.setData("text/plain", source);
    root.dispatchEvent(new ClipboardEvent("paste", {clipboardData:data,bubbles:true,cancelable:true}));
    const first = document.createTreeWalker(root, NodeFilter.SHOW_TEXT).nextNode()!;
    document.getSelection()!.setBaseAndExtent(first, 7, first, 7);
    document.dispatchEvent(new Event("selectionchange"));
  }, source);
  const position = () => editor.evaluate(root => {
    const selection = document.getSelection()!;
    const range = document.createRange(); range.selectNodeContents(root);
    range.setEnd(selection.focusNode!, selection.focusOffset);
    return range.toString().length;
  });
  await expect.poll(position).toBe(7);
  await page.keyboard.press("ArrowDown");
  // A source-equivalent restore must not move native entry back outside the quote.
  await expect.poll(() => editor.evaluate(() => document.getSelection()!.focusNode!.parentElement!
    .closest('[data-markdown-kind="blockquote"]') !== null)).toBe(true);
  for (let index = 0; index < 3; index++) await page.keyboard.press("ArrowDown");
  await expect.poll(position).toBe(44);
  for (let index = 0; index < 4; index++) await page.keyboard.press("ArrowUp");
  await expect.poll(position).toBe(7);
  await expect.poll(() => editor.textContent()).toBe(source);
});
