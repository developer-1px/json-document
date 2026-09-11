import {expect, test, type Locator, type Page} from "@playwright/test";

const word = "abcdefghij";
const fixtures = [
  ["plain", `${word}\nx\n${word}\n\n${word}`],
  ["quote", `${word}\n> ${word}\n> ${word}\n\n${word}`],
  ["nested quote", `${word}\n> > ${word}\n> > ${word}\n\n${word}`],
  ["headings", `${word}\n# ${word}\n## ${word}\n\n${word}`],
  ["bullets", `${word}\n- ${word}\n- ${word}\n\n${word}`],
  ["ordered", `${word}\n1. ${word}\n2. ${word}\n\n${word}`],
  ["tasks", `${word}\n- [ ] ${word}\n- [x] ${word}\n\n${word}`],
  ["code", `${word}\n\n\`\`\`js\n${word}\n${word}\n\`\`\`\n\n${word}`],
  ["inline styles", `${word}\n\n**${word}** and [link](/test)\n\n\`${word}\`\n\n${word}`],
  ["table", `${word}\n\n| ${word} | other |\n| --- | --- |\n| ${word} | next |\n\n${word}`],
] as const;

async function prepare(page: Page, source: string) {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", {name:"Markdown 문서"});
  await editor.click(); await page.keyboard.press("ControlOrMeta+a");
  await editor.evaluate((root, source) => {
    const data = new DataTransfer(); data.setData("text/plain", source);
    root.dispatchEvent(new ClipboardEvent("paste", {clipboardData:data,bubbles:true,cancelable:true}));
  }, source);
  await select(editor, 7);
  return editor;
}
async function select(editor: Locator, offset: number) {
  await editor.evaluate((root, offset) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (offset <= node.textContent!.length) {
        document.getSelection()!.setBaseAndExtent(node, offset, node, offset); break;
      }
      offset -= node.textContent!.length;
    }
    document.dispatchEvent(new Event("selectionchange"));
  }, offset);
}
async function point(editor: Locator) {
  return editor.evaluate(root => {
    const selection = document.getSelection()!;
    const offset = (node: Node, at: number) => {const range = document.createRange(); range.selectNodeContents(root); range.setEnd(node, at); return range.toString().length;};
    const range = document.createRange(); range.setStart(selection.focusNode!, selection.focusOffset); range.collapse(true);
    const rect = range.getBoundingClientRect();
    return {anchor:offset(selection.anchorNode!, selection.anchorOffset), focus:offset(selection.focusNode!, selection.focusOffset), x:rect.x, y:rect.y, height:rect.height,
      hidden:!!selection.focusNode!.parentElement?.closest('[data-text-projection-source], [hidden], [contenteditable="false"]')};
  });
}

for (const [name, source] of fixtures) for (const extend of [false, true]) test(`${name}: ${extend ? "Shift selection" : "caret"} traverses all visible text rows in both directions`, async ({page}) => {
  const editor = await prepare(page, source);
  const visited: number[] = [7];
  for (const direction of ["Down", "Up"]) {
    let previous = await point(editor);
    const boundary = direction === "Down" ? source.length : 0;
    for (let step = 0; step < 30 && previous.focus !== boundary; step++) {
      await page.keyboard.press(`${extend ? "Shift+" : ""}Arrow${direction}`);
      const next = await point(editor);
      expect(next.hidden, JSON.stringify({direction,previous,next})).toBe(false);
      expect(next.focus, JSON.stringify({direction,previous,next})).not.toBe(previous.focus);
      if (extend) expect(next.anchor).toBe(7);
      visited.push(next.focus); previous = next;
    }
    expect(previous.focus).toBe(boundary);
  }
  for (const match of source.matchAll(/abcdefghij/g)) {
    expect(visited.some(offset => offset >= match.index && offset <= match.index + word.length), `never visited body at ${match.index}; visited ${visited}`).toBe(true);
  }
  await expect(editor).toHaveText(source);
});

test("vertical navigation remembers x across a short quote line and resets after horizontal input", async ({page}) => {
  const source = `${word}\n> x\n> ${word}\n\n${word}`;
  const editor = await prepare(page, source);
  const initial = await point(editor);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  expect(Math.abs((await point(editor)).x - initial.x)).toBeLessThan(8);
  await page.keyboard.press("ArrowLeft");
  const changed = await point(editor);
  await page.keyboard.press("ArrowUp"); await page.keyboard.press("ArrowUp");
  expect(Math.abs((await point(editor)).x - changed.x)).toBeLessThan(8);
});

test("wrapped Korean and emoji text moves through visual lines without splitting source graphemes", async ({page}) => {
  await page.setViewportSize({width:480,height:900});
  const source = `${word}\n> ${"가나다 👩‍💻 é 아자차카타파하 ".repeat(9)}\n> 짧음\n> ${"가나다 👩‍💻 é 아자차카타파하 ".repeat(6)}\n\n${word}`;
  const editor = await prepare(page, source);
  const boundaries = new Set([...new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(source)].map(part=>part.index)); boundaries.add(source.length);
  let last = await point(editor);
  for (let step = 0; step < 20; step++) {
    await page.keyboard.press("ArrowDown"); const next = await point(editor);
    expect(boundaries.has(next.focus)).toBe(true);
    expect(next.hidden).toBe(false);
    if (next.focus === source.length) break;
    expect(next.focus).toBeGreaterThan(last.focus); last = next;
  }
  await expect(editor).toHaveText(source);
});

test("blank terminal lines remain reachable and pointer placement resets the horizontal goal", async ({page}) => {
  const source = `${word}\n> x\n> ${word}\n\n`;
  const editor = await prepare(page, source);
  await page.keyboard.press("ArrowDown");
  const first = await point(editor);
  await page.mouse.click(first.x, first.y + first.height / 2);
  const clicked = await point(editor);
  await page.keyboard.press("ArrowDown");
  expect(Math.abs((await point(editor)).x - clicked.x)).toBeLessThan(8);
  for(let i=0;i<4;i++) await page.keyboard.press("ArrowDown");
  expect((await point(editor)).focus).toBe(source.length);
  await page.keyboard.insertText("end");
  await expect(editor).toHaveText(source + "end");
});

test("the public navigation adapter handles 1000 plain lines and reveals a caret inside a scroll container", async ({page}) => {
  await page.goto("/applications/bear");
  const packageRoot = new URL("../../../packages/", import.meta.url).pathname;
  await page.evaluate(async packageRoot => {
    const contenteditable = await import(/* @vite-ignore */ `/@fs${packageRoot}json-document-contenteditable/src/index.ts`);
    const core = await import(/* @vite-ignore */ `/@fs${packageRoot}json-document/src/application/document/index.ts`);
    const editing = await import(/* @vite-ignore */ `/@fs${packageRoot}json-document-editing/src/index.ts`);
    const source = Array.from({length:1000},(_,i)=>`${i}: abcdefghij`).join("\n");
    const root = document.createElement("div"); root.contentEditable="true"; root.dataset.testid="generic-navigation";
    root.style.cssText="position:fixed;top:20px;left:20px;width:360px;height:160px;overflow:auto;white-space:pre-wrap;line-height:28px;font:18px/28px monospace;background:white;z-index:9999";
    document.body.append(root);
    const model = core.createJSONDocument(source), editor = editing.createTextEditor(model);
    const dom = contenteditable.createTextNavigationDOMAdapter(contenteditable.plainTextDOMAdapter);
    contenteditable.createContentEditableBinding({document:model,pointer:"",editor,root,dom}).bind();
    root.focus(); editor.select({anchor:7,focus:7});
  }, packageRoot);
  const editor = page.getByTestId("generic-navigation");
  for(let i=0;i<22;i++) await page.keyboard.press("ArrowDown");
  expect(await editor.evaluate(root=>root.scrollTop)).toBeGreaterThan(200);
  const p=await point(editor), box=await editor.boundingBox();
  expect(p.y).toBeGreaterThanOrEqual(box!.y);
  expect(p.y+p.height).toBeLessThanOrEqual(box!.y+box!.height+1);
  for(let i=0;i<22;i++) await page.keyboard.press("ArrowUp");
  expect((await point(editor)).focus).toBe(7);
});
