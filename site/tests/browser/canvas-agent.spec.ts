import { expect, test } from "@playwright/test";

test("Canvas registers shared tools and applies agent edits through manual history", async ({ page }) => {
  const results: Array<{ ok: boolean; selection?: { primaryKey: string }; document?: { objects: Array<{ id: string; label: string }> } }> = [];
  let turn = 0;
  await page.route("**/api/llm-agent/tool-results/*", async route => {
    results.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, body: "" });
  });
  await page.route("**/api/llm-agent/turn", async route => {
    expect(route.request().postDataJSON().tools.map((tool: { name: string }) => tool.name)).toEqual(["read_canvas", "create_canvas_object", "update_canvas_object", "remove_canvas_objects", "reorder_canvas_objects", "undo_canvas", "redo_canvas"]);
    const calls = turn++ === 0 ? [
      ["read_canvas", {}],
      ["create_canvas_object", { object: { kind: "rectangle", x: 100, y: 100, width: 240, height: 120, label: "에이전트 카드", color: "#b6c8e8" } }],
    ] : [
      ["read_canvas", {}],
      ["update_canvas_object", { objectId: results[1]!.selection!.primaryKey, changes: { label: "수정한 카드", x: 200 } }],
    ];
    const events = [
      { type: "RUN_STARTED", threadId: "canvas-agent", runId: `turn-${turn}` },
      ...calls.map(([tool, args], i) => ({ type: "CUSTOM", name: "client-tool", value: { token: `${turn}-${i}`, tool, arguments: args } })),
      { type: "TEXT_MESSAGE_CONTENT", messageId: "reply", delta: "Canvas에 반영했습니다." },
      { type: "RUN_FINISHED", threadId: "canvas-agent", runId: `turn-${turn}` },
    ];
    await route.fulfill({ contentType: "text/event-stream", body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") });
  });
  await page.goto("/demo/canvas");
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
  await expect(objects).toHaveAttribute("aria-label", "에이전트 카드");
  await canvas.press("ControlOrMeta+z"); await expect(objects).toHaveCount(0);
});
