import { expect, test } from "@playwright/test";

test("LLM Agent가 사용자 버블과 streaming Markdown을 한 세션에 유지한다", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.route("**/api/llm-agent/sessions", (route) => route.fulfill({ json: { threads: [] } }));
  await page.route("**/api/llm-agent/turn", (route) => route.fulfill({
    body: agUiStream("thread-browser", "## 완료\n\n**streaming** 응답"),
    contentType: "text/event-stream",
  }));

  await page.goto("/artifact/llm-agent");
  await page.getByLabel("메시지").fill("브라우저 테스트");
  await page.getByRole("button", { name: "전송" }).click();

  const userMessage = page.locator(".llm-agent-message.user");
  await expect(userMessage).toContainText("브라우저 테스트");
  await expect(userMessage).toHaveCSS("width", /.+px/);
  await expect(page.getByRole("heading", { name: "완료" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("streaming 응답");
  await expect(page).toHaveURL(/session=thread-browser/);
  await expect(page.getByRole("button", { name: "전송" })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

function agUiStream(threadId: string, text: string): string {
  const runId = "run-browser";
  const messageId = "message-browser";
  return [
    { type: "RUN_STARTED", threadId, runId },
    { type: "TEXT_MESSAGE_START", messageId, role: "assistant" },
    { type: "TEXT_MESSAGE_CONTENT", messageId, delta: text },
    { type: "TEXT_MESSAGE_END", messageId },
    { type: "RUN_FINISHED", threadId, runId },
  ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}
