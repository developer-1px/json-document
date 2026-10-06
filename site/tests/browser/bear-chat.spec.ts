import { expect, test } from "@playwright/test";

test("Bear applies tool edits, retains other text, and supports undo", async ({ page }) => {
  const results: Array<Record<string, unknown>> = [];
  await page.route("**/api/llm-agent/tool-results/*", async route => {
    results.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, body: "" });
  });
  await page.route("**/api/llm-agent/turn", async route => {
    expect(route.request().postDataJSON().tools.map((tool: { name: string }) => tool.name)).toEqual(["read_document", "edit_document"]);
    const events = [
      { type: "RUN_STARTED", threadId: "bear", runId: "turn" },
      { type: "CUSTOM", name: "client-tool", value: { token: "read", tool: "read_document", arguments: {} } },
      { type: "CUSTOM", name: "client-tool", value: { token: "append", tool: "edit_document", arguments: { before: "", after: "\n\n추가된 문장" } } },
      { type: "CUSTOM", name: "client-tool", value: { token: "edit", tool: "edit_document", arguments: { before: "생각이 머무는 곳.", after: "생각이 자라는 곳." } } },
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
  expect(results).toHaveLength(3);
  expect(results.every(result => result.ok)).toBe(true);
  await document.press("ControlOrMeta+z");
  await expect(document).toContainText("생각이 머무는 곳.");
  await expect(document).toContainText("추가된 문장");
  await page.getByRole("button", { name: "대화 접기" }).click();
  await expect(page.getByRole("log", { name: "Bear 대화" })).not.toBeVisible();
  await expect(input).toBeVisible();
});
