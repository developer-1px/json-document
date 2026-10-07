import { expect, test, type Locator, type Page } from "@playwright/test";

async function source(page: Page, value: string) {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", {name: "Markdown 문서"});
  await editor.click(); await editor.press("ControlOrMeta+a");
  await editor.evaluate((root, text) => {
    // Dispatch literal clipboard input through the product binding. Firefox does
    // not expose data attached to an untrusted ClipboardEvent constructor.
    const data = new DataTransfer(); data.setData("text/plain", text);
    const event = new Event("paste", {bubbles: true, cancelable: true});
    Object.defineProperty(event, "clipboardData", {value: data});
    root.dispatchEvent(event);
  }, value);
  await expect.poll(() => editor.textContent()).toBe(value);
  return editor;
}

async function select(editor: Locator, anchor: number, focus = anchor) {
  await editor.evaluate((root, {anchor, focus}) => {
    root.focus();
    const at = (offset: number) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement?.closest("[data-text-decoration]")) continue;
        const length = node.textContent!.length;
        if (offset <= length) return {node, offset};
        offset -= length;
      }
      return {node: root, offset: root.childNodes.length};
    };
    const a = at(anchor), f = at(focus);
    document.getSelection()!.setBaseAndExtent(a.node, a.offset, f.node, f.offset);
    document.dispatchEvent(new Event("selectionchange"));
  }, {anchor, focus});
  await expect(editor).toHaveAttribute("data-text-selection-virtual", "");
}

const rectangles = (page: Page) => page.locator("[data-text-selection-range]").evaluateAll(elements => elements.map(element => {
  const {x, y, width, height} = element.getBoundingClientRect(); return {x, y, width, height};
}));

test("forward and backward selection paint visible list text and atomic markers once", async ({page}) => {
  const value = "- **first** item\n  - nested\n- [ ] task\n\nlast";
  const editor = await source(page, value);
  await select(editor, 0, value.indexOf("\n\n"));
  await expect.poll(async () => (await rectangles(page)).length).toBeGreaterThanOrEqual(3);
  const forward = await rectangles(page);
  const nativeGeometry = await editor.evaluate(root => {
    const range = document.createRange(), walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textHeights: number[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement?.closest('[hidden], [data-text-projection-source]')) continue;
      range.selectNodeContents(node);
      textHeights.push(...Array.from(range.getClientRects(), rect => rect.height));
    }
    return {textHeights, markerHeights: Array.from(root.querySelectorAll('[data-markdown-marker]'), marker => marker.getBoundingClientRect().height)};
  });
  await test.info().attach("selection-geometry", {body: JSON.stringify({nativeGeometry, painted: forward}, null, 2), contentType: "application/json"});
  const marker = await editor.locator('[data-markdown-marker="list"]').nth(1).boundingBox();
  const nested = forward.filter(rect => rect.y < marker!.y + marker!.height && rect.y + rect.height > marker!.y);
  expect(Math.min(...nested.map(rect => rect.x))).toBeCloseTo(marker!.x, 0);
  expect(new Set(nested.map(rect => rect.height)).size).toBe(1);
  expect(await editor.locator("strong").evaluate(element => getComputedStyle(element, "::selection").backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  await select(editor, value.indexOf("\n\n"), 0);
  await expect.poll(() => rectangles(page)).toEqual(forward);
  expect(await page.evaluate(() => document.getSelection()!.toString())).toBe(value.slice(0, value.indexOf("\n\n")));
  await page.screenshot({path: test.info().outputPath("bear-virtual-selection.png")});
});

test("caret follows native text affinity, projected edges, blank lines and keyboard selection", async ({page}) => {
  const editor = await source(page, "- first\n\nlast\n");
  const caret = page.locator("[data-text-selection-caret]");
  await select(editor, 1);
  await expect(caret).toHaveCount(1);
  const marker = await editor.locator('[data-markdown-marker="list"]').boundingBox();
  expect((await caret.boundingBox())!.x).toBeCloseTo(marker!.x + marker!.width, 0);
  await select(editor, 12);
  await expect.poll(async () => {
    const native = await editor.evaluate(() => document.getSelection()!.getRangeAt(0).getBoundingClientRect().left);
    return Math.abs((await caret.boundingBox())!.x - native);
  }).toBeLessThan(1);
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(caret).toHaveCount(0);
  await expect(page.locator("[data-text-selection-range]")).toHaveCount(1);
  await select(editor, 14);
  await expect(caret).toHaveCount(1);
  await page.keyboard.insertText("next");
  await expect.poll(() => editor.textContent()).toBe("- first\n\nlast\nnext");
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => editor.textContent()).toBe("- first\n\nlast\n");
});

test("scroll, viewport reflow and CSS zoom keep the overlay aligned", async ({page}) => {
  const value = "A long visible sentence with **bold text** and words ".repeat(8);
  const editor = await source(page, value);
  await select(editor, 10, value.length - 5);
  const assertInside = async () => {
    const bounds = await editor.boundingBox();
    const rects = await rectangles(page);
    expect(rects.length).toBeGreaterThan(1);
    expect(rects.every(rect => rect.x >= bounds!.x - 1 && rect.x + rect.width <= bounds!.x + bounds!.width + 2)).toBe(true);
  };
  await assertInside();
  await page.setViewportSize({width: 375, height: 812});
  await expect.poll(async () => (await rectangles(page)).length).toBeGreaterThan(5);
  await assertInside();
  await editor.evaluate(root => {root.style.zoom = "1.25";});
  await expect.poll(() => editor.evaluate(root => getComputedStyle(root).zoom)).toBe("1.25");
  await assertInside();
  await page.evaluate(() => window.scrollBy(0, 150));
  await expect.poll(async () => {
    const first = (await rectangles(page))[0]!;
    const native = await editor.evaluate(root => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const node = walker.nextNode()!;
      const range = document.createRange(); range.setStart(node, 10); range.setEnd(node, node.textContent!.length);
      const rect = range.getClientRects()[0]!; return rect.top + rect.height / 2;
    });
    return Math.abs(first.y + first.height / 2 - native);
  }).toBeLessThan(1);
});

test("composition, nested controls and forced colors retain native presentation", async ({page}) => {
  const editor = await source(page, "- [ ] task\n\ntext");
  await select(editor, 15);
  await editor.dispatchEvent("compositionstart");
  await expect(editor).not.toHaveAttribute("data-text-selection-virtual");
  await expect(page.locator("[data-text-selection-caret]")).toHaveCount(0);
  await editor.dispatchEvent("compositionend", {data: ""});
  await expect(editor).toHaveAttribute("data-text-selection-virtual", "");
  await editor.getByRole("checkbox").focus();
  await expect(editor).not.toHaveAttribute("data-text-selection-virtual");
  await select(editor, 15);
  await page.emulateMedia({forcedColors: "active"});
  await expect(editor).not.toHaveAttribute("data-text-selection-virtual");
  await page.goto("/demo/markdown-caret");
  await expect(page.locator("[data-text-selection-overlay]")).toHaveCount(1);
  await page.goto("/");
  await expect(page.locator("[data-text-selection-overlay]")).toHaveCount(0);
});

test("pointer drag preserves literal source copy, paste and undo/redo", async ({page, browserName}) => {
  const editor = await source(page, "alpha beta gamma");
  const points = await editor.evaluate(root => {
    const node = document.createTreeWalker(root, NodeFilter.SHOW_TEXT).nextNode()!;
    const at = (offset: number) => {
      const range = document.createRange(); range.setStart(node, offset); range.setEnd(node, offset + 1);
      const rect = range.getBoundingClientRect(); return {x: rect.left, y: rect.top + rect.height / 2};
    };
    return [at(0), at(5)];
  });
  await page.mouse.move(points[0]!.x, points[0]!.y); await page.mouse.down();
  await page.mouse.move(points[1]!.x, points[1]!.y, {steps: 10}); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => document.getSelection()!.toString())).toBe("alpha");
  await expect(page.locator("[data-text-selection-range]")).toHaveCount(1);
  // Clipboard permissions are declared only by the Chrome project.
  if (browserName === "chromium") {
    await page.keyboard.press("ControlOrMeta+c");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("alpha");
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("ControlOrMeta+v");
    await expect.poll(() => editor.textContent()).toBe("alphaalpha beta gamma");
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => editor.textContent()).toBe("alpha beta gamma");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect.poll(() => editor.textContent()).toBe("alphaalpha beta gamma");
  }
});

test("caret stays visible on blank lines and after deleting all visible text", async ({page}) => {
  const editor = await source(page, "first\n\nlast");
  await select(editor, 6);
  const caret = page.locator("[data-text-selection-caret]");
  await expect(caret).toHaveCount(1);
  await editor.press("ControlOrMeta+a"); await editor.press("Backspace");
  // Firefox's existing native empty-host placeholder may retain a source LF.
  await expect.poll(async () => (await editor.textContent())!.trim()).toBe("");
  await expect(caret).toHaveCount(1);
  expect((await caret.boundingBox())!.height).toBeGreaterThan(10);
  await page.keyboard.insertText("한글");
  await expect.poll(async () => (await editor.textContent())!.trim()).toBe("한글");
});

test("an ancestor scroll panel clips the selection and updates its coordinates", async ({page}) => {
  const value = "A visible line\n".repeat(20);
  const editor = await source(page, value);
  await editor.evaluate(root => {
    Object.assign(root.parentElement!.style, {height: "300px", minHeight: "0", overflow: "auto", margin: "24px"});
    Object.assign(root.style, {minHeight: "0", padding: "32px"});
  });
  await select(editor, 0, value.length);
  const layer = page.locator("[data-text-selection-overlay]");
  await expect.poll(async () => (await layer.boundingBox())!.height).toBe(300);
  const before = (await rectangles(page))[0]!;
  await editor.evaluate(root => {root.parentElement!.scrollTop = 100;});
  await expect.poll(async () => (await rectangles(page))[0]!.y).toBeCloseTo(before.y - 100, 0);
  const clip = await layer.boundingBox();
  expect(clip!.y).toBe(24);
  expect(clip!.height).toBe(300);
});
