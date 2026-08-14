import { expect, test, type Page } from "@playwright/test";

test("Rich Text Lab commits contenteditable input through JSON Patch and restores history", async ({ page }) => {
  await page.goto("/editing/rich-text");

  const editor = page.getByTestId("rich-text-editor");
  await expect(editor).toHaveAttribute("contenteditable", "true");
  await expect(editor.getByRole("heading", { level: 2, name: "Canonical Rich Text" })).toBeVisible();
  await expect(editor.locator("strong")).toHaveText("Canonical Rich Text");
  await expect(editor.locator("em")).toHaveText("JSONDocument");

  const editableText = editor.locator('[data-rich-text-node-id="text-editable"]');
  await editableText.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    (element.closest('[contenteditable="true"]') as HTMLElement | null)?.focus();
  });
  await page.keyboard.type(" OK");

  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요. OK",
  });
  expect(await json(page, "rich-text-patch-json")).toEqual([{
    op: "replace",
    path: "/content/2/content/0/text",
    value: "여기를 선택하고 직접 입력해 보세요. OK",
  }]);
  expect((await json(page, "rich-text-selection-json")).selection.ranges[0].focus).toMatchObject({
    kind: "text",
    nodeId: "text-editable",
    offset: 23,
  });

  await page.getByRole("button", { name: "Undo" }).click();
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요.",
  });

  await page.getByRole("button", { name: "Redo" }).click();
  expect(textNode(await json(page, "rich-text-document-json"), "text-editable")).toMatchObject({
    text: "여기를 선택하고 직접 입력해 보세요. OK",
  });
});

async function json(page: Page, testId: string): Promise<any> {
  return JSON.parse(await page.getByTestId(testId).innerText());
}

function textNode(document: any, id: string): any {
  const queue = [document];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node?.id === id) return node;
    if (Array.isArray(node?.content)) queue.push(...node.content);
  }
  return null;
}
