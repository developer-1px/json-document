import { expect, test } from "@playwright/test";

test("Composer가 브라우저 편집과 canonical draft를 함께 유지한다", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/demo/composer");
  const editor = page.getByLabel("Agent Chat Composer");
  await editor.click();
  await editor.pressSequentially("draft ");

  await editor.pressSequentially("/");
  await expect(page.getByRole("listbox", { name: "스킬 선택" })).toBeVisible();
  await editor.press("ArrowDown");
  await editor.press("Enter");
  await expect(editor).toContainText("/번역");

  await editor.pressSequentially(" @");
  await expect(page.getByRole("listbox", { name: "에이전트 선택" })).toBeVisible();
  await editor.press("ArrowDown");
  await editor.press("Enter");
  await expect(editor).toContainText("@회의록 에이전트");
  await editor.press("Control+z");
  await expect(editor).not.toContainText("@회의록 에이전트");
  await editor.press("Control+Shift+z");
  await expect(editor).toContainText("@회의록 에이전트");

  await editor.pressSequentially(" check");
  await editor.press("Control+z");
  await expect(editor).not.toContainText("check");
  await editor.press("Control+Shift+z");
  await expect(editor).toContainText("check");

  await page.getByRole("button", { name: "모델 선택" }).click();
  await page.getByRole("option", { name: /Claude Sonnet/ }).click();
  await expect(page.getByRole("button", { name: "모델 선택" })).toContainText("Claude Sonnet");

  await page.getByLabel("파일 첨부").setInputFiles({
    name: "brief.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("composer context"),
  });
  await expect(page.getByLabel("첨부 파일")).toContainText("brief.txt");
  await editor.click();
  await editor.press("Control+z");
  await expect(page.getByLabel("첨부 파일")).not.toBeVisible();
  await editor.press("Control+Shift+z");
  await expect(page.getByLabel("첨부 파일")).toContainText("brief.txt");
  await expect(page.getByTestId("composer-draft-json")).toContainText('"attachments"');
  await expect(page.getByTestId("composer-draft-json")).toContainText('"os.interactive/skill"');
  await expect(page.getByTestId("composer-draft-json")).toContainText('"os.interactive/mention"');

  await editor.press("Enter");
  await expect(page.getByRole("status")).toHaveText("canonical Composer turn을 제출했습니다.");
  expect(pageErrors).toEqual([]);
});

test("클립보드 파일 paste를 undo 가능한 attachment로 저장한다", async ({ page }) => {
  await page.goto("/demo/composer");
  const editor = page.getByLabel("Agent Chat Composer");
  await editor.click();
  await editor.evaluate((element) => {
    const clipboard = new DataTransfer();
    clipboard.items.add(new File(["image"], "pasted.png", { type: "image/png" }));
    element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: clipboard }));
  });

  await expect(page.getByLabel("첨부 파일")).toContainText("pasted.png");
  await expect(page.getByTestId("composer-draft-json")).toContainText('"kind": "image"');
  await editor.press("Control+z");
  await expect(page.getByLabel("첨부 파일")).not.toBeVisible();
});

test("빈 Composer에 처음 입력할 때 React DOM 삭제 오류가 발생하지 않는다", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/demo/composer");
  const editor = page.getByLabel("Agent Chat Composer");
  await editor.click();
  await editor.pressSequentially("a");
  await expect(editor).toHaveText("a");

  expect(pageErrors).toEqual([]);
});
