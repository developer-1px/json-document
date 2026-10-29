import { AnnotationReviewGroup } from "@interactive-os/json-document-annotation";
import "@interactive-os/json-document-annotation/annotation-review.css";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Plus, Undo2, Redo2 } from "lucide-react";
import { assertCanvasDocument, type CanvasDocument } from "@interactive-os/json-document-object-document";
import { createObjectEditor, createCanvasHTML, readCanvasHTML, createAnnotationReviewQueue } from "@interactive-os/json-document-editing";
import { createHistoryRuntime, restoreHistoryRuntime, createCollaborationWorkspace } from "@interactive-os/json-document-collaboration/history";
import { createCollaborationEditingHistory } from "@interactive-os/json-document-collaboration/editing";
import { createWebStoredDocument, webCanvasHTMLAdapter } from "@interactive-os/json-document-web";
import { Command, Toolbar } from "@interactive-os/json-document-ui-primitives-react";
import { blankSlideHTML, createSlidesDemoDocument } from "../../shared/demo-workbench/slides-demo-document";
import "@interactive-os/json-document-canvas/canvas-hand.css";
import "./slides-application.css";
import { SlideProof } from "./SlideProof";
import { slidesReviewAgent, slidesReviewCoordinator } from "./slides-review-agent";

/** Host configuration keeps independent applications on the same review composition. */
export interface SlidesApplicationOptions {
  readonly workspaceId?: string;
  readonly title?: string;
  readonly description?: string;
  readonly createDocument?: () => CanvasDocument;
}
export function SlidesApplication({ workspaceId = "slides", title = "Slides", description = "짚으면서 말하면 함께 고쳐요", createDocument = createSlidesDemoDocument }: SlidesApplicationOptions = {}) {
  const [stored] = useState(() => {
    const options = { actorId: `${workspaceId}-human`, ruleset: { id: "slides", digest: "slides/html-pages/v1" }, validate: (value: import("@interactive-os/json-document").JSONValue) => {
      try { assertCanvasDocument(value); return { ok: true as const }; } catch { return { ok: false as const, code: "slides.invalid-document" }; }
    } };
    return createWebStoredDocument({ key: `json-document.${workspaceId}.v1`, storage: () => window.localStorage,
      create: () => createCollaborationWorkspace(createHistoryRuntime(createDocument(), { ...options, epochId: crypto.randomUUID() }), options),
      restore: value => { const restored = restoreHistoryRuntime(value, options); if (!restored.ok) throw Error(restored.reason); return createCollaborationWorkspace(restored.runtime, options); },
    });
  });
  const workspace = stored.source;
  const [editor] = useState(() => createObjectEditor(workspace.runtime.document, { history: createCollaborationEditingHistory(workspace.runtime) }));
  const snapshot = useEditingSnapshot(editor);
  const saveState = useSyncExternalStore(stored.subscribe, () => stored.state);
  useEffect(() => stored.connect(), [stored]);
  const pages = (snapshot.value as CanvasDocument).objects.filter(page => readCanvasHTML(page));
  const [reviews] = useState(() => createWebStoredDocument({ key: `json-document.${workspaceId}.reviews.v1`, storage: () => localStorage, create: () => createAnnotationReviewQueue(), restore: createAnnotationReviewQueue }));
  const reviewSaveState = useSyncExternalStore(reviews.subscribe, () => reviews.state);
  useEffect(() => reviews.connect(), [reviews]);
  useEffect(() => reviews.source.connect(slidesReviewAgent(workspace, reviews.source), { prepare: slidesReviewCoordinator(reviews.source), concurrency: 3 }), [workspace, reviews]);
  return <main className="slides-application" aria-label={`${title} 작업 공간`}>
    <header className="slides-header">
      <div><h1>{title}</h1><span>{description}</span></div>
      {(snapshot.canUndo || snapshot.canRedo) && <Toolbar label="프레젠테이션 작업">
        <Command label="실행 취소" disabled={!snapshot.canUndo} onClick={() => editor.undo()}><Undo2 size={16} aria-hidden="true" /></Command>
        <Command label="다시 실행" disabled={!snapshot.canRedo} onClick={() => editor.redo()}><Redo2 size={16} aria-hidden="true" /></Command>
      </Toolbar>}
    </header>
    <div className="slides-layout">
      <section className="slides-scroll" aria-label="프레젠테이션 페이지">
        <AnnotationReviewGroup following={{ queue: reviews.source, createId: () => crypto.randomUUID(), lang: "ko-KR" }}>{pages.map((page, index) => page.kind === "embedded-document" && <SlideProof storageNamespace={workspaceId} key={page.id} page={page} index={index} editor={editor} queue={reviews.source} />)}</AnnotationReviewGroup>
        {pages.length === 0 && <p className="slides-empty">첫 페이지를 추가해 이야기를 시작하세요.</p>}
        <Command className="slides-add" onClick={() => {
          editor.dispatch({ type: "object.create", object: createCanvasHTML(blankSlideHTML, { x: 0, y: 0, width: 960, height: 540 }, "새 페이지", webCanvasHTMLAdapter) });

        }}><Plus size={16} aria-hidden="true" /> 페이지 추가</Command>
      </section>

    </div>
    {(saveState === "load-error" || saveState === "save-error" || reviewSaveState === "load-error" || reviewSaveState === "save-error") && <p role="alert">페이지를 저장하지 못했습니다. 기존 저장 데이터는 유지됩니다.</p>}
  </main>;
}
