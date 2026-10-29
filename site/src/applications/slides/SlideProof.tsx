import { useEffect, useState, useSyncExternalStore } from "react";
import { AnnotationReview } from "@interactive-os/json-document-annotation";
import { CanvasHTMLObject } from "@interactive-os/json-document-canvas";
import { createAnnotationReviewSession, projectCanvasHTML, readCanvasHTML, updateCanvasHTML, type AnnotationReviewQueue, type ObjectEditor } from "@interactive-os/json-document-editing";
import type { CanvasObject } from "@interactive-os/json-document-object-document";
import { createWebStoredDocument, webCanvasHTMLAdapter } from "@interactive-os/json-document-web";

type Page = Extract<CanvasObject, { kind: "embedded-document" }>;
/** Slides injects persistence, page content and product copy into the canonical review UI. */
export function SlideProof({ page, editor, queue, index, storageNamespace = "slides" }: { storageNamespace?: string; page: Page; editor: ObjectEditor; queue: AnnotationReviewQueue; index: number }) {
  const live = readCanvasHTML(page)!;
  const [stored] = useState(() => {
    const options = { id: page.id, source: live.html, width: 960, height: 540 };
    return createWebStoredDocument({ key: `json-document.${storageNamespace}.proof.${page.id}.v1`, storage: () => localStorage,
      create: () => createAnnotationReviewSession(options), restore: value => createAnnotationReviewSession(options, value) });
  });
  useEffect(() => stored.connect(), [stored]);
  const saveState = useSyncExternalStore(stored.subscribe, () => stored.state);
  return <>
    <AnnotationReview session={stored.source} queue={queue} liveSource={live.html}
      title={`${String(index + 1).padStart(2, "0")} · ${page.label}`} label={`페이지 ${index + 1} 첨삭`} canvasLabel={`페이지 ${index + 1} 교정 표시`}
      createId={() => crypto.randomUUID()} speechInput={{ lang: "ko-KR" }}
      onRevert={task => updateCanvasHTML(editor, page.id, task.result, queue.sourceFor(task), webCanvasHTMLAdapter).ok}
      renderContent={(html, review) => <CanvasHTMLObject object={projectCanvasHTML(page, html, { x: 0, y: 0, width: 960, height: 540 })} editor={editor} {...(review ? { review } : {})} active={false} onDeactivate={() => {}} />} />
    {(saveState === "save-error" || saveState === "load-error") && <p role="alert">교정 표시를 저장하지 못했습니다.</p>}
  </>;
}
