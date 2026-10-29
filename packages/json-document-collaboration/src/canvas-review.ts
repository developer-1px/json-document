import { createCollaborationCanvasTools } from "./editing-index.js";
import type { CollaborationWorkspace } from "./workspace.js";
import { readCanvasHTML, type AnnotationReviewCancellation, type AnnotationReviewTask, type AnnotationReviewQueue, type CanvasHTMLAdapter } from "@interactive-os/json-document-editing";
import type { CanvasDocument } from "@interactive-os/json-document-object-document";

export interface CollaborationCanvasReviewOptions {
  readonly workspace: CollaborationWorkspace;
  readonly queue: AnnotationReviewQueue;
  readonly htmlAdapter: CanvasHTMLAdapter;
  readonly createActorId: () => string;
  readonly execute: (request: { readonly task: AnnotationReviewTask; readonly signal: AbortSignal; readonly report: (response: string) => void; readonly tools: ReturnType<typeof createCollaborationCanvasTools> }) => Promise<void>;
}
/** Stage a source-scoped review, reject stale/no-op results, and publish only after execution succeeds. */
export function createCollaborationCanvasReview({ workspace, queue, htmlAdapter, createActorId, execute }: CollaborationCanvasReviewOptions) {
  const source = (id: string) => {
    const object = (workspace.runtime.document.value as CanvasDocument).objects.find(item => item.id === id);
    return object ? readCanvasHTML(object)?.html : undefined;
  };
  return async (task: AnnotationReviewTask, cancellation: AnnotationReviewCancellation, report: (response: string) => void = () => {}): Promise<string> => {
    const controller = new AbortController();
    const disconnect = cancellation.onAbort(() => controller.abort());
    const signal = controller.signal;
    try {
    if (signal.aborted) throw Error("작업이 중단됐습니다.");
    const pageId = task.annotation.target.sourceId;
    const expected = queue.sourceFor(task);
    const before = source(pageId);
    if (!before || before !== expected) throw Error("첨삭 이후 원문이 바뀌었습니다. 현재 페이지를 확인하고 다시 요청해 주세요.");
    const participant = workspace.participant(createActorId());
    participant.observe();
    const tools = createCollaborationCanvasTools({ ...participant, observe() {}, publish: () => ({ ok: true, collaboration: participant.runtime.replica.status() }) }, {}, htmlAdapter)
      .filter(tool => ["read_canvas", "read_canvas_html", "edit_canvas_html"].includes(tool.name))
      .map(tool => tool.name !== "edit_canvas_html" ? tool : { ...tool, execute: (args: unknown) => {
        if (signal.aborted) return { ok: false, code: "review.cancelled" };
        if (!args || typeof args !== "object" || !("objectId" in args) || args.objectId !== pageId) return { ok: false, code: "review.other-page-not-allowed" };
        return tool.execute(args);
      } });
    await execute({ task, signal, tools, report });
    if (signal.aborted) throw Error("작업이 중단됐습니다.");
    const edited = (participant.runtime.document.value as CanvasDocument).objects.find(item => item.id === pageId);
    const after = edited ? readCanvasHTML(edited)?.html : undefined;
    if (!after || after === before) throw Error("실제 수정이 없습니다. 첨삭을 더 구체적으로 남겨 주세요.");
    if (source(pageId) !== before) throw Error("실행 중 원문이 바뀌어 수정안을 적용하지 않았습니다. 현재 내용을 확인해 주세요.");
    const result = participant.publish();
    if (!result.ok) throw Error("다른 편집과 충돌해 결과 확인이 필요합니다.");
    return after;
    } finally { disconnect(); }
  };
}
