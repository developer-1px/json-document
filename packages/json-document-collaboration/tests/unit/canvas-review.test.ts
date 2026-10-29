import { expect, it, vi } from "vitest";
import { createCanvasHTML, createAnnotationReviewQueue, createObjectEditor, updateCanvasHTML, type AnnotationReviewTask } from "@interactive-os/json-document-editing";
import { createCollaborationCanvasReview } from "../../src/canvas-review.js";
import { createHistoryRuntime } from "../../src/history-index.js";
import { createCollaborationWorkspace } from "../../src/workspace.js";
const adapter = { parse: (html: string) => ({ html, nodes: [] }) };
const cancellation = { aborted: false, onAbort: () => () => {} };
function setup() {
  const page = { ...createCanvasHTML("<p>original</p>", { x: 0, y: 0, width: 960, height: 540 }, "Page", adapter), id: "page" };
  const options = { actorId: "human", epochId: "review", ruleset: { id: "test", digest: "1" } };
  const workspace = createCollaborationWorkspace(createHistoryRuntime({ profile: "canvas/1", width: 960, height: 540, objects: [page] }, options), options);
  const queue = createAnnotationReviewQueue();
  const task: AnnotationReviewTask = { id: "task", request: "Fix", response: "", plan: "", targetNodeIds: [], annotationIds: ["mark"], source: "<p>original</p>", state: "queued", result: "", error: "", annotation: { id: "mark", target: { sourceId: page.id, selector: { type: "point", x: 1, y: 1 } }, body: { instruction: "Fix" }, presentation: { type: "marker" } } };
  return { page, task, workspace, queue, createActorId: () => "agent", htmlAdapter: adapter };
}
it("publishes only after the executor succeeds and restricts writes to the reviewed page", async () => {
  const ctx = setup();
  const run = createCollaborationCanvasReview({ ...ctx, execute: async ({ tools }) => {
    await tools.find(t => t.name === "read_canvas_html")!.execute({ objectId: ctx.page.id });
    const edit = tools.find(t => t.name === "edit_canvas_html")!;
    expect(await edit.execute({ objectId: "other", before: "original", after: "updated" })).toMatchObject({ ok: false });
    expect(await edit.execute({ objectId: ctx.page.id, before: "original", after: "updated" })).toMatchObject({ ok: true });
    expect(JSON.stringify(ctx.workspace.runtime.document.value)).not.toContain("updated");
  } });
  expect(await run(ctx.task, cancellation)).toBe("<p>updated</p>");
  expect(JSON.stringify(ctx.workspace.runtime.document.value)).toContain("updated");
});
it("rejects concurrent edits without publishing the staged result", async () => {
  const ctx = setup();
  const run = createCollaborationCanvasReview({ ...ctx, execute: async ({ tools }) => {
    await tools.find(t => t.name === "read_canvas_html")!.execute({ objectId: ctx.page.id });
    await tools.find(t => t.name === "edit_canvas_html")!.execute({ objectId: ctx.page.id, before: "original", after: "agent" });
    const editor = createObjectEditor(ctx.workspace.runtime.document);
    updateCanvasHTML(editor, ctx.page.id, ctx.task.source, "<p>human</p>", adapter);
  } });
  await expect(run(ctx.task, cancellation)).rejects.toThrow("실행 중 원문이 바뀌어");
  expect(JSON.stringify(ctx.workspace.runtime.document.value)).toContain("human");
  expect(JSON.stringify(ctx.workspace.runtime.document.value)).not.toContain("<p>agent</p>");
});
it("does not execute or publish a cancelled task", async () => {
  const ctx = setup(); const execute = vi.fn();
  await expect(createCollaborationCanvasReview({ ...ctx, execute })(ctx.task, { aborted: true, onAbort: listener => { listener(); return () => {}; } })).rejects.toThrow("중단");
  expect(execute).not.toHaveBeenCalled();
});
it("translates cancellation during execution and discards staged edits", async () => {
  const ctx = setup(); let abort = () => {};
  const disconnect = vi.fn();
  const run = createCollaborationCanvasReview({ ...ctx, execute: async ({ tools, signal }) => {
    await tools.find(t => t.name === "read_canvas_html")!.execute({ objectId: ctx.page.id });
    await tools.find(t => t.name === "edit_canvas_html")!.execute({ objectId: ctx.page.id, before: "original", after: "cancelled" });
    abort();
    expect(signal.aborted).toBe(true);
  } });
  await expect(run(ctx.task, { aborted: false, onAbort: listener => { abort = listener; return disconnect; } })).rejects.toThrow("중단");
  expect(disconnect).toHaveBeenCalledOnce();
  expect(JSON.stringify(ctx.workspace.runtime.document.value)).not.toContain("cancelled");
});
