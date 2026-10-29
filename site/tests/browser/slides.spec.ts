import { expect, test } from "@playwright/test";

for (const sample of [
  { name: "Slides", route: "/applications/slides", pageId: "slide-1", title: "생각을 한 장씩, 함께 완성하는 이야기." },
  { name: "Agent Review", route: "/applications/agent-review", pageId: "review-introduction", title: "좋은 생각을, 함께 더 명확하게." },
]) {
test.describe(sample.name, () => {
test("continuous speech revises running work and publishes only the latest intention without submit", async ({ page }) => {
  await page.addInitScript(() => {
    class SpeechMock {
      onresult: any; onerror: any; onend: any;
      constructor() { (window as any).speechMock = this; (window as any).speechResults = []; }
      start() {} stop() { this.onend?.(); } abort() {}
    }
    (window as any).SpeechRecognition = SpeechMock;
    (window as any).webkitSpeechRecognition = SpeechMock;
  });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const prompts: string[] = [];
  const results: any[] = [];
  await page.route("**/api/llm-agent/tool-results/*", async route => { results.push(route.request().postDataJSON()); await route.fulfill({ body: "" }); });
  await page.route("**/api/llm-agent/turn", async route => {
    const body = route.request().postDataJSON();
    if (body.tools.some((tool: any) => tool.name === "queue_review")) {
      const events = [
        { type: "RUN_STARTED", threadId: "coordinator", runId: "plan" },
        { type: "TEXT_MESSAGE_CONTENT", messageId: "plan", delta: "제목을 요청에 맞춰 수정하겠습니다." },
        { type: "CUSTOM", name: "client-tool", value: { token: `plan-${prompts.length}`, tool: "queue_review", arguments: { targetNodeIds: ["title"], instruction: "사용자의 최신 지시에 맞춰 제목을 수정하세요.", reply: "제목을 수정하겠습니다." } } },
        { type: "RUN_FINISHED", threadId: "coordinator", runId: "plan" },
      ];
      await route.fulfill({ contentType: "text/event-stream", body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") }); return;
    }
    prompts.push(JSON.stringify(body));
    const turn = prompts.length;
    if (turn === 1) await held;
    const calls = [["read_canvas_html", { objectId: sample.pageId }], ["edit_canvas_html", { objectId: sample.pageId, before: turn <= 2 ? sample.title : "최신 음성 수정", after: turn === 1 ? "취소된 결과" : turn === 2 ? "최신 음성 수정" : "이어 말한 수정" }]];
    const events = [{ type: "RUN_STARTED", threadId: "proof", runId: `${turn}` }, { type: "TEXT_MESSAGE_CONTENT", messageId: `${turn}`, delta: "제목을 요청에 맞춰 수정했습니다." }, ...calls.map(([tool, args], i) => ({ type: "CUSTOM", name: "client-tool", value: { token: `${turn}-${i}`, tool, arguments: args } })), { type: "RUN_FINISHED", threadId: "proof", runId: `${turn}` }];
    await route.fulfill({ contentType: "text/event-stream", body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") }).catch(() => {});
  });
  await page.goto(sample.route);
  const card = page.getByRole("region", { name: "페이지 1 첨삭", exact: true });
  const canvas = card.getByRole("application");
  await canvas.click({ position: { x: 80, y: 100 } });
  await expect(page.getByRole("textbox", { name: "교정 지시", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "음성 첨삭 시작", exact: true }).click();
  async function say(text: string) {
    await page.evaluate(text => {
      const w = window as any;
      w.speechResults.push({ isFinal: true, 0: { transcript: text } });
      w.speechMock.onresult({ results: w.speechResults });
    }, text);
  }
  await page.evaluate(() => (window as any).speechMock.onresult({ results: [{ isFinal: false, 0: { transcript: "제목을 짧게" } }] }));
  await expect(card.getByLabel("말하는 중인 내 요청", { exact: true })).toHaveText("제목을 짧게");
  await expect(card.locator('[data-review-location="listening"]')).toHaveCount(1);
  expect(prompts).toHaveLength(0);
  await expect(page.getByRole("button", { name: "음성 첨삭 일시정지", exact: true })).toBeFocused();
  await page.screenshot({ path: test.info().outputPath("listening-bubble.png") });
  await page.evaluate(() => (window as any).speechMock.onresult({ results: [] }));
  await expect(card.getByLabel("말하는 중인 내 요청", { exact: true })).toHaveCount(0);
  const bounds = (await canvas.boundingBox())!;
  for (const offset of [0, 30]) {
    await page.mouse.move(bounds.x + 140, bounds.y + 120 + offset);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 220, bounds.y + 140 + offset, { steps: 4 });
    await page.mouse.up();
  }
  await say("제목을 짧게 바꿔줘");
  await expect.poll(() => prompts.length).toBe(1);
  await expect(card.getByLabel("내 요청", { exact: true })).toContainText("제목을 짧게 바꿔줘");
  await expect(card.getByRole("region", { name: "진행 중", exact: true })).toBeVisible();
  await expect(card.locator('[data-review-location="running"][data-review-node="title"]')).toBeVisible();
  await expect(card.locator('[data-review-location="running"][data-review-node="body"]')).toHaveCount(0);
  await say("아니 숫자도 넣어줘");
  await expect.poll(() => prompts.length).toBe(2);
  expect(prompts[1]).toContain("제목을 짧게"); expect(prompts[1]).toContain("숫자도");
  await expect(card.frameLocator("iframe").locator("h1")).toHaveText("최신 음성 수정");
  await expect(card.locator('[data-review-location="review"][data-review-node="title"]')).toBeVisible();
  await expect(canvas.locator('[data-annotation-id]')).toHaveCount(0);
  await expect(card.getByLabel("에이전트 응답")).toHaveText("제목을 요청에 맞춰 수정하겠습니다.");
  await card.getByRole("button", { name: "수정 전후 비교", exact: true }).click();
  await expect(card.frameLocator("iframe").locator("h1")).toHaveText(sample.title);
  await card.getByRole("button", { name: "수정 후 보기", exact: true }).click();
  await expect(card.frameLocator("iframe").locator("h1")).toHaveText("최신 음성 수정");

  await card.getByRole("button", { name: "확인 완료", exact: true }).click();
  await expect(card.getByRole("region", { name: "확인할 결과", exact: true })).toHaveCount(0);
  await expect(card.getByLabel("에이전트 응답")).toHaveCount(0);
  await card.getByText("완료 기록 1", { exact: true }).click();
  await canvas.getByRole("button", { name: /Annotation.*제목을 짧게/ }).click();
  await expect(card.getByLabel("에이전트 응답")).toBeVisible();
  release();
  await say("조금 더 강하게");
  await expect(card.frameLocator("iframe").locator("h1")).toHaveText("이어 말한 수정");
  expect(results.every(result => result.ok)).toBe(true);
  await page.getByRole("application", { name: "페이지 2 교정 표시" }).click({ position: { x: 80, y: 100 } });
  await expect(page.getByRole("button", { name: "음성 첨삭 일시정지" })).toBeVisible();
  await page.getByRole("button", { name: "음성 첨삭 일시정지" }).click();
  await page.reload();
  await expect(card.frameLocator("iframe").locator("h1")).toHaveText("이어 말한 수정");
  expect(prompts).toHaveLength(3);
  await expect(card.getByLabel("내 요청", { exact: true })).toContainText("조금 더 강하게");
  await expect(card.getByLabel("에이전트 응답")).toHaveText("제목을 요청에 맞춰 수정하겠습니다.");
  await canvas.scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath("review-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByRole("button", { name: "음성 첨삭 시작" })).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath("review-narrow.png"), fullPage: true });
});

test("speech waiting for a target is visible and a failed task survives reload and retries", async ({ page }) => {
  await page.addInitScript(() => {
    class SpeechMock {
      onresult: any; onerror: any; onend: any;
      constructor() { (window as any).speechMock = this; }
      start() {} stop() { this.onend?.(); } abort() {}
    }
    (window as any).SpeechRecognition = SpeechMock;
    (window as any).webkitSpeechRecognition = SpeechMock;
  });
  let attempts = 0;
  await page.route("**/api/llm-agent/tool-results/*", route => route.fulfill({ body: "" }));
  await page.route("**/api/llm-agent/turn", async route => {
    const body = route.request().postDataJSON();
    if (body.tools.some((tool: any) => tool.name === "queue_review")) {
      const events = [
        { type: "RUN_STARTED", threadId: "coordinator-retry", runId: "plan" },
        { type: "CUSTOM", name: "client-tool", value: { token: `retry-plan-${attempts}`, tool: "queue_review", arguments: { targetNodeIds: ["title"], instruction: "제목을 바꾸세요.", reply: "제목을 수정하겠습니다." } } },
        { type: "RUN_FINISHED", threadId: "coordinator-retry", runId: "plan" },
      ];
      await route.fulfill({ contentType: "text/event-stream", body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") }); return;
    }
    if (++attempts === 1) { await route.fulfill({ status: 503, body: "Agent unavailable" }); return; }
    const events = [
      { type: "RUN_STARTED", threadId: "retry", runId: "retry" },
      { type: "TEXT_MESSAGE_CONTENT", messageId: "retry", delta: "다시 연결해 제목을 수정했습니다." },
      { type: "CUSTOM", name: "client-tool", value: { token: "retry-read", tool: "read_canvas_html", arguments: { objectId: sample.pageId } } },
      { type: "CUSTOM", name: "client-tool", value: { token: "retry-edit", tool: "edit_canvas_html", arguments: { objectId: sample.pageId, before: sample.title, after: "재시도 성공" } } },
      { type: "RUN_FINISHED", threadId: "retry", runId: "retry" },
    ];
    await route.fulfill({ contentType: "text/event-stream", body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") });
  });
  await page.goto(sample.route);
  await page.getByRole("button", { name: "음성 첨삭 시작", exact: true }).click();
  await page.evaluate(() => (window as any).speechMock.onresult({ results: [{ isFinal: true, 0: { transcript: "제목을 바꿔줘" } }] }));
  await expect(page.getByText("고칠 위치를 짚어 주세요 · 제목을 바꿔줘", { exact: true })).toBeVisible();
  expect(attempts).toBe(0);
  const card = page.getByRole("region", { name: "페이지 1 첨삭", exact: true });
  await card.getByRole("application").click({ position: { x: 100, y: 100 } });
  await expect(card.getByRole("button", { name: "다시 시도", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "진행 0 · 확인 1", exact: true })).toBeVisible();
  await page.reload();
  await expect(card.getByLabel("내 요청", { exact: true })).toContainText("제목을 바꿔줘");
  expect(attempts).toBe(1);
  await card.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(card.frameLocator("iframe").locator("h1")).toHaveText("재시도 성공");
  await expect(card.getByLabel("에이전트 응답")).toHaveText("제목을 수정하겠습니다.");
  await card.getByRole("button", { name: "되돌리기", exact: true }).click();
  await expect(card.frameLocator("iframe").locator("h1")).toHaveText(sample.title);
  await page.reload();
  await expect(card.getByText("완료 기록 1", { exact: true })).toBeVisible();
  await expect(card.getByRole("status").filter({ hasText: "확인 완료" })).toHaveCount(0);
  await expect(card.getByRole("button", { name: "수정 전후 비교", exact: true })).toHaveCount(0);
  expect(attempts).toBe(2);
});

});
}
