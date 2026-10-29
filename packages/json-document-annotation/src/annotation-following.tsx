import "@interactive-os/json-document-ui-primitives-react/chat-bubble.css";
import { useAnchoredFloatingPosition } from "@interactive-os/json-document-react";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { annotationSelectorBounds, createAnnotationFollowing, type AnnotationFollowing, type AnnotationReviewTask, type AnnotationReviewQueue } from "@interactive-os/json-document-editing";
import { createWebSpeechInput, webSpeechRecognitionConstructor } from "@interactive-os/json-document-web";
import { ChatBubble, ChatActivity, Popover, Command, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import { Mic, MicOff, X, MessageCircle } from "lucide-react";
import { AnnotationHand } from "./annotation-hand.js";
import type { AnnotationReviewProps, AnnotationReviewRegion } from "./annotation-review.js";

export interface AnnotationFollowingOptions {
  readonly queue: AnnotationReviewQueue;
  readonly createId: () => string;
  readonly lang?: string;
}
type FollowingContext = { controller: AnnotationFollowing; listening: boolean; selected: string | null; select: (id: string | null) => void };
const Context = createContext<FollowingContext | null>(null);
export const useAnnotationFollowing = () => useContext(Context);

export function AnnotationFollowingProvider({ options, children }: { options: AnnotationFollowingOptions; children: ReactNode }) {
  const [controller] = useState(() => createAnnotationFollowing(options.queue, options.createId));
  const [listening, setListening] = useState(false);
  const [selected, select] = useState<string | null>(null);
  const context = useMemo(() => ({ controller, listening, selected, select }), [controller, listening, selected]);
  const [error, setError] = useState("");
  const speech = useRef<ReturnType<typeof createWebSpeechInput>>(null);
  const state = useSyncExternalStore(options.queue.subscribe, () => options.queue.snapshot.value);
  const pendingRequest = useSyncExternalStore(controller.subscribe, () => controller.pendingRequest);
  const hasDraft = useSyncExternalStore(controller.subscribe, () => controller.draft !== null);
  const failures = state.tasks.filter(task => task.state === "error").length;
  const pending = state.tasks.filter(task => ["planning", "running", "queued"].includes(task.state)).length;
  const awaiting = state.tasks.filter(task => task.state === "review");
  const attention = [...state.tasks].reverse().find(task => task.state === "review" || task.state === "error") ?? state.tasks.find(task => ["planning", "running", "queued"].includes(task.state));
  useEffect(() => {
    if (!listening) return;
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    function start() {
      if (disposed) return;
      speech.current?.dispose();
      speech.current = createWebSpeechInput({ lang: options.lang ?? "ko-KR",
        onText(text) { controller.hear(text); },
        onInterim(text) { controller.interim(text); },
        onError(code) {
          if (code === "no-speech") return;
          setError(code === "not-allowed" ? "마이크 접근을 허용해 주세요." : `음성 연결이 중단됐습니다 (${code}).`);
          disposed = true; setListening(false);
        },
        onEnd() { controller.endSpeech(); if (!disposed) retry = setTimeout(start, 250); },
      });
      if (!speech.current) { setError("이 브라우저는 음성 인식을 지원하지 않습니다."); setListening(false); return; }
      speech.current.start();
    }
    start();
    const visibility = () => { if (document.hidden) setListening(false); };
    document.addEventListener("visibilitychange", visibility);
    return () => { controller.endSpeech(); disposed = true; clearTimeout(retry); speech.current?.dispose(); speech.current = null; document.removeEventListener("visibilitychange", visibility); };
  }, [listening, controller, options.lang]);

  return <Context.Provider value={context}>{children}
    <aside className={`annotation-following-dock ${floatingSurface.control}`} aria-label="음성 첨삭">
      <Command label={listening ? "음성 첨삭 일시정지" : "음성 첨삭 시작"} aria-pressed={listening} onClick={() => {
        setError("");
        if (!listening && !webSpeechRecognitionConstructor()) { setError("이 브라우저는 음성 인식을 지원하지 않습니다."); return; }
        setListening(value => !value);
      }}>{listening ? <Mic size={18} aria-hidden="true" /> : <MicOff size={18} aria-hidden="true" />}</Command>
      <span role={error ? "alert" : undefined} className="annotation-following-caption">{error || (pendingRequest ? `고칠 위치를 짚어 주세요 · ${pendingRequest}` : "") || (hasDraft ? "" : listening ? "고칠 곳을 짚고 말해 주세요" : "마이크를 켜고 말해 주세요")}</span>
      <span role="status">{pendingRequest ? "대상 대기" : pending ? "처리 중" : listening ? "듣고 있어요" : "일시정지"}</span>
      {attention && <Command onClick={() => {
        select(attention.id);
        document.getElementById(`annotation-anchor-${attention.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}>진행 {pending} · 확인 {awaiting.length + failures}</Command>}
    </aside>
  </Context.Provider>;
}

/** Live source stays visible while speech and marks continuously feed the shared executor. */
export function FollowingReview({ following, session, queue, liveSource, renderContent, title, label, canvasLabel, createId, className, onRevert }: AnnotationReviewProps & { following: FollowingContext }) {
  const document = useSyncExternalStore(session.subscribe, () => session.snapshot.value);
  const state = useSyncExternalStore(queue.subscribe, () => queue.snapshot.value);
  const tasks = state.tasks.filter(task => task.annotation.target.sourceId === document.id);
  const [historyOpen, showHistory] = useState(false);
  const activeTasks = tasks.filter(task => ["queued", "planning", "running"].includes(task.state));
  const attentionTasks = tasks.filter(task => task.state === "review" || task.state === "error");
  const historyTasks = tasks.filter(task => ["accepted", "reverted"].includes(task.state));
  const { selected, select } = following;
  const pageDraft = useSyncExternalStore(following.controller.subscribe, () => {
    const draft = following.controller.draft;
    return draft?.annotation.target.sourceId === document.id ? draft : null;
  });
  const [draftOpen, openDraft] = useState(true);
  useEffect(() => { openDraft(true); }, [pageDraft?.annotation.id]);
  const latestTaskId = tasks.at(-1)?.id;
  useEffect(() => { if (latestTaskId && !["accepted", "reverted"].includes(tasks.at(-1)!.state)) select(latestTaskId); }, [latestTaskId]);
  const [comparison, compare] = useState<{ id: string; before: boolean } | null>(null);
  const compared = tasks.find(task => task.id === comparison?.id);
  const shownSource = compared ? (comparison!.before ? queue.sourceFor(compared) : compared.result) : liveSource;
  const displayed = [
    ...document.annotations.filter(annotation => !(pageDraft?.annotation.id === annotation.id && annotation.presentation.type === "marker") && !tasks.some(task => task.annotationIds.includes(annotation.id) && (task.annotation.id === annotation.id || task.state === "review" || (["accepted", "reverted"].includes(task.state) && !historyOpen)))),
    ...tasks.filter(task => (!["accepted", "reverted", "review"].includes(task.state) && task.annotation.presentation.type !== "marker") || (["accepted", "reverted"].includes(task.state) && historyOpen)).map(task => ({ ...task.annotation, id: `task-${task.id}`, body: { instruction: task.request } })),
  ];
  const cursor = useRef<SVGCircleElement>(null);
  useEffect(() => { if (pageDraft) cursor.current?.setAttribute("visibility", "hidden"); }, [!!pageDraft]);
  const pinned = useRef<ReturnType<typeof annotationSelectorBounds> | null>(null);
  const live = useRef(liveSource);
  live.current = liveSource;
  const [regions, setRegions] = useState<Record<string, AnnotationReviewRegion[]>>({});
  const [revertError, setRevertError] = useState("");
  const projectionKey = JSON.stringify(tasks.map(task => [task.id, task.state, task.targetNodeIds, task.result]));
  const projection = useMemo(() => ({
    requests: state.tasks.filter(task => task.annotation.target.sourceId === document.id && !["accepted", "reverted"].includes(task.state)).map(task => ({
      id: task.id, nodeIds: task.targetNodeIds ?? [],
      ...(task.state === "review" ? { before: queue.sourceFor(task), after: task.result } : {}),
    })),
    onRegions: (next: Record<string, AnnotationReviewRegion[]>) => setRegions(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next),
  }), [projectionKey, document.id, queue, liveSource]);
  const status = (task: AnnotationReviewTask) => ({ queued: task.plan ? "대상 확인 · 실행 대기" : "요청 접수", planning: "대상 확인 중", running: "이곳 수정 중", review: "수정됨", accepted: "확인 완료", reverted: "되돌림", error: "확인 필요" })[task.state];
  const details = (task: AnnotationReviewTask) => <div className="annotation-following-reply">
    {task.response && <ChatBubble direction="incoming" label="에이전트 응답">{task.response}</ChatBubble>}
    {task.state === "running" && !(regions[task.id]?.length) && <p>수정 대상의 위치를 표시하지 못했습니다.</p>}
    {task.state === "error" && <><p role="alert">{task.error}</p><Command onClick={() => queue.retry(task.id, liveSource)}>다시 시도</Command></>}
    {(task.state === "review" || ["accepted", "reverted"].includes(task.state)) && <div className="annotation-following-actions">
      <Command onClick={() => compare({ id: task.id, before: true })}>수정 전후 비교</Command>
      {task.state === "review" && <>
        {onRevert && <Command onClick={() => {
          if (onRevert(task)) { queue.revert(task.id); compare(null); select(""); setRevertError(""); }
          else setRevertError("이후 수정이 있어 바로 되돌릴 수 없습니다. 전후 비교로 확인해 주세요.");
        }}>되돌리기</Command>}
        <Command onClick={() => { queue.accept(task.id); compare(null); select(""); setRevertError(""); }}>확인 완료</Command>
      </>}
    </div>}
    {revertError && <p role="alert">{revertError}</p>}
  </div>;
  const locations = (task: AnnotationReviewTask) => regions[task.id]?.length ? regions[task.id]! : task.state === "review" ? [] : [{ ...annotationSelectorBounds(task.annotation.target.selector), nodeId: "", kind: "request" as const }];
  const renderTasks = (items: readonly AnnotationReviewTask[]) => <ol className="annotation-following-threads" aria-label={`${label} 작업`}>
    {items.map(task => {
      const expanded = selected === task.id || (selected === null && !["accepted", "reverted"].includes(task.state));
      return <li key={task.id} id={`annotation-task-${task.id}`} tabIndex={-1} data-review-state={task.state}>
        <Command className="annotation-following-request" aria-expanded={expanded} onClick={() => select(expanded ? "" : task.id)}>
          <span>{tasks.indexOf(task) + 1}</span><span>{task.request}</span><span role="status">{status(task)}</span>
        </Command>
        {expanded && (compared || !locations(task).length || ["accepted", "reverted"].includes(task.state)) && <><ChatBubble direction="outgoing" label="내 요청">{task.request}</ChatBubble>{details(task)}</>}
      </li>;
    })}
  </ol>;
  return <section className={`annotation-review annotation-following ${className ?? ""}`} aria-label={label}>
    <header><span>{title}</span></header>
    {compared && <div className="annotation-following-comparison" role="status">
      <span>{comparison!.before ? "이 작업의 수정 전" : "이 작업의 수정 후"}</span>
      <Command onClick={() => compare({ id: compared.id, before: !comparison!.before })}>{comparison!.before ? "수정 후 보기" : "수정 전 보기"}</Command>
      <Command onClick={() => compare(null)}>현재 페이지로 돌아가기</Command>
    </div>}
    <div className="annotation-following-document">
    {compared ? <svg className="annotation-review-result" viewBox={`0 0 ${document.sources[0]!.width} ${document.sources[0]!.height}`}>{renderContent(shownSource)}</svg> : <AnnotationHand highlightedAnnotationId={`task-${selected}`} annotations={displayed} editor={session.editor} sourceUrl={document.id} following tool="draw" onToolChange={() => {}} createId={createId}
      enabledTools={[]} rasterStyle={{ stroke: "rgb(var(--color-foreground-accent))", fill: "rgb(var(--color-foreground-accent))", lineWidth: 3, labelFont: "14px sans-serif" }}
      labels={{ canvas: canvasLabel ?? `${label} 표시` }}
      classNames={{ frame: "annotation-review-frame", stage: "annotation-review-stage", canvas: "annotation-review-canvas" }}
      onPoint={point => {
        cursor.current?.setAttribute("cx", String(point.x)); cursor.current?.setAttribute("cy", String(point.y)); cursor.current?.setAttribute("visibility", pageDraft ? "hidden" : "visible");
        const bounds = pinned.current;
        if (bounds && point.x >= bounds.x - 24 && point.x <= bounds.x + bounds.width + 24 && point.y >= bounds.y - 24 && point.y <= bounds.y + bounds.height + 24) return;
        pinned.current = null;
        following.controller.point({ id: `pointer-${document.id}`, target: { sourceId: document.id, selector: { type: "point", ...point } }, body: { instruction: "" }, presentation: { type: "marker" } }, live.current);
      }}
      onAnnotationCreated={annotation => {
        const task = tasks.find(item => `task-${item.id}` === annotation.id);
        if (task) { select(task.id); window.document.getElementById(`annotation-task-${task.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
        pinned.current = annotationSelectorBounds(annotation.target.selector); following.controller.point(annotation, live.current, true); }}
      content={<>{renderContent(liveSource, projection)}<circle ref={cursor} visibility="hidden" r={12} fill="none" stroke="rgb(var(--color-foreground-accent))" strokeWidth={2} pointerEvents="none" /></>} />}
    {!compared && <div className="annotation-following-locations" aria-label="문서 수정 위치">
      {tasks.filter(task => !["accepted", "reverted"].includes(task.state)).flatMap(task => locations(task).map((region, index) => <FollowingComment key={`${task.id}-${index}`}
        id={index === 0 ? `annotation-anchor-${task.id}` : undefined} region={region} width={document.sources[0]!.width} height={document.sources[0]!.height}
        state={task.state} open={selected === task.id && index === 0 && !pageDraft} onOpenChange={open => select(open ? task.id : "")}
        label={`${tasks.indexOf(task) + 1} · ${region.kind === "added" ? "추가됨" : region.kind === "removed" ? "삭제 포함 · 비교" : region.kind === "page" ? "페이지 변경 · 비교" : status(task)}`}>
        <div className="annotation-following-note-heading">{["queued", "planning", "running"].includes(task.state) ? <ChatActivity label={status(task)} /> : <span>{status(task)}</span>}<Command label="첨삭 접기" onClick={() => select("")}><X size={14} aria-hidden="true" /></Command></div>
        <ChatBubble direction="outgoing" label="내 요청">{task.request}</ChatBubble>{details(task)}
      </FollowingComment>))}
      {pageDraft && <FollowingComment region={{ ...annotationSelectorBounds(pageDraft.annotation.target.selector), nodeId: "", kind: "request" }} width={document.sources[0]!.width} height={document.sources[0]!.height}
        state="listening" open={draftOpen} onOpenChange={openDraft} label="말하는 중인 첨삭">
        <div className="annotation-following-note-heading"><span>듣고 있어요</span><Command label="첨삭 접기" onClick={() => openDraft(false)}><X size={14} aria-hidden="true" /></Command></div>
        <ChatBubble direction="outgoing" label="말하는 중인 내 요청" aria-live="polite">{pageDraft.text}</ChatBubble>
      </FollowingComment>}
    </div>}
    </div>
    {activeTasks.length > 0 && <section className="annotation-following-group" aria-label="진행 중"><details><summary>진행 중 {activeTasks.length}</summary>{renderTasks(activeTasks)}</details></section>}
    {attentionTasks.length > 0 && <section className="annotation-following-group" aria-label="확인할 결과"><details open={!!compared}><summary>확인할 결과 {attentionTasks.length}</summary>{renderTasks(attentionTasks)}</details></section>}
    {historyTasks.length > 0 && <details className="annotation-following-history" open={historyOpen} onToggle={event => showHistory(event.currentTarget.open)}>
      <summary>완료 기록 {historyTasks.length}</summary>{historyOpen && renderTasks(historyTasks)}
    </details>}
  </section>;
}

/** Annotation composes location semantics; Popover owns focus and dismissal. */
function FollowingComment({ id, region, width, height, state, open, onOpenChange, label, children }: {
  id?: string | undefined;
  region: Omit<AnnotationReviewRegion, "kind"> & { kind: AnnotationReviewRegion["kind"] | "request" };
  width: number; height: number; state: string; open: boolean;
  onOpenChange: (open: boolean) => void; label: string; children: ReactNode;
}) {
  const position = useAnchoredFloatingPosition<HTMLDivElement, HTMLDivElement>({ active: open,
    geometryKey: `${region.x}:${region.y}:${region.width}:${region.height}`, policy: { type: "preferred", placement: "right", fallbacks: ["bottom", "top", "left"] }, offset: 12, boundaryPadding: 16 });
  return <div id={id} ref={position.anchorRef} data-review-location={state} data-review-node={region.nodeId} data-change-kind={region.kind}
    className="annotation-following-location" style={{ left: `${100 * region.x / width}%`, top: `${100 * region.y / height}%`, width: `${100 * region.width / width}%`, height: `${100 * region.height / height}%` }}>
    <Popover label={label} trigger={<MessageCircle size={18} aria-hidden="true" />} triggerPresentation="icon" open={open} onOpenChange={onOpenChange} autoFocus={false} dismissOnOutsideInteraction={false}
      className="annotation-following-location-label" panelClassName={`annotation-following-note ${floatingSurface.panel}`} panelRef={position.floatingRef} panelStyle={position.style}>
      {children}
    </Popover>
  </div>;
}
