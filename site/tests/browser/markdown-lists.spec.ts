import { expect, test, type Locator } from "@playwright/test";
async function source(editor: Locator, value: string) {
  await editor.click(); await editor.press("ControlOrMeta+a");
  await editor.evaluate((root,value) => { const data=new DataTransfer(); data.setData("text/plain",value); root.dispatchEvent(new ClipboardEvent("paste",{clipboardData:data,bubbles:true,cancelable:true})); },value);
  await expect.poll(()=>editor.textContent()).toBe(value);
}
async function select(editor: Locator, anchor:number, focus=anchor) {
  await editor.evaluate((root,{anchor,focus}) => {
    root.focus();
    const at=(offset:number) => { const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let node:Node|null; while((node=walker.nextNode())) { const length=node.textContent!.length; if(offset<=length) return {node,offset}; offset-=length; } throw Error("source offset missing"); };
    const a=at(anchor), f=at(focus); document.getSelection()!.setBaseAndExtent(a.node,a.offset,f.node,f.offset); document.dispatchEvent(new Event("selectionchange"));
  },{anchor,focus});
}
test("list Enter, Tab and Shift Tab use one command with history; plain Tab releases focus", async ({page}) => {
    const [prefix,next,nested] = ["1. ","2. ","   1. "] as const;
    await page.goto("/applications/bear"); const editor=page.getByRole("textbox",{name:"Markdown 문서"});
    await source(editor,prefix+"first"); await page.keyboard.press("Enter");
    await expect.poll(()=>editor.textContent()).toBe(prefix+"first\n"+next);
    await page.keyboard.insertText("second"); await page.keyboard.press("Tab");
    await expect.poll(()=>editor.textContent()).toBe(prefix+"first\n"+nested+"second");
    await expect(editor.locator('[data-markdown-kind="list"] [data-markdown-kind="list"]')).toHaveCount(1);
    await page.keyboard.press("Shift+Tab");
    await expect.poll(()=>editor.textContent()).toBe(prefix+"first\n"+next+"second");
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(()=>editor.textContent()).toBe(prefix+"first\n"+nested+"second");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect.poll(()=>editor.textContent()).toBe(prefix+"first\n"+next+"second");
    await page.keyboard.press("Enter"); await page.keyboard.press("Enter");
    await expect.poll(()=>editor.textContent()).toBe(prefix+"first\n"+next+"second\n\n");
    await page.keyboard.insertText("outside");
    await expect(editor.locator('[data-markdown-kind="list"]').filter({hasText:"outside"})).toHaveCount(0);
  await source(editor,"- one"); await select(editor,1); await page.keyboard.press("Shift+ArrowLeft");
  const marker=editor.locator('[data-markdown-marker="list"]');
  await expect(marker).toHaveAttribute("data-text-projection-selected", "");
  expect(await editor.evaluate(()=>document.getSelection()!.toString())).toBe("-");
  await source(editor,"plain"); await page.keyboard.press("Tab"); await expect(editor).not.toBeFocused();
  await expect.poll(()=>editor.textContent()).toBe("plain");
});
