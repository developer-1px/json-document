import { expect, test } from "@playwright/test";

test("Bear shows only a centered document and supports editing with undo", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", { name: "Markdown 문서" });
  await expect(editor).toBeVisible();
  await expect(page).toHaveTitle("Bear");
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.locator("main").getByRole("button")).toHaveCount(0);
  const bounds = await editor.boundingBox();
  expect(Math.abs(bounds!.x + bounds!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(2);
  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText(" 새 문장");
  await expect(editor).toContainText(" 새 문장");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(editor).not.toContainText(" 새 문장");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(editor).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  expect(errors).toEqual([]);
});


test("Bear Korean confirmation inserts one break and preserves the next Enter", async ({ page }) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", { name: "Markdown 문서" });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText("start ");
  const client = await page.context().newCDPSession(page);
  try {
    for (const text of ["ㅎ", "하", "한", "한글"]) {
      await client.send("Input.imeSetComposition", { text, selectionStart: text.length, selectionEnd: text.length });
    }
    await client.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Process", code: "Enter", windowsVirtualKeyCode: 229 });
    await client.send("Input.insertText", { text: "한글" });
    await page.keyboard.down("Enter");
    await page.keyboard.up("Enter");
    await expect.poll(() => editor.textContent()).toBe("start 한글\n");
    await page.keyboard.press("Enter");
    await expect.poll(() => editor.textContent()).toBe("start 한글\n\n");
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => editor.textContent()).toBe("start 한글\n");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect.poll(() => editor.textContent()).toBe("start 한글\n\n");
    await page.keyboard.insertText("다음");
    await expect.poll(() => editor.textContent()).toBe("start 한글\n\n다음");
  } finally {
    await client.detach();
  }
});


test("Bear does not duplicate a native break committed during composition", async ({ page }) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", { name: "Markdown 문서" });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText("ab");
  // Replay the non-cancelable native path against the product binding.
  // This is an event-order regression, not an OS keyboard simulation.
  await editor.evaluate(root => {
    root.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Process", code: "Enter", keyCode: 229, bubbles: true }));
    root.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertParagraph", isComposing: true, bubbles: true }));
    const text = document.createTextNode("a한\nb");
    root.replaceChildren(text);
    document.getSelection()!.setBaseAndExtent(text, 3, text, 3);
    root.dispatchEvent(new InputEvent("input", { inputType: "insertParagraph", isComposing: true, bubbles: true }));
    root.dispatchEvent(new CompositionEvent("compositionend", { data: "한", bubbles: true }));
    root.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
  });
  await expect.poll(() => editor.textContent()).toBe("a한\nb");
  await page.keyboard.press("Enter");
  await expect.poll(() => editor.textContent()).toBe("a한\n\nb");
});

test("Bear replays the recorded Korean IME release sequence without a second break", async ({ page }) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", { name: "Markdown 문서" });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText("base ");
  await editor.evaluate(root => {
    (window as any).__imeEnterEvents = [];
    for (const type of ["keydown", "keyup"]) root.addEventListener(type, event => {
      const key = event as KeyboardEvent;
      if (key.key === "Enter") (window as any).__imeEnterEvents.push({ type, timeStamp: key.timeStamp, keyCode: key.keyCode });
    });
  });
  const client = await page.context().newCDPSession(page);
  const timestamp = Date.now() / 1000;
  try {
    await client.send("Input.imeSetComposition", { text: "한글", selectionStart: 2, selectionEnd: 2 });
    await client.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 229, timestamp });
    await client.send("Input.insertText", { text: "한글" });
    // Recording 71f515b3: keydown(229), keyup(13), keydown(13) share a timestamp.
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, timestamp });
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r", timestamp });
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, timestamp: timestamp + 0.1 });
    const events = await page.evaluate(() => (window as any).__imeEnterEvents);
    expect(events.slice(0, 3).map((event: any) => event.keyCode)).toEqual([229, 13, 13]);
    expect(new Set(events.slice(0, 3).map((event: any) => event.timeStamp)).size).toBe(1);
    await expect.poll(() => editor.textContent()).toBe("base 한글\n");
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => editor.textContent()).toBe("base 한글");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect.poll(() => editor.textContent()).toBe("base 한글\n");
    await page.keyboard.press("Enter");
    await expect.poll(() => editor.textContent()).toBe("base 한글\n\n");
    await page.keyboard.insertText("다음");
    await expect.poll(() => editor.textContent()).toBe("base 한글\n\n다음");
  } finally { await client.detach(); }
});
