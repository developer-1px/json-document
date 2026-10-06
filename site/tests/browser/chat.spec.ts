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

test("narrow Chat Usage wraps long messages and keeps the input inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo/chat");
  const input = page.getByRole("textbox", { name: "메시지", exact: true });
  await input.click();
  await page.keyboard.insertText("long".repeat(80));
  await input.press("Enter");
  const bubble = page.getByRole("log", { name: "대화" }).getByRole("group", { name: "나", exact: true }).last();
  const bounds = await bubble.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(await bubble.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("placeholder does not displace the caret and returns after deleting or sending", async ({ page }) => {
  await page.goto("/demo/chat");
  const input = page.getByRole("textbox", { name: "메시지", exact: true });
  const placeholder = input.locator('[data-rich-text-placeholder="메시지 입력"]');
  const assertPlaceholder = async () => {
    await expect(placeholder).toHaveCount(1);
    const metrics = await placeholder.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      position: getComputedStyle(element, "::before").position,
      pointerEvents: getComputedStyle(element, "::before").pointerEvents,
    }));
    expect(metrics.width).toBe(0);
    expect(metrics.position).toBe("absolute");
    expect(metrics.pointerEvents).toBe("none");
  };
  await input.click();
  await assertPlaceholder();
  await input.pressSequentially("x");
  await expect(placeholder).toHaveCount(0);
  await input.press("Backspace");
  await assertPlaceholder();
  await input.pressSequentially("sent");
  await input.press("Enter");
  await assertPlaceholder();
  await expect(input).toBeFocused();
});

for (const route of ["/demo/chat", "/demo/composer"]) {
  test(`IME hides the placeholder during composition and restores it on cancellation: ${route}`, async ({ page, browserName }) => {
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
