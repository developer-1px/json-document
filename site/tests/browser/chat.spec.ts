import { expect, test } from "@playwright/test";

test("Chat Usage sends multiple messages through the canonical Composer", async ({ page }) => {
  await page.goto("/demo/chat");
  const input = page.getByRole("textbox", { name: "메시지", exact: true });
  const send = page.getByRole("button", { name: "보내기", exact: true });
  const log = page.getByRole("log", { name: "대화", exact: true });
  await expect(send).toBeDisabled();
  await input.click();
  await page.keyboard.insertText("첫 메시지");
  await input.press("Shift+Enter");
  await page.keyboard.insertText("두 번째 줄");
  await expect(log.getByRole("group", { name: "나", exact: true })).toHaveCount(1);
  await input.press("Enter");
  await expect(log.getByRole("group", { name: "나", exact: true })).toHaveCount(2);
  const sent = log.getByRole("group", { name: "나", exact: true }).last();
  await expect(sent).toContainText("첫 메시지");
  await expect(sent).toContainText("두 번째 줄");
  await expect(sent.locator("br")).toHaveCount(1);
  await expect(input).toHaveText("");
  await expect(send).toBeDisabled();
  await page.keyboard.insertText("다음 메시지");
  await send.click();
  await expect(log.getByRole("group", { name: "나", exact: true })).toHaveCount(3);
  await expect(input).toHaveText("");
  await expect(input).toBeFocused();
});

{
  test("IME hides the placeholder during composition and restores it on cancellation", async ({ page, browserName }) => {
    const route: string = "/demo/chat";
    test.skip(browserName !== "chromium");
    await page.goto(route);
    const input = route === "/demo/chat"
      ? page.getByRole("textbox", { name: "메시지", exact: true })
      : page.getByLabel("Agent Chat Composer", { exact: true });
    await input.click();
    const placeholder = input.locator("[data-rich-text-placeholder]");
    const content = () => placeholder.evaluate(element => getComputedStyle(element, "::before").content);
    await expect.poll(content).not.toBe("none");
    const client = await page.context().newCDPSession(page);
    for (const text of ["ㅎ", "하", "한"]) {
      await client.send("Input.imeSetComposition", { text, selectionStart: text.length, selectionEnd: text.length });
      await expect.poll(content).toBe("none");
      await expect(input).toContainText(text);
    }
    await client.send("Input.imeSetComposition", { text: "", selectionStart: 0, selectionEnd: 0 });
    await expect.poll(content).not.toBe("none");
    await client.send("Input.imeSetComposition", { text: "한", selectionStart: 1, selectionEnd: 1 });
    await expect.poll(content).toBe("none");
    await client.send("Input.insertText", { text: "한" });
    await expect(input).toHaveText("한");
    await expect(input).not.toHaveAttribute("data-rich-text-composing");
    await input.press("Backspace");
    await expect.poll(content).not.toBe("none");
    await client.detach();
  });
}

{
  // Product bug: on RUN_ERROR the alert asks to retry, but the failed text is in neither the composer nor the log.
  test.fixme("local chat streams a reply and preserves failed drafts", async ({ page }) => {
    const prepareStatus: number = 200;
    let preparations = 0;
    await page.route("**/api/llm-agent/prepare", async route => {
      preparations++;
      await route.fulfill({ status: prepareStatus, contentType: "application/json", body: JSON.stringify({ threadId: "prepared-session" }) });
    });
    const requests: Array<{ threadId: string; forwardedProps: { mode: string } }> = [];
    await page.route("**/api/llm-agent/turn", async route => {
      requests.push(route.request().postDataJSON());
      const events = requests.length === 1
        ? [{ type: "RUN_STARTED", threadId: "local-session", runId: "run" }, { type: "TEXT_MESSAGE_CONTENT", messageId: "reply", delta: "안녕하세요" }, { type: "RUN_FINISHED", threadId: "local-session", runId: "run" }]
        : [{ type: "RUN_ERROR", message: "테스트 연결 실패" }];
      await route.fulfill({ contentType: "text/event-stream", body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") });
    });
    await page.goto("/demo/chat?agent=local");
    const input = page.getByRole("textbox", { name: "메시지", exact: true });
    await input.click();
    await page.keyboard.insertText("안녕");
    await input.press("Enter");
    await expect(page.getByRole("group", { name: "AI", exact: true })).toHaveText("안녕하세요");
    await expect(input).toHaveText("");
    await page.keyboard.insertText("계속 대화");
    await input.press("Enter");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(input).toHaveText("계속 대화");
    expect(preparations).toBe(1);
    expect(requests.map(request => request.threadId)).toEqual([prepareStatus === 200 ? "prepared-session" : "", "local-session"]);
    expect(requests.every(request => request.forwardedProps.mode === "chat")).toBe(true);
  });

}
