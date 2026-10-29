import { expect, test } from "@playwright/test";

test("Canvas applies agent edits with selective undo retained after reload", async ({ page }) => {
  const results: Array<{ ok: boolean; selection?: { primaryKey: string }; document?: { objects: Array<{ id: string; label: string }> } }> = [];
  let turn = 0;
  await page.route("**/api/llm-agent/tool-results/*", async route => {
    results.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, body: "" });
  });
  await page.route("**/api/llm-agent/turn", async route => {
    expect(route.request().postDataJSON().tools.map((tool: { name: string }) => tool.name)).toEqual(["create_canvas_html", "read_canvas_html", "edit_canvas_html", "read_canvas", "create_canvas_section", "insert_canvas_section_objects", "create_canvas_object", "update_canvas_object", "remove_canvas_objects", "reorder_canvas_objects", "undo_canvas", "redo_canvas"]);
    const calls = turn++ === 0 ? [
      ["read_canvas", {}],
      ["create_canvas_object", { object: { kind: "rectangle", x: 100, y: 100, width: 240, height: 120, label: "에이전트 카드", color: "#b6c8e8" } }],
    ] : turn === 2 ? [
      ["read_canvas", {}],
      ["update_canvas_object", { objectId: results[1]!.selection!.primaryKey, changes: { label: "수정한 카드", x: 200 } }],
    ] : [["read_canvas", {}], ["undo_canvas", {}]];
    const events = [
      { type: "RUN_STARTED", threadId: "canvas-agent", runId: `turn-${turn}` },
      ...calls.map(([tool, args], i) => ({ type: "CUSTOM", name: "client-tool", value: { token: `${turn}-${i}`, tool, arguments: args } })),
      { type: "TEXT_MESSAGE_CONTENT", messageId: "reply", delta: "Canvas에 반영했습니다." },
      { type: "RUN_FINISHED", threadId: "canvas-agent", runId: `turn-${turn}` },
    ];
    await route.fulfill({ contentType: "text/event-stream", body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") });
  });
  await page.goto("/applications/canvas");
  const input = page.getByRole("textbox", { name: "Canvas 편집 요청", exact: true });
  await input.click(); await page.keyboard.insertText("카드를 만들어줘"); await input.press("Enter");
  const objects = page.locator("[data-canvas-object]");
  await expect.poll(() => results.length).toBe(2);
  expect(results).toEqual([expect.objectContaining({ ok: true }), expect.objectContaining({ ok: true })]);
  await expect(objects).toHaveCount(1);
  await expect(objects).toHaveAttribute("aria-label", "에이전트 카드");
  await expect.poll(() => results.length).toBe(2);
  await expect(input).toBeEnabled();
  await input.click(); await page.keyboard.insertText("카드 이름과 위치를 바꿔줘"); await input.press("Enter");
  await expect(objects).toHaveAttribute("aria-label", "수정한 카드");
  await expect.poll(() => results.length).toBe(4);
  expect(results.every(result => result.ok)).toBe(true);
  const canvas = page.locator("[data-canvas-slide]");
  await canvas.focus(); await canvas.press("ControlOrMeta+z");
  await expect(objects).toHaveAttribute("aria-label", "수정한 카드");
  await page.reload();
  await input.click(); await page.keyboard.insertText("이 대화의 마지막 수정 취소"); await input.press("Enter");
  await expect(objects).toHaveAttribute("aria-label", "에이전트 카드");
  await expect.poll(() => results.length).toBe(6);
  await expect(input).toBeEnabled();
  await input.click(); await page.keyboard.insertText("이 대화의 생성 취소"); await input.press("Enter");
  await expect(objects).toHaveCount(0);
});

for (const scenario of ["disjoint", "same-field"] as const) {
test(`independent Canvas actors merge ${scenario} edits while hidden and retain selective history`, async ({ page }) => {
  const fixture = { profile: "canvas/1", width: 1280, height: 720, objects: [
    { id: "a", kind: "rectangle", x: 100, y: 100, width: 200, height: 100, label: "A", color: "#b6c8e8" },
    { id: "b", kind: "rectangle", x: 400, y: 100, width: 200, height: 100, label: "B", color: "#fff2a8" },
  ] };
  await page.addInitScript(value => {
    if (!localStorage.getItem("json-document.canvas.v1")) localStorage.setItem("json-document.canvas.v1", JSON.stringify(value));
  }, fixture);
  let allowARead!: () => void;
  let allowBRead!: () => void;
  const aRead = new Promise<void>(resolve => { allowARead = resolve; });
  const bRead = new Promise<void>(resolve => { allowBRead = resolve; });
  const results = new Map<string, { ok: boolean; code?: string }>();
  await page.route("**/api/llm-agent/tool-results/*", async route => {
    const token = route.request().url().split("/").at(-1)!;
    results.set(token, route.request().postDataJSON());
    if (token === "A-0") await aRead;
    if (token === "B-0") { allowARead(); await bRead; }
    if (token === "A-1") allowBRead();
    await route.fulfill({ status: 200, body: "" });
  });
  await page.route("**/api/llm-agent/turn", async route => {
    const input = route.request().postDataJSON();
    const actor = input.messages[0].content as "A" | "B";
    const update = ["update_canvas_object", { objectId: scenario === "same-field" ? "a" : actor.toLowerCase(), changes: { label: `${actor} complete` } }];
    const calls = [["read_canvas", {}], update];
    const events = [
      { type: "RUN_STARTED", threadId: `concurrent-${actor}`, runId: actor },
      ...calls.map(([tool, args], i) => ({ type: "CUSTOM", name: "client-tool", value: { token: `${actor}-${i}`, tool, arguments: args } })),
      { type: "TEXT_MESSAGE_CONTENT", messageId: actor, delta: `${actor} finished` },
      { type: "RUN_FINISHED", threadId: `concurrent-${actor}`, runId: actor },
    ];
    await route.fulfill({ contentType: "text/event-stream", body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") });
  });
  await page.goto("/applications/canvas");
  const input = page.getByRole("textbox", { name: "Canvas 편집 요청", exact: true });
  await input.click(); await page.keyboard.insertText("A");
  await page.getByRole("button", { name: "보내기", exact: true }).click();
  await expect.poll(() => results.has("A-0")).toBe(true);
  await page.getByRole("button", { name: "대화 1 접기", exact: true }).click();
  await page.getByRole("button", { name: "새 대화", exact: true }).click();
  await input.click(); await page.keyboard.insertText("B");
  await page.getByRole("button", { name: "보내기", exact: true }).click();
  if (scenario === "disjoint") await expect(page.locator("[data-canvas-object][aria-label='A complete']")).toHaveCount(1);
  await expect(page.locator("[data-canvas-object][aria-label='B complete']")).toHaveCount(1);
  await expect(page.getByRole("log", { name: "Canvas 대화" })).toContainText("B finished");
  await expect(page.getByRole("region", { name: "대화 1", exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "대화 1", exact: true })).toContainText("완료");
  expect(results.get("A-1")).toMatchObject({ ok: true });
  expect(results.get("B-1")).toMatchObject(scenario === "disjoint" ? { ok: true } : { ok: false, code: "collaboration.conflict" });
  if (scenario === "same-field") await expect(page.getByText("동시에 수정된 항목 1개가 있습니다. 대화에서 병합 결과를 확인해 주세요.", { exact: true }).filter({ visible: true })).toBeVisible();
  const canvas = page.locator("[data-canvas-slide]");
  await canvas.focus(); await canvas.press("ControlOrMeta+z");
  if (scenario === "disjoint") await expect(page.locator("[data-canvas-object][aria-label='A complete']")).toHaveCount(1);
  await expect(page.locator("[data-canvas-object][aria-label='B complete']")).toHaveCount(1);
  await page.getByRole("button", { name: "대화 2 접기", exact: true }).click();
  await page.getByRole("button", { name: "대화 1", exact: true }).click();
  await expect(page.getByRole("log", { name: "Canvas 대화" })).toContainText("A finished");
  await page.reload();
  await expect(page.getByRole("log", { name: "Canvas 대화" })).toContainText("A finished");
  await page.getByRole("button", { name: "대화 1 접기", exact: true }).click();
  await page.getByRole("button", { name: "대화 2", exact: true }).click();
  await expect(page.getByRole("log", { name: "Canvas 대화" })).toContainText("B finished");
});

}

test("Canvas dock opens independent windows, preserves drafts and adapts to narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/applications/canvas");
  const first = page.getByRole("region", { name: "대화 1", exact: true });
  await first.getByRole("textbox", { name: "Canvas 편집 요청" }).click();
  await page.keyboard.insertText("보존할 초안");
  await page.getByRole("button", { name: "새 대화", exact: true }).click();
  const second = page.getByRole("region", { name: "대화 2", exact: true });
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  await first.getByRole("button", { name: "대화 1 접기", exact: true }).click();
  await expect(first).toBeHidden();
  await expect(second).toBeVisible();
  await page.getByRole("button", { name: "대화 1", exact: true }).click();
  await expect(first.getByRole("textbox", { name: "Canvas 편집 요청" })).toHaveText("보존할 초안");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(first).toBeVisible();
  await expect(second).toBeHidden();
  await page.getByRole("button", { name: "대화 2", exact: true }).click();
  await expect(second).toBeVisible();
  await expect(first).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  await expect(first.getByRole("textbox", { name: "Canvas 편집 요청" })).toHaveText("보존할 초안");
});

test("Canvas closes the last conversation and keeps the empty dock after reload", async ({ page }) => {
  await page.goto("/applications/canvas");
  await page.getByRole("button", { name: "대화 1 닫기", exact: true }).click();
  await expect(page.getByRole("button", { name: "대화 1", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Canvas 편집 요청", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "새 대화", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Canvas 편집 요청", exact: true })).toBeVisible();
});
