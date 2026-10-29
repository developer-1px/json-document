import { expect, test } from "@playwright/test";

// Slides speech interim display is under redesign: https://github.com/developer-1px/json-document/issues/806
test.skip("continuous microphone survives page changes, restarts normal endings and stops on permission errors", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).speechStarts = 0;
    class SpeechMock {
      onresult: any; onerror: any; onend: any;
      constructor() { (window as any).speechMock = this; }
      start() { (window as any).speechStarts++; }
      stop() { this.onend?.(); } abort() {}
    }
    (window as any).SpeechRecognition = SpeechMock;
    (window as any).webkitSpeechRecognition = SpeechMock;
  });
  await page.goto("/applications/slides");
  await page.getByRole("button", { name: "음성 첨삭 시작" }).click();
  await page.evaluate(() => (window as any).speechMock.onresult({ results: [{ isFinal: false, 0: { transcript: "제목을" } }] }));
  await expect(page.getByText("제목을", { exact: true })).toBeVisible();
  await page.getByRole("application", { name: "페이지 2 교정 표시" }).click({ position: { x: 80, y: 100 } });
  await expect(page.getByRole("button", { name: "음성 첨삭 일시정지" })).toBeVisible();
  expect(await page.evaluate(() => (window as any).speechStarts)).toBe(1);
  await page.evaluate(() => (window as any).speechMock.onend());
  await expect.poll(() => page.evaluate(() => (window as any).speechStarts)).toBe(2);
  await page.evaluate(() => (window as any).speechMock.onerror({ error: "not-allowed" }));
  await expect(page.getByText("마이크 접근을 허용해 주세요.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "음성 첨삭 시작" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).speechMock.onresult)).toBeNull();
});
