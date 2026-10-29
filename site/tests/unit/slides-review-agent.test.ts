import { expect, it, vi } from "vitest";
import { createHistoryRuntime, createCollaborationWorkspace } from "@interactive-os/json-document-collaboration/history";
import { createObjectEditor, createAnnotationReviewQueue, readCanvasHTML, updateCanvasHTML, type AnnotationReviewTask } from "@interactive-os/json-document-editing";
import { webCanvasHTMLAdapter } from "@interactive-os/json-document-web";
import { createSlidesDemoDocument } from "../../src/shared/demo-workbench/slides-demo-document";
import { slidesReviewAgent } from "../../src/applications/slides/slides-review-agent";
import { streamLlmAgentTurn } from "../../src/app/llm-agent-api";
vi.mock("../../src/app/llm-agent-api", () => ({ streamLlmAgentTurn: vi.fn() }));
function setup() {
  const options = { actorId: "human", epochId: "test", ruleset: { id: "test", digest: "1" } };
  const workspace = createCollaborationWorkspace(createHistoryRuntime(createSlidesDemoDocument(), options), options);
  const editor = createObjectEditor(workspace.runtime.document);
  const html = readCanvasHTML(createSlidesDemoDocument().objects[0]!)!.html;
  const task: AnnotationReviewTask = { id: "task", source: html, request: "제목 수정", response: "", plan: "", targetNodeIds: [], annotationIds: ["mark"], state: "queued", result: "", error: "", annotation: { id: "mark", target: { sourceId: "slide-1", selector: { type: "point", x: 100, y: 100 } }, presentation: { type: "marker" }, body: { instruction: "제목 수정" } } };
  return { editor, html, task, run: slidesReviewAgent(workspace, createAnnotationReviewQueue()) };
}
it("rejects an unchanged response instead of reporting completion", async () => {
  const { run, task } = setup();
  vi.mocked(streamLlmAgentTurn).mockResolvedValueOnce(undefined);
  await expect(run(task, { aborted: false, onAbort: () => () => {} })).rejects.toThrow("실제 수정이 없습니다");
});
it("does not publish a staged edit over a concurrent change", async () => {
  const { run, task, html, editor } = setup();
  vi.mocked(streamLlmAgentTurn).mockImplementationOnce(async options => {
    await options.tools!.find(t => t.name === "read_canvas_html")!.execute({ objectId: "slide-1" });
    await options.tools!.find(t => t.name === "edit_canvas_html")!.execute({ objectId: "slide-1", before: "생각을 한 장씩, 함께 완성하는 이야기.", after: "에이전트 변경" });
    expect(updateCanvasHTML(editor, "slide-1", html, html.replace("생각을 한 장씩, 함께 완성하는 이야기.", "외부 변경"), webCanvasHTMLAdapter).ok).toBe(true);
  });
  await expect(run(task, { aborted: false, onAbort: () => () => {} })).rejects.toThrow("실행 중 원문이 바뀌어");
  expect(JSON.stringify(editor.snapshot.value)).toContain("외부 변경");
  expect(JSON.stringify(editor.snapshot.value)).not.toContain("에이전트 변경");
});
