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

test("a2ui fence의 JSONL을 숨기고 생성 UI로 렌더링한다", async ({ page }) => {
  const catalogId = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json";
  const create = JSON.stringify({ version: "v0.9", createSurface: { surfaceId: "browser-ui", catalogId } });
  const components = JSON.stringify({ version: "v0.9", updateComponents: { surfaceId: "browser-ui", components: [{ id: "root", component: "Card", children: ["title", "body"] }, { id: "title", component: "Text", text: "스트리밍 UI", variant: "h2" }, { id: "body", component: "Text", text: "JSONL 누적 완료", variant: "body" }] } });
  await page.route("**/api/llm-agent/sessions", (route) => route.fulfill({ json: { threads: [] } }));
  await page.route("**/api/llm-agent/turn", (route) => route.fulfill({
    body: agUiStream("thread-a2ui", [`UI를 만들었습니다.\n\``, `\`\`a2ui\n${create}\n${components.slice(0, 60)}`, `${components.slice(60)}\n\`\`\``]),
    contentType: "text/event-stream",
  }));

  await page.goto("/artifact/llm-agent");
  await page.getByLabel("메시지").fill("UI를 만들어줘");
  await page.getByRole("button", { name: "전송" }).click();

  await expect(page.getByRole("heading", { name: "스트리밍 UI" })).toBeVisible();
  await expect(page.getByText("JSONL 누적 완료")).toBeVisible();
  await expect(page.getByText(/createSurface/)).toHaveCount(0);
  await expect(page.getByText(/```a2ui/)).toHaveCount(0);
});

function agUiStream(threadId: string, text: string | ReadonlyArray<string>): string {
  const runId = "run-browser";
  const messageId = "message-browser";
  return [
    { type: "RUN_STARTED", threadId, runId },
    { type: "TEXT_MESSAGE_START", messageId, role: "assistant" },
    ...(typeof text === "string" ? [text] : text).map((delta) => ({ type: "TEXT_MESSAGE_CONTENT", messageId, delta })),
    { type: "TEXT_MESSAGE_END", messageId },
    { type: "RUN_FINISHED", threadId, runId },
  ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}
