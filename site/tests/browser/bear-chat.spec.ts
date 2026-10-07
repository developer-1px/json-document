import { expect, test } from "@playwright/test";

test("Bear applies tool edits, retains other text, and supports undo", async ({ page }) => {
  const results: Array<Record<string, unknown>> = [];
  await page.route("**/api/llm-agent/tool-results/*", async route => {
    results.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, body: "" });
  });
  await page.route("**/api/llm-agent/turn", async route => {
    expect(route.request().postDataJSON().tools.map((tool: { name: string }) => tool.name)).toEqual(["read_document", "edit_document", "move_document", "find_in_document", "read_selection", "undo_document", "redo_document"]);
    const events = [
      { type: "RUN_STARTED", threadId: "bear", runId: "turn" },
      { type: "CUSTOM", name: "client-tool", value: { token: "read", tool: "read_document", arguments: {} } },
      { type: "CUSTOM", name: "client-tool", value: { token: "append", tool: "edit_document", arguments: { before: "", after: "\n\n추가된 문장" } } },
      { type: "CUSTOM", name: "client-tool", value: { token: "edit", tool: "edit_document", arguments: { before: "생각이 머무는 곳.", after: "생각이 자라는 곳." } } },
      { type: "CUSTOM", name: "client-tool", value: { token: "move", tool: "move_document", arguments: { text: "생각이 자라는 곳.\n\n", anchor: "# Bear\n\n", placement: "before" } } },
      { type: "TEXT_MESSAGE_CONTENT", messageId: "reply", delta: "본문을 수정했습니다." },
      { type: "RUN_FINISHED", threadId: "bear", runId: "turn" },
    ];
    await route.fulfill({ contentType: "text/event-stream", body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") });
  });
  await page.goto("/applications/bear");
  const input = page.getByRole("textbox", { name: "글쓰기 요청", exact: true });
  await input.click();
  await page.keyboard.insertText("본문을 추가하고 다듬어줘");
  await input.press("Enter");
  const document = page.getByRole("textbox", { name: "Markdown 문서", exact: true });
  await expect(document).toContainText("추가된 문장");
  await expect(document).toContainText("생각이 자라는 곳.");
  await expect(page.getByRole("group", { name: "AI", exact: true })).toHaveText("본문을 수정했습니다.");
  expect(results).toHaveLength(4);
  expect(results.every(result => result.ok)).toBe(true);
  expect((await document.textContent())!.indexOf("생각이 자라는 곳.")).toBeLessThan((await document.textContent())!.indexOf("Bear"));
  await document.press("ControlOrMeta+z");
  expect((await document.textContent())!.indexOf("생각이 자라는 곳.")).toBeGreaterThan((await document.textContent())!.indexOf("Bear"));
  await document.press("ControlOrMeta+z");
  await expect(document).toContainText("생각이 머무는 곳.");
  await expect(document).toContainText("추가된 문장");
  await page.getByRole("button", { name: "대화 접기" }).click();
  await expect(page.getByRole("log", { name: "Bear 대화" })).not.toBeVisible();
  await expect(input).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "이 브라우저에 저장됨" })).toBeVisible();
  await page.reload();
  await expect(document).toContainText("추가된 문장");
  await expect(document).toContainText("생각이 머무는 곳.");
  const download = page.getByRole("link", { name: "Markdown 저장" });
  expect(decodeURIComponent((await download.getAttribute("href"))!)).toContain("추가된 문장");
});

test("Bear keeps unreadable local data and shows recovery state", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("json-document.bear.v1", "invalid json"));
  await page.goto("/applications/bear");
  await expect(page.getByRole("status").filter({ hasText: "저장된 글을 읽지 못했습니다" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("json-document.bear.v1"))).toBe("invalid json");
  await page.getByRole("button", { name: "저장 다시 시도" }).click();
  await expect(page.getByRole("status").filter({ hasText: "이 브라우저에 저장됨" })).toBeVisible();
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem("json-document.bear.v1")))!).source).toContain("# Bear");
});

test("agent-written example persists independently from the existing document", async ({ page }) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", { name: "Markdown 문서", exact: true });
  await editor.press("ControlOrMeta+End");
  await page.keyboard.insertText(" 나만의 원고");
  await page.getByRole("link", { name: "작성 예제", exact: true }).click();
  await expect(editor).toContainText("AI native로 글을 쓰는 법");
  await expect(editor).not.toContainText("나만의 원고");
  await editor.press("ControlOrMeta+End");
  await page.keyboard.insertText(" 예제 수정");
  await page.reload();
  await expect(editor).toContainText("예제 수정");
  await page.getByRole("link", { name: "내 글", exact: true }).click();
  await expect(editor).toContainText("나만의 원고");
  await expect(editor).not.toContainText("예제 수정");
});
