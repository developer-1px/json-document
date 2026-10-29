import { createCollaborationCanvasReview } from "@interactive-os/json-document-collaboration/editing";
import type { CollaborationWorkspace } from "@interactive-os/json-document-collaboration/history";
import { createAnnotationReviewPlanTool, type AnnotationReviewWorker, type AnnotationReviewQueue } from "@interactive-os/json-document-editing";
import { webCanvasHTMLAdapter } from "@interactive-os/json-document-web";
import { streamLlmAgentTurn } from "../../app/llm-agent-api";

/** Slides supplies its agent transport and instruction policy; publication belongs to Collaboration. */
export function slidesReviewAgent(workspace: CollaborationWorkspace, queue: AnnotationReviewQueue) {
  return createCollaborationCanvasReview({ workspace, queue, htmlAdapter: webCanvasHTMLAdapter,
    createActorId: () => `slides-proof-${crypto.randomUUID()}`,
    execute: ({ task, signal, tools }) => {
      return streamLlmAgentTurn({ signal, sessionId: null, onSession() {}, write() {}, mode: "chat", tools,
      prompt: `실행 에이전트로서 관리 에이전트가 확정한 수정 계획을 수행하세요. 사용자와의 대화는 관리 에이전트가 담당합니다. 반드시 read_canvas_html로 최신 원문을 읽고 edit_canvas_html로 실제 수정하세요. 다른 페이지는 수정하지 마세요. 표시 좌표는 첨삭 당시 960x540 페이지 좌표입니다. 원문과 최신 내용을 비교하여 해당 부분을 찾으세요. 표시가 모호하거나 대상이 사라졌으면 임의로 수정하지 마세요. 기존 디자인과 지시하지 않은 내용은 유지하세요.\n${task.plan || task.annotation.body.instruction}\n확인한 수정 대상 data-node-id: ${JSON.stringify(task.targetNodeIds)}\n표시와 원래 요청:\n${JSON.stringify(task.annotation)}\n첨삭 당시 원문:\n${task.source}`,
    }); },
  });
}

/** One conversation owns acknowledgement and delegation; executors use separate sessions. */
export function slidesReviewCoordinator(queue: AnnotationReviewQueue): AnnotationReviewWorker {
  let sessionId: string | null = null;
  return async (task, cancellation, report) => {
    const abort = new AbortController();
    const disconnect = cancellation.onAbort(() => abort.abort());
    const planning = createAnnotationReviewPlanTool(webCanvasHTMLAdapter.parse(task.source).nodes.map(node => node.id));
    let response = "";
    try {
      await streamLlmAgentTurn({ signal: abort.signal, sessionId, mode: "chat", tools: [planning.tool],
        onSession(id) { if (!abort.signal.aborted) sessionId = id; },
        write(delta) { response += delta; report(response); },
        prompt: `당신은 사용자와 대화하고 첨삭 작업을 관리하는 단 한 명의 관리 에이전트입니다. 현재 요청을 이해한 뒤 어떻게 고칠지 짧은 한국어로 먼저 답하세요. 문서는 실행 에이전트가 수정합니다. 원문의 data-node-id를 읽고 실제 수정할 요소를 targetNodeIds로 명시하세요. 대상이 모호하면 임의로 선택하지 말고 답변으로 질문하세요. queue_review 도구로 이번 요청의 구체적인 실행 계획과 사용자 답변을 확정하세요. 완료했다고 미리 말하지 마세요. 최신 보정 지시를 우선하고 지시하지 않은 부분은 보존하세요. 기존 완료 작업을 반복하지 마세요. 실행은 서로 다른 페이지에서 병렬로 이루어지며 같은 페이지는 순서대로 처리됩니다.\n작업 현황: ${JSON.stringify(queue.snapshot.value.tasks.map(item => ({ id: item.id, page: item.annotation.target.sourceId, request: item.request, state: item.state, error: item.error })))}\n이번 요청: ${JSON.stringify(task.annotation)}\n참고 원문: ${task.source}`,
      });
      if (abort.signal.aborted) throw Error("계획이 보정되어 이전 응답을 중단했습니다.");
      const plan = planning.read();
      report(response.trim() || plan.reply, plan.targetNodeIds);
      return plan.instruction;
    } finally { disconnect(); }
  };
}
