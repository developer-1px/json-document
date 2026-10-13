import { expect, test } from "@playwright/test";

async function add(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("button", { name: "컴포넌트 추가", exact: true }).click();
  await page.getByRole("dialog", { name: "컴포넌트 추가" }).getByRole("button", { name, exact: true }).click();
}

test("free placement, resize, content, history, persistence and no zoom", async ({ page }) => {
  await page.goto("/applications/ui-builder");
  const canvas = page.getByRole("group", { name: "UI 작업면", exact: true });
  await expect(page.getByRole("button", { name: "확대", exact: true })).toHaveCount(0);
  await add(page, "버튼");
  const target = page.locator("[data-canvas-object]");
  await expect(target).toHaveCount(1);
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 70, { steps: 8 }); await page.mouse.up();
  const moved = (await target.boundingBox())!;
  expect(moved.x - box.x).toBeCloseTo(90, 0); expect(moved.y - box.y).toBeCloseTo(70, 0);
  const handle = page.locator('[data-resize-edge="se"]');
  const grip = (await handle.boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down(); await page.mouse.move(grip.x + grip.width / 2 + 60, grip.y + grip.height / 2 + 20, { steps: 6 }); await page.mouse.up();
  const resized = (await target.boundingBox())!;
  expect(resized.width - moved.width).toBeCloseTo(60, 0);
  await target.dblclick();
  await page.getByRole("textbox", { name: "내용", exact: true }).fill("문의하기");
  await page.getByRole("button", { name: "적용", exact: true }).click();
  await expect(target).toHaveAttribute("aria-label", "문의하기");
  await page.getByRole("button", { name: "실행 취소", exact: true }).click();
  await expect(target).toHaveAttribute("aria-label", "시작하기");
  await page.getByRole("button", { name: "다시 실행", exact: true }).click();
  await expect(target).toHaveAttribute("aria-label", "문의하기");
  const before = await canvas.getAttribute("viewBox");
  await canvas.hover(); await page.keyboard.down("Control"); await page.mouse.wheel(0, -250); await page.keyboard.up("Control");
  await expect(canvas).toHaveAttribute("viewBox", before!);
  await canvas.press("KeyR"); await expect(canvas).toHaveAttribute("data-tool", "select");
  await page.reload(); await expect(target).toHaveAttribute("aria-label", "문의하기");
  await target.click(); await page.getByRole("button", { name: "복제", exact: true }).click(); await expect(target).toHaveCount(2);
  await page.getByRole("button", { name: "삭제", exact: true }).click(); await expect(target).toHaveCount(1);
});

test("all catalog components render and narrow screens keep chat usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/applications/ui-builder");
  for (const name of ["제목", "본문", "버튼", "입력", "긴 입력", "체크박스", "선택 목록", "탭", "카드", "숫자", "목록", "구분선"]) await add(page, name);
  await expect(page.locator("[data-canvas-object]")).toHaveCount(12);
  await expect(page.getByRole("textbox", { name: "UI 편집 요청", exact: true })).toBeVisible();
  const chat = (await page.getByRole("complementary", { name: "UI 디자인 도우미" }).boundingBox())!;
  expect(chat.x).toBeGreaterThanOrEqual(0); expect(chat.x + chat.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("agent protocol applies a catalog batch, shares undo, and reports real failures", async ({ page }) => {
  const results: Array<{ ok: boolean }> = [];
  await page.route("**/api/llm-agent/tool-results/*", async route => { results.push(route.request().postDataJSON()); await route.fulfill({ body: "" }); });
  await page.route("**/api/llm-agent/turn", async route => {
    expect(route.request().postDataJSON().tools.map((t: {name: string}) => t.name)).toEqual(["read_ui_builder", "apply_ui_builder_changes"]);
    const events = [
      { type: "RUN_STARTED", threadId: "builder-test", runId: "1" },
      { type: "CUSTOM", name: "client-tool", value: { token: "read", tool: "read_ui_builder", arguments: {} } },
      { type: "CUSTOM", name: "client-tool", value: { token: "apply", tool: "apply_ui_builder_changes", arguments: { components: [
        { id: "", component: "heading", x: 80, y: 120, width: 500, height: 64, text: "AI의 첫 페이지", detail: "", items: [], tone: "default" },
        { id: "", component: "button", x: 80, y: 220, width: 160, height: 48, text: "시작하기", detail: "", items: [], tone: "accent" },
      ], removeIds: [] } } },
      { type: "TEXT_MESSAGE_CONTENT", messageId: "reply", delta: "화면에 반영했습니다." },
      { type: "RUN_FINISHED", threadId: "builder-test", runId: "1" },
    ];
    await route.fulfill({ contentType: "text/event-stream", body: events.map(e => `data: ${JSON.stringify(e)}\n\n`).join("") });
  });
  await page.goto("/applications/ui-builder");
  await page.getByRole("textbox", { name: "UI 편집 요청", exact: true }).click();
  await page.keyboard.insertText("소개 페이지를 만들어줘");
  await page.getByRole("button", { name: "보내기", exact: true }).click();
  await expect(page.locator("[data-canvas-object]")).toHaveCount(2);
  await expect.poll(() => results.length).toBe(2); expect(results.every(r => r.ok)).toBe(true);
  await page.getByRole("button", { name: "실행 취소", exact: true }).click(); await expect(page.locator("[data-canvas-object]")).toHaveCount(0);
  await page.getByRole("button", { name: "다시 실행", exact: true }).click(); await expect(page.locator("[data-canvas-object]")).toHaveCount(2);
  await page.route("**/api/llm-agent/turn", route => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.getByRole("textbox", { name: "UI 편집 요청", exact: true }).click(); await page.keyboard.insertText("간격 정리해줘"); await page.getByRole("button", { name: "보내기", exact: true }).click();
  await expect(page.getByText("요청을 완료하지 못했습니다. 반영된 편집은 유지됩니다.")).toBeVisible();
  await expect(page.locator("[data-canvas-object]")).toHaveCount(2);
});
