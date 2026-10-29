import type { WebHTMLReviewRegion as AnnotationReviewRegion, WebHTMLReviewRequest } from "@interactive-os/json-document-web";
export type { WebHTMLReviewRegion as AnnotationReviewRegion } from "@interactive-os/json-document-web";
import { AnnotationFollowingProvider, FollowingReview, useAnnotationFollowing, type AnnotationFollowingOptions } from "./annotation-following.js";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { type Annotation, type AnnotationReviewQueue, type AnnotationReviewSession, type AnnotationReviewState, type AnnotationReviewTask } from "@interactive-os/json-document-editing";
import { Command, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import { ChatComposer, useComposer, type ChatComposerProps } from "@interactive-os/json-document-composer-react";
import { COMPOSER_HOST_PROFILE_V1, composerText } from "@interactive-os/json-document-composer";
import { createRichTextNodeId } from "@interactive-os/json-document-rich-text";
import { AnnotationHand, type AnnotationTool } from "./annotation-hand.js";

export interface AnnotationReviewProps {
  readonly session: AnnotationReviewSession;
  readonly queue: AnnotationReviewQueue;
  readonly liveSource: string;
  /** SVG children rendered in the session source's coordinate space. */
  readonly renderContent: (source: string, review?: AnnotationReviewProjection) => ReactNode;
  readonly onRevert?: (task: AnnotationReviewTask) => boolean;
  readonly title: ReactNode;
  readonly label: string;
  readonly createId: () => string;
  readonly canvasLabel?: string;
  readonly className?: string;
  readonly speechInput?: ChatComposerProps<string, never>["speechInput"];
}
export interface AnnotationReviewProjection {
  readonly requests: readonly WebHTMLReviewRequest[];
  readonly onRegions: (regions: Record<string, AnnotationReviewRegion[]>) => void;
}
const ReviewGroupContext = createContext<{ active: string | null; activate: (id: string) => void } | null>(null);
/** Coordinates a single instruction composer across a collection of review surfaces. */
export function AnnotationReviewGroup({ children, following }: { readonly children: ReactNode; readonly following?: AnnotationFollowingOptions }) {
  const [active, activate] = useState<string | null>(null);
  return <ReviewGroupContext.Provider value={{ active, activate }}>{following ? <AnnotationFollowingProvider options={following}>{children}</AnnotationFollowingProvider> : children}</ReviewGroupContext.Provider>;
}

/** Mark → instruct → queued execution → review → next revision, without Host lifecycle glue. */
export function AnnotationReview(props: AnnotationReviewProps) {
  const following = useAnnotationFollowing();
  return following ? <FollowingReview {...props} following={following} /> : <ManualAnnotationReview {...props} />;
}
function ManualAnnotationReview({ session, queue, liveSource, renderContent, title, label, createId, canvasLabel, className, speechInput }: AnnotationReviewProps) {
  const document = useSyncExternalStore(session.subscribe, () => session.snapshot.value);
  const state = useSyncExternalStore(queue.subscribe, () => queue.snapshot.value) as AnnotationReviewState;
  const source = document.sources[0]!;
  const group = useContext(ReviewGroupContext);
  const active = !group || group.active === document.id;
  const onActivate = () => group?.activate(document.id);
  const [tool, setTool] = useState<AnnotationTool>("comment");
  const [composing, setComposing] = useState(false);
  const shownResult = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const tasks = state.tasks.filter(task => task.annotation.target.sourceId === document.id);
  const base = document.source;
  const changed = base !== liveSource;
  const pending = tasks.some(task => task.state === "queued" || task.state === "planning" || task.state === "running");
  const latestResult = [...tasks].reverse().find(task => task.state === "review" || task.state === "accepted")?.result ?? null;
  useEffect(() => {
    if (pending || composing || !latestResult || latestResult === base || shownResult.current === latestResult) return;
    shownResult.current = latestResult;
    setPreview(latestResult);
  }, [pending, composing, latestResult, base]);
  useEffect(() => {
    if (composing || tasks.length === 0 || tasks.some(task => task.state !== "accepted") || base === liveSource) return;
    session.advance(liveSource);
    setPreview(null);
  }, [state, composing, base, liveSource, document, session]);
  return <section onPointerDownCapture={onActivate} onFocusCapture={onActivate} className={`annotation-review ${className ?? ""}`} aria-label={label}>
    <header><span>{title}</span>
      {changed && <Command onClick={() => setPreview(value => value ? null : liveSource)}>{preview ? "첨삭 원문 보기" : "수정안 보기"}</Command>}
      {preview && <Command onClick={() => { session.advance(liveSource); setPreview(null); }}>현재 버전에서 계속 첨삭</Command>}
    </header>
    {preview ? <svg viewBox={`0 0 ${source.width} ${source.height}`} className="annotation-review-result">{renderContent(preview ?? base)}</svg> :
      <AnnotationHand editor={session.editor} sourceUrl={document.id} tool={tool} onToolChange={setTool} createId={createId}
        toolLabels={{ select: "표시 선택", comment: "영역 지적", draw: "자유선 첨삭", arrow: "화살표" }} enabledTools={["comment", "draw", "arrow", "select"]} rasterStyle={{ stroke: "rgb(var(--color-foreground-accent))", fill: "rgb(var(--color-foreground-accent))", lineWidth: 3, labelFont: "14px sans-serif" }}
        labels={{ canvas: canvasLabel ?? `${label} 표시`, instruction: "교정 지시", sendComment: "첨삭 맡기기", deleteAnnotation: "교정 표시 삭제" }}
        classNames={{ frame: "annotation-review-frame", stage: "annotation-review-stage", canvas: "annotation-review-canvas", toolDock: `annotation-review-tools ${floatingSurface.control}`, commentPreview: "annotation-review-tooltip" }}
        content={renderContent(base)}
        onCommentEditingChange={setComposing}
        onSubmitAnnotation={annotation => { setComposing(false); queue.enqueue({ id: createId(), annotation, source: base }); setTool("comment"); }}
        renderCommentComposer={({ annotation, submit, cancel }) => <div key={annotation.id} hidden={!active}><ReviewInstruction speechInput={speechInput} annotation={annotation} submit={submit} cancel={() => { setComposing(false); cancel(); }} /></div>} />}
    {tasks.some(task => task.state !== "accepted") && <ol className="annotation-review-tasks" aria-label={`${label} 처리`}>
      {tasks.map((task, number) => task.state === "accepted" ? null : <li key={task.id} data-review-state={task.state}>
        <span>{number + 1}. {task.annotation.body.instruction}</span><span role="status">{{ queued: "대기", planning: "계획 중", running: "수정 중", review: "확인 대기", accepted: "확인 완료", reverted: "되돌림", error: "확인 필요" }[task.state]}</span>
        {task.state === "review" && <><Command onClick={() => setPreview(task.result)}>결과 보기</Command><Command onClick={() => queue.accept(task.id)}>확인</Command></>}
        {task.state === "error" && <><span>{task.error}</span><Command onClick={() => queue.retry(task.id, liveSource)}>현재 원문으로 다시 요청</Command></>}
      </li>)}
    </ol>}
    {tasks.some(task => task.state === "accepted") && <details className="annotation-review-history"><summary>완료한 첨삭 {tasks.filter(task => task.state === "accepted").length}개</summary><ol>{tasks.filter(task => task.state === "accepted").map(task => <li key={task.id}>{task.annotation.body.instruction}<span role="status">확인 완료</span></li>)}</ol></details>}
  </section>;
}

function ReviewInstruction({ annotation, submit, cancel, speechInput }: { speechInput: ChatComposerProps<string, never>["speechInput"]; annotation: Annotation; submit: (text: string) => void; cancel: () => void }) {
  const composer = useComposer({ id: `proof-${annotation.id}`, config: { profile: COMPOSER_HOST_PROFILE_V1, models: [{ id: "local", value: "local", label: "Local", description: "첨삭" }], suggestions: [], attachments: { acceptedMediaTypes: [], maxFiles: null, maxBytesPerFile: null }, interaction: { submit: "enter", newline: "shift-enter" } }, ports: { createId: createRichTextNodeId, submit: async draft => submit(composerText(draft.instruction)) }, labels: { mentionSuggestions: "멘션", skillSuggestions: "스킬" } });
  useEffect(() => { if (annotation.body.instruction) composer.insertText(annotation.body.instruction); composer.editorElementRef.current?.focus(); }, []);
  return <aside className={`annotation-review-instruction ${floatingSurface.panel}`} aria-label="첨삭 지시 작성"><Command onClick={cancel}>취소</Command><ChatComposer composer={composer} {...(speechInput ? { speechInput } : {})} label="교정 지시" placeholder="표시한 곳을 어떻게 고칠까요?" submitLabel="첨삭 맡기기" submitErrorLabel="첨삭을 저장하지 못했습니다." /></aside>;
}
