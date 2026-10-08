import { expect, test } from "@playwright/test";

test("Enter clears immediately, work is separate from bubbles, and the local conversation resumes", async ({ page }) => {
  let release!: () => void;
  let posted: Record<string, unknown> | undefined;
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/llm-agent/turn", async route => {
    posted = route.request().postDataJSON();
    await ready;
    await route.fulfill({ contentType: "text/event-stream", body: [
      { type: "RUN_STARTED", threadId: "saved-canvas-thread", runId: "one" },
      { type: "TEXT_MESSAGE_CONTENT", messageId: "one", delta: "반영했습니다." },
      { type: "RUN_FINISHED", threadId: "saved-canvas-thread", runId: "one" },
    ].map(event => `data: ${JSON.stringify(event)}\n\n`).join("") });
  });
  await page.goto("/demo/canvas");
  const input = page.getByRole("textbox", { name: "Canvas 편집 요청", exact: true });
  await input.click(); await page.keyboard.insertText("요청 하나"); await input.press("Enter");
  await expect(page.getByRole("group", { name: "나", exact: true })).toHaveText("요청 하나");
  await expect(input).not.toContainText("요청 하나");
  await expect(page.locator('[data-ui-chat-activity]')).toHaveText("작업 중");
  await expect(page.getByRole("group", { name: "AI", exact: true })).toHaveCount(0);
  await page.keyboard.insertText("다음 초안");
  release();
  await expect(page.getByRole("group", { name: "AI", exact: true })).toHaveText("반영했습니다.");
  await expect(page.locator('[data-ui-chat-activity]')).toHaveCount(0);
  await expect(input).toContainText("다음 초안");
  await page.reload();
  await expect(page.getByRole("group", { name: "나", exact: true })).toHaveText("요청 하나");
  await expect(page.getByRole("group", { name: "AI", exact: true })).toHaveText("반영했습니다.");
  await input.click(); await page.keyboard.insertText("이어가기"); await input.press("Enter");
  await expect.poll(() => posted?.threadId).toBe("saved-canvas-thread");
});

test("a failed request stays in the local conversation without an assistant error bubble", async ({ page }) => {
  await page.route("**/api/llm-agent/turn", route => route.fulfill({ status: 500, body: "offline" }));
  await page.goto("/demo/canvas");
  const input = page.getByRole("textbox", { name: "Canvas 편집 요청", exact: true });
  await input.click(); await page.keyboard.insertText("보존할 요청"); await input.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "요청을 완료하지 못했습니다" })).toBeVisible();
  await expect(page.getByRole("group", { name: "AI", exact: true })).toHaveCount(0);
  await expect(page.locator('[data-ui-chat-activity]')).toHaveCount(0);
  await expect(input).not.toContainText("보존할 요청");
  await page.reload();
  await expect(page.getByRole("group", { name: "나", exact: true })).toHaveText("보존할 요청");
  await expect(page.getByRole("status").filter({ hasText: "요청을 완료하지 못했습니다" })).toBeVisible();
});
