import { expect, test } from "@playwright/test";

test("Composer가 브라우저 편집과 canonical draft를 함께 유지한다", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/demo/composer");
  const editor = page.getByLabel("Agent Chat Composer");
  await editor.click();
  await editor.pressSequentially("draft ");

  await page.getByRole("button", { name: "추가" }).click();
  await expect(page.getByRole("menu")).toBeFocused();
  await page.getByRole("menuitem", { name: /스킬/ }).click();
  await expect(editor).toBeFocused();
  await expect(page.getByRole("listbox", { name: "스킬 선택" })).toBeVisible();
  await expect(editor).toHaveAttribute("aria-activedescendant", "composer-command-listbox-option-skill-summary");
  await editor.press("ArrowDown");
  await expect(editor).toHaveAttribute("aria-activedescendant", "composer-command-listbox-option-skill-translate");
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
  const modelListbox = page.getByRole("listbox", { name: "모델 선택" });
  await expect(modelListbox).toBeFocused();
  await expect(modelListbox).toHaveAttribute("aria-activedescendant", "composer-model-option-gpt-5.6");
  await modelListbox.press("ArrowUp");
  await expect(modelListbox).toHaveAttribute("aria-activedescendant", "composer-model-option-claude-sonnet");
  await modelListbox.press("Enter");
  await expect(page.getByRole("button", { name: "모델 선택" })).toContainText("Claude Sonnet");
  await expect(page.getByRole("button", { name: "모델 선택" })).toBeFocused();

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
  await expect(editor).toHaveAttribute("aria-placeholder", "작업을 입력하세요");
  await expect(editor).toHaveAttribute("data-rich-text-empty", "true");
  await expect(editor.locator('[data-rich-text-placeholder="작업을 입력하세요"]')).toHaveCount(1);
  await editor.click();
  await editor.pressSequentially("ab");
  await expect(editor).toHaveAttribute("data-rich-text-empty", "false");
  await expect(editor.locator('[data-rich-text-placeholder="작업을 입력하세요"]')).toHaveCount(0);
  await editor.press("Backspace");
  await expect(editor).toHaveText("a");
  await editor.press("Backspace");
  await expect(editor).toBeEmpty();
  await expect(editor).toHaveAttribute("data-rich-text-empty", "true");
  await expect(editor.locator('[data-rich-text-placeholder="작업을 입력하세요"]')).toHaveCount(1);
  await editor.pressSequentially("c");
  await expect(editor).toHaveText("c");

  expect(pageErrors).toEqual([]);
});

test("빈 Composer의 첫 한글 IME 입력이 placeholder DOM과 충돌하지 않는다", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium");
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/demo/composer");
  const editor = page.getByLabel("Agent Chat Composer");
  await editor.click();

  const client = await page.context().newCDPSession(page);
  for (const text of ["ㅎ", "하", "한", "한ㄱ", "한그", "한글"]) {
    await client.send("Input.imeSetComposition", {
      text,
      selectionStart: text.length,
      selectionEnd: text.length,
    });
  }
  await client.send("Input.insertText", { text: "한글" });
  await client.detach();

  await expect(editor).toHaveText("한글");
  await editor.press("Backspace");
  await expect(editor).toHaveText("한");
  expect(pageErrors).toEqual([]);
});
