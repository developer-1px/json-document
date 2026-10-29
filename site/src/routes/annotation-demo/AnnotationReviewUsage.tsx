import { useEffect, useState } from "react";
import { AnnotationReview, AnnotationReviewGroup } from "@interactive-os/json-document-annotation";
import { CanvasHTMLObject } from "@interactive-os/json-document-canvas";
import { createAnnotationReviewPlanTool, createAnnotationReviewQueue, createAnnotationReviewSession, createCanvasHTML, createObjectEditor, projectCanvasHTML } from "@interactive-os/json-document-editing";
import { webCanvasHTMLAdapter } from "@interactive-os/json-document-web";
import "@interactive-os/json-document-annotation/annotation-review.css";

/** Deterministic fixture: exercise the same target/measurement API as Slides. */
export function AnnotationReviewUsage() {
  const initial = '<main data-node-id="page" style="padding:40px"><h1 data-node-id="title">표시하고 바꿀 내용을 말하세요.</h1></main>';
  const [source, setSource] = useState(initial);
  const [page] = useState(() => ({ id: "usage-page", ...createCanvasHTML(initial, { x: 0, y: 0, width: 640, height: 360 }, "첨삭 예제", webCanvasHTMLAdapter) }));
  const [editor] = useState(() => createObjectEditor({ profile: "canvas/1", width: 640, height: 360, objects: [page] }));
  const [session] = useState(() => createAnnotationReviewSession({ id: "review-usage", source, width: 640, height: 360 }));
  const [queue] = useState(() => createAnnotationReviewQueue());
  useEffect(() => queue.connect(async task => {
    const result = task.source.replace('표시하고 바꿀 내용을 말하세요.', '음성 첨삭이 반영된 문장입니다.');
    setSource(result); return result;
  }, { prepare: async (_task, _signal, report) => {
    const planning = createAnnotationReviewPlanTool(["title"]);
    planning.tool.execute({ instruction: "예제 문장으로 바꾸세요.", reply: "예제 답변: 이 제목을 바꾸겠습니다.", targetNodeIds: ["title"] });
    const plan = planning.read(); report(plan.reply, plan.targetNodeIds); return plan.instruction;
  } }), [queue]);
  return <div className="mx-auto w-full max-w-3xl p-4">
    <p>음성 지시를 받으면 제목을 바꾸는 로컬 예제입니다. 실제 에이전트 연결은 Slides에서 확인할 수 있습니다.</p>
    <AnnotationReviewGroup following={{ queue, createId: () => crypto.randomUUID(), lang: "ko-KR" }}><AnnotationReview session={session} queue={queue} liveSource={source} title="첨삭 흐름 Usage" label="첨삭 예제" createId={() => crypto.randomUUID()}
      renderContent={(html, review) => <CanvasHTMLObject object={projectCanvasHTML(page, html, { x: 0, y: 0, width: 640, height: 360 })} editor={editor} active={false} onDeactivate={() => {}} {...(review ? { review } : {})} />} /></AnnotationReviewGroup>
  </div>;
}
