import { expect, test } from "@playwright/test";

// Opt-in: exercises the configured real agent; recognition alone is simulated.
test("one real coordinator delegates two pages to independent execution agents", async ({ page }) => {
  test.skip(process.env.SLIDES_LIVE_AGENT !== "1", "Requires an explicitly enabled local agent backend");
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    class SpeechMock {
      onresult: any; onerror: any; onend: any;
      constructor() { (window as any).speechMock = this; (window as any).speechResults = []; }
      start() {} stop() { this.onend?.(); } abort() {}
    }
    (window as any).SpeechRecognition = SpeechMock;
    (window as any).webkitSpeechRecognition = SpeechMock;
  });
  const coordinators: string[] = [];
  let activeExecutors = 0; let peakExecutors = 0;
  const executing = new Set<import("@playwright/test").Request>();
  page.on("request", request => {
    if (!request.url().endsWith("/api/llm-agent/turn")) return;
    const body = request.postDataJSON();
    if (body.tools.some((tool: any) => tool.name === "queue_review")) coordinators.push(body.threadId);
    else { executing.add(request); peakExecutors = Math.max(peakExecutors, ++activeExecutors); }
  });
  const finished = (request: import("@playwright/test").Request) => { if (executing.delete(request)) activeExecutors--; };
  page.on("requestfinished", finished); page.on("requestfailed", finished);
  await page.goto("/applications/slides");
  await page.getByRole("button", { name: "음성 첨삭 시작" }).click();
  for (const number of [1, 2]) {
    await page.getByRole("application", { name: `페이지 ${number} 교정 표시` }).click({ position: { x: 100, y: 150 } });
    await page.evaluate(number => {
      const w = window as any;
      w.speechResults.push({ isFinal: true, 0: { transcript: `이 페이지의 큰 제목 h1을 정확히 병렬 첨삭 ${number} 으로 바꿔줘. 나머지는 그대로 유지해줘.` } });
      w.speechMock.onresult({ results: w.speechResults });
    }, number);
  }
  for (const number of [1, 2]) {
    const card = page.getByRole("region", { name: `페이지 ${number} 첨삭`, exact: true });
    await expect(card.frameLocator("iframe").locator("h1")).toHaveText(`병렬 첨삭 ${number}`, { timeout: 150_000 });
    if (!(await card.getByLabel("에이전트 응답").isVisible())) await card.getByRole("button", { name: "1 · 수정됨", exact: true }).click();
    await expect(card.getByLabel("에이전트 응답")).not.toBeEmpty();
    await expect(card.locator('[data-review-location="review"][data-review-node="title"]')).toBeVisible();
    await expect(card.locator('[data-annotation-id]')).toHaveCount(0);
    await expect(card.getByRole("region", { name: "확인할 결과", exact: true })).toBeVisible();
  }
  expect(coordinators).toHaveLength(2);
  expect(coordinators[0]).toBe(""); expect(coordinators[1]).not.toBe("");
  console.info(`실제 실행 에이전트 최대 동시 요청: ${peakExecutors}`);
  await page.getByRole("button", { name: "음성 첨삭 일시정지" }).click();
});
