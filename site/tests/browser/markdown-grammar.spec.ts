import { expect, test, type Page } from "@playwright/test";

async function setSource(page: Page, source: string) {
  const editor = page.getByTestId("markdown-editor");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await editor.evaluate((root, source) => {
    const data = new DataTransfer(); data.setData("text/plain", source);
    root.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, source);
  await expect.poll(async () => JSON.parse((await page.getByTestId("markdown-source-json").textContent())!).source).toBe(source);
  return editor;
}

const source = [
  "# 제목 😀", "", "Setext", "======", "", "> 인용", "", "- [x] 완료", "- [ ] 다음", "  - 중첩", "", "1. 하나", "2. 둘", "",
  "**굵게** *기울임* ~~취소~~ `inline`", "", "[링크](https://example.com) ![그림](/favicon.svg)", "",
  "| 왼쪽 | 오른쪽 |", "| :--- | ---: |", "| 한글 | **굵게** |", "", "```js", "const value = 1;", "```", "", "---", "", "끝",
].join("\n");

test("CommonMark/GFM presentation preserves source, block edits, copy and undo", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/demo/markdown-caret");
  const editor = await setSource(page, source);
  await page.getByRole("heading", {name:"Markdown 원문을 직접 편집합니다."}).click();
  await expect(editor.locator('[data-markdown-kind="heading"]')).toHaveCount(2);
  await expect(editor.locator('[data-markdown-kind="table"]')).toBeVisible();
  await expect(editor.locator('[data-markdown-kind="code"]')).toHaveCSS("display", "inline-block");
  await expect(editor.locator('[data-markdown-kind="emphasis"]')).toHaveCSS("font-style", "italic");
  await expect(editor.locator('[data-markdown-kind="delete"]')).toHaveCSS("text-decoration-line", "line-through");
  await editor.locator('[data-markdown-kind="heading"]').first().click();
  await expect(editor.locator('[data-markdown-kind="heading"]').first().locator('[data-markdown-heading-marker]')).toHaveCSS("color", "rgba(0, 0, 0, 0)");
  await editor.evaluate(root => {
    const first = document.createTreeWalker(root, NodeFilter.SHOW_TEXT).nextNode()!;
    document.getSelection()!.setBaseAndExtent(first, 0, first, 0);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await page.keyboard.press("Delete");
  await expect(editor.locator('[data-markdown-kind="heading"]')).toHaveCount(1);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(editor.locator('[data-markdown-kind="heading"]')).toHaveCount(2);
  await expect.poll(async () => JSON.parse((await page.getByTestId("markdown-source-json").textContent())!).source).toBe(source);
  await page.keyboard.press("ControlOrMeta+a");
  const copied = await editor.evaluate(root => {
    const data = new DataTransfer(); root.dispatchEvent(new ClipboardEvent("copy", {clipboardData:data, bubbles:true, cancelable:true})); return data.getData("text/plain");
  });
  expect(copied).toBe(source);
  await editor.locator('[data-markdown-kind="tableCell"]').last().click();
  await expect(editor.locator('[data-markdown-kind="table"]')).toHaveAttribute("data-markdown-active", "true");
  await page.keyboard.insertText("편집");
  await expect.poll(async () => JSON.parse((await page.getByTestId("markdown-source-json").textContent())!).source.includes("편집")).toBe(true);
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(async () => JSON.parse((await page.getByTestId("markdown-source-json").textContent())!).source).toBe(source);
  expect(errors).toEqual([]);
});

test("Bear exposes the full grammar in a document-only responsive surface", async ({page}) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", {name:"Markdown 문서"});
  await expect(editor.locator('[data-markdown-kind="heading"]')).toHaveCount(2);
  await expect(editor.locator('[data-markdown-kind="table"]')).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.locator("main").getByRole("button")).toHaveCount(0);
  await page.setViewportSize({width:375,height:812});
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test("heading gutters preserve presentation, source, accessible names and editing", async ({ page }) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", { name: "Markdown 문서" });
  const headings = ["큰 제목", "두 번째 제목", "길게 이어지는 제목도 문서의 흐름을 유지합니다", "네 번째 제목", "다섯 번째 제목", "여섯 번째 제목"];
  const documentSource = headings.map((title, index) => "#".repeat(index + 1) + " " + title).join("\n\n") + "\n\n본문은 그대로 이어집니다.\n";
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await editor.evaluate((root, source) => {
    const data = new DataTransfer(); data.setData("text/plain", source);
    root.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, documentSource);
  for (const [index, title] of headings.entries()) {
    const heading = editor.getByRole("heading", { level: index + 1, name: title, exact: true });
    await expect(heading).toBeVisible();
    await heading.click();
    await expect(heading.locator(':scope > [data-markdown-heading-marker]')).toHaveCSS("color", "rgba(0, 0, 0, 0)");
    const content = await heading.evaluate(element => getComputedStyle(element, "::before").content);
    expect(content).toContain(`H${index + 1}`);
  }
  const third = editor.getByRole("heading", { level: 3 });
  await third.evaluate(element => {
    const body = element.querySelector('[data-markdown-kind="text"]')!;
    const text = document.createTreeWalker(body, NodeFilter.SHOW_TEXT).nextNode()!;
    document.getSelection()!.setBaseAndExtent(text, text.textContent!.length, text, text.textContent!.length);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await page.keyboard.insertText(" 새 문장");
  await expect(third).toContainText(" 새 문장");
  await expect(third.locator(':scope > [data-markdown-heading-marker]')).toHaveCSS("color", "rgba(0, 0, 0, 0)");
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => editor.textContent()).toBe(documentSource);
  await page.keyboard.press("ControlOrMeta+a");
  const copied = await editor.evaluate(root => {
    const data = new DataTransfer();
    root.dispatchEvent(new ClipboardEvent("copy", { clipboardData: data, bubbles: true, cancelable: true }));
    return data.getData("text/plain");
  });
  expect(copied).toBe(documentSource);
  await page.getByRole("button", {name: "REC 기록 시작"}).focus();
  await page.evaluate(() => document.getSelection()?.removeAllRanges());
  await page.screenshot({ path: "/tmp/bear-heading-gutters-desktop.png" });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  for (const heading of await editor.getByRole("heading").all()) {
    const markerLeft = await heading.evaluate(element => {
      const marker = getComputedStyle(element, "::before");
      return element.getBoundingClientRect().left + parseFloat(marker.left);
    });
    expect(markerLeft).toBeGreaterThanOrEqual(0);
  }
  await page.screenshot({ path: "/tmp/bear-heading-gutters-mobile.png" });
});
