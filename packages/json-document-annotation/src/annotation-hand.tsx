import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import { createGestureSession } from "@interactive-os/json-document-affordance";
import {
  annotationResizeHandle,
  annotationSelectorBounds,
  transformAnnotationSelector,
  type Annotation,
  type AnnotationDocument,
  type AnnotationEditor,
  type AnnotationPoint,
  type AnnotationSource,
} from "@interactive-os/json-document-editing";
import { createWebPointerSession, projectWebClientPointToSVG, renderWebAnnotationRaster, webSVGViewportFromElement, type WebAnnotationRasterStyle } from "@interactive-os/json-document-web";
import { IconButton, ToggleButton } from "@interactive-os/json-document-ui-primitives-react";
import { ArrowUpRight, Download, MessageSquare, MousePointer2, Pencil, SendHorizontal, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";

export type AnnotationTool = "select" | "comment" | "draw" | "arrow" | "like" | "dislike";
type Gesture =
  | { readonly type: "create"; readonly tool: Exclude<AnnotationTool, "select" | "draw">; readonly start: AnnotationPoint; readonly current: AnnotationPoint }
  | { readonly type: "draw"; readonly points: ReadonlyArray<AnnotationPoint> }
  | { readonly type: "move" | "resize"; readonly id: string; readonly start: AnnotationPoint; readonly current: AnnotationPoint };

export const annotationTools = [
  { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { id: "comment", label: "Comment", shortcut: "C", icon: MessageSquare },
  { id: "draw", label: "Draw", shortcut: "D", icon: Pencil },
  { id: "arrow", label: "Arrow", shortcut: "A", icon: ArrowUpRight },
  { id: "like", label: "Like", shortcut: "L", icon: ThumbsUp },
  { id: "dislike", label: "Dislike", shortcut: "K", icon: ThumbsDown },
] as const;

export interface AnnotationHandLabels {
  readonly canvas?: string;
  readonly tools?: string;
  readonly instruction?: string;
  readonly instructionPlaceholder?: string;
  readonly sendComment?: string;
  readonly deleteAnnotation?: string;
  readonly downloadImage?: string;
}

export interface AnnotationHandClassNames {
  readonly frame?: string;
  readonly stage?: string;
  readonly canvas?: string;
  readonly commentCard?: string;
  readonly commentInput?: string;
  readonly commentPreview?: string;
  readonly sendButton?: string;
  readonly toolDock?: string;
  readonly dockButton?: string;
  readonly dockDivider?: string;
}

export interface AnnotationHandProps {
  readonly editor: AnnotationEditor;
  readonly sourceUrl: string;
  readonly createId: () => string;
  readonly classNames?: AnnotationHandClassNames;
  readonly enabledTools?: ReadonlyArray<AnnotationTool>;
  readonly labels?: AnnotationHandLabels;
  readonly rasterStyle: WebAnnotationRasterStyle;
  readonly onAnnouncement?: (message: string) => void;
}

const defaultLabels = {
  canvas: "Raster annotation canvas", tools: "Annotation tools", instruction: "Annotation instruction",
  instructionPlaceholder: "수정 요청을 입력하세요…", sendComment: "Send comment",
  deleteAnnotation: "Delete annotation", downloadImage: "Download annotated image",
};
const accent = "rgb(var(--color-border-accent))";

export function AnnotationHand(props: AnnotationHandProps) {
  useSyncExternalStore(props.editor.subscribe, () => props.editor.snapshot.revision, () => props.editor.snapshot.revision);
  const labels = { ...defaultLabels, ...props.labels }; const classes = props.classNames ?? {};
  const enabled = props.enabledTools ?? annotationTools.map(({ id }) => id);
  const [tool, setTool] = useState<AnnotationTool>(enabled.includes("comment") ? "comment" : enabled[0] ?? "select");
  const [editingId, setEditingId] = useState<string | null>(null); const [previewId, setPreviewId] = useState<string | null>(null);
  const [, redraw] = useState(0);
  const [gestures] = useState(() => createGestureSession<Gesture>({ onBegin: rerender, onPreview: rerender, onCommit: rerender, onCancel: rerender }));
  const [pointer] = useState(() => createWebPointerSession<{ readonly active: true }>());
  const svgRef = useRef<SVGSVGElement>(null);
  const document = props.editor.snapshot.value as AnnotationDocument; const selectedId = props.editor.snapshot.selection.primaryId;
  const selected = document.annotations.find(({ id }) => id === selectedId) ?? null; const source = document.sources[0]!; const gesture = gestures.getActive();
  function rerender() { redraw((value) => value + 1); }
  function announce(message: string) { props.onAnnouncement?.(message); }
  function select(id: string | null) { props.editor.dispatch({ type: "selection.set", annotationId: id, mode: "replace" }); }
  function choose(next: AnnotationTool) { setTool(next); setEditingId(null); if (selectedId !== null) select(null); }
  function remove() { if (selectedId === null) return; props.editor.dispatch({ type: "annotation.delete", annotationId: selectedId }); setEditingId(null); announce("선택한 annotation을 삭제했습니다."); }

  function canvasDown(event: PointerEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget && (event.target as Element).closest("[data-annotation-id]")) return;
    const point = eventPoint(event); if (point === null) return; if (tool === "select") return select(null);
    pointer.begin(event.currentTarget, event.pointerId, { active: true });
    gestures.begin(tool === "draw" ? { type: "draw", points: [point] } : { type: "create", tool, start: point, current: point });
  }
  function annotationDown(event: PointerEvent<SVGGElement>, annotation: Annotation) {
    event.stopPropagation(); setEditingId(null); setPreviewId(null);
    if (tool !== "select") return select(annotation.id);
    const svg = svgRef.current; const start = eventPoint(event); if (svg === null || start === null) return;
    select(annotation.id); pointer.begin(svg, event.pointerId, { active: true }); gestures.begin({ type: "move", id: annotation.id, start, current: start });
  }
  function resizeDown(event: PointerEvent<SVGCircleElement>, annotation: Annotation) {
    event.stopPropagation(); const svg = svgRef.current; const start = eventPoint(event); if (svg === null || start === null) return;
    pointer.begin(svg, event.pointerId, { active: true }); gestures.begin({ type: "resize", id: annotation.id, start, current: start });
  }
  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    if (gesture === null || pointer.getSnapshot()?.pointerId !== event.pointerId) return; const point = eventPoint(event); if (point === null) return;
    if (gesture.type === "draw") { const last = gesture.points[gesture.points.length - 1]; if (last && distance(last, point) >= 4) gestures.preview({ ...gesture, points: [...gesture.points, point] }); }
    else gestures.preview({ ...gesture, current: point });
  }
  function pointerUp(event: PointerEvent<SVGSVGElement>) {
    if (pointer.commit(event.pointerId) === null) return; const committed = gestures.commit(); if (committed === null) return;
    if (committed.type === "draw" || committed.type === "create") {
      const annotation = committed.type === "draw" ? drawAnnotation(source.id, committed.points, props.createId) : createAnnotation(source.id, committed, props.createId);
      if (annotation === null) return; props.editor.dispatch({ type: "annotation.create", annotation }); setTool("select");
      setEditingId(annotation.presentation.type === "reaction" ? null : annotation.id); announce(createdMessage(annotation)); return;
    }
    const dx = committed.current.x - committed.start.x; const dy = committed.current.y - committed.start.y;
    if (committed.type === "move" && Math.hypot(dx, dy) < 4) {
      const annotation = document.annotations.find(({ id }) => id === committed.id); if (annotation?.presentation.type !== "reaction") setEditingId(committed.id); return;
    }
    const annotation = document.annotations.find(({ id }) => id === committed.id); if (!annotation) return;
    const handle = annotationResizeHandle(annotation.target.selector);
    if (committed.type === "move") props.editor.dispatch({ type: "annotation.move", annotationId: committed.id, dx, dy });
    else if (handle !== null) props.editor.dispatch({ type: "annotation.resize", annotationId: committed.id, handle, dx, dy });
    announce(committed.type === "move" ? "Annotation을 이동했습니다." : "Target을 resize했습니다.");
  }
  function cancel(event: PointerEvent<SVGSVGElement>, reason: "pointer-cancel" | "lost-capture") {
    if (pointer.cancel(event.pointerId, reason === "lost-capture" ? "lost-capture" : "cancel") === null) return;
    gestures.cancel(reason); announce("진행 중인 조작을 취소했습니다.");
  }
  function keyDown(event: KeyboardEvent<SVGSVGElement>) {
    const command = event.metaKey || event.ctrlKey;
    if (command && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? props.editor.redo() : props.editor.undo(); return; }
    const next = !command ? annotationTools.find(({ shortcut }) => shortcut.toLowerCase() === event.key.toLowerCase())?.id : undefined;
    if (next && enabled.includes(next)) { event.preventDefault(); choose(next); return; }
    if (event.key === "Escape") { event.preventDefault(); const active = pointer.getSnapshot(); if (active) pointer.cancel(active.pointerId); gestures.cancel("cancel"); choose("select"); }
    if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); remove(); }
  }
  async function download() {
    const result = await renderWebAnnotationRaster({ document, sourceId: source.id, sourceURL: props.sourceUrl, style: props.rasterStyle });
    if (!result.ok) return announce("Annotation 이미지를 만들지 못했습니다.");
    const link = window.document.createElement("a"); link.href = result.dataURL; link.download = "annotation-request.png"; link.click(); announce("Annotation이 적용된 이미지를 다운로드했습니다.");
  }
  return <div className={classes.frame} style={{ aspectRatio: `${source.width} / ${source.height}` }}>
    <div className={classes.stage}>
      <svg ref={svgRef} aria-label={labels.canvas} className={classes.canvas} data-tool={tool} onKeyDown={keyDown} onPointerDown={canvasDown} onLostPointerCapture={(event) => cancel(event, "lost-capture")} onPointerCancel={(event) => cancel(event, "pointer-cancel")} onPointerMove={pointerMove} onPointerUp={pointerUp} role="application" tabIndex={0} viewBox={`0 0 ${source.width} ${source.height}`}>
        <image href={props.sourceUrl} width={source.width} height={source.height} pointerEvents="none" />
        {document.annotations.map((annotation, index) => <AnnotationShape key={annotation.id} annotation={project(annotation, gesture)} index={index + 1} selected={annotation.id === selectedId} onDown={annotationDown} onPreview={(visible) => setPreviewId(visible ? annotation.id : null)} onResize={resizeDown} />)}
        {gesture?.type === "create" ? <DraftShape gesture={gesture} /> : null}{gesture?.type === "draw" ? <Stroke points={gesture.points} draft /> : null}
      </svg>
      {document.annotations.map((annotation, index) => gesture === null && previewId === annotation.id && annotation.body.instruction.trim() && editingId !== annotation.id ? <CommentPreview key={annotation.id} annotation={annotation} index={index + 1} source={source} className={classes.commentPreview} /> : null)}
      {selected && editingId === selected.id ? <CommentComposer annotation={selected} index={document.annotations.indexOf(selected) + 1} source={source} classNames={classes} labels={labels} onCancel={() => cancelComment(selected)} onSave={(instruction) => saveComment(selected, instruction)} onSubmit={(instruction) => submitComment(selected, instruction)} /> : null}
    </div>
    <nav aria-label={labels.tools} className={classes.toolDock}>
      {annotationTools.filter(({ id }) => enabled.includes(id)).map(({ id, label, shortcut, icon: Icon }) => <ToggleButton key={id} label={label} tooltip={`${label} (${shortcut})`} pressed={tool === id} className={classes.dockButton} onClick={() => choose(id)}><Icon aria-hidden="true" size={16} /></ToggleButton>)}
      <span className={classes.dockDivider} aria-hidden="true" />
      <IconButton label={labels.deleteAnnotation} className={classes.dockButton} disabled={selected === null} onClick={remove}><Trash2 aria-hidden="true" size={16} /></IconButton>
      <IconButton label={labels.downloadImage} className={classes.dockButton} onClick={() => void download()}><Download aria-hidden="true" size={16} /></IconButton>
    </nav>
    <output className="sr-only" data-testid="annotation-structured-output">{JSON.stringify(document)}</output>
  </div>;

  function saveComment(annotation: Annotation, instruction: string) { const value = instruction.trim(); if (annotation.body.instruction !== value) props.editor.dispatch({ type: "annotation.body.set", annotationId: annotation.id, instruction: value }); setTool("select"); announce("수정 요청을 추가했습니다."); }
  function submitComment(annotation: Annotation, instruction: string) { saveComment(annotation, instruction); setEditingId(null); }
  function cancelComment(annotation: Annotation) { if (!annotation.body.instruction) props.editor.dispatch({ type: "annotation.delete", annotationId: annotation.id }); else select(null); setEditingId(null); }
}

function CommentComposer(props: { annotation: Annotation; index: number; source: AnnotationSource; classNames: AnnotationHandClassNames; labels: typeof defaultLabels; onCancel: () => void; onSave: (value: string) => void; onSubmit: (value: string) => void }) {
  const [draft, setDraft] = useState(props.annotation.body.instruction); const input = useRef<HTMLTextAreaElement>(null); const dock = composerDock(props.annotation, props.source);
  useEffect(() => setDraft(props.annotation.body.instruction), [props.annotation.id, props.annotation.body.instruction]);
  useEffect(() => { const frame = requestAnimationFrame(() => input.current?.focus()); return () => cancelAnimationFrame(frame); }, [props.annotation.id]);
  return <section aria-label={`Request ${props.index} comment`} className={props.classNames.commentCard} style={dockStyle(dock, props.source)}>
    <textarea ref={input} aria-label={props.labels.instruction} className={props.classNames.commentInput} value={draft} placeholder={props.labels.instructionPlaceholder} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (draft.trim()) props.onSave(draft); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (draft.trim()) props.onSubmit(draft); } else if (event.key === "Escape") props.onCancel(); }} />
    <IconButton label={props.labels.sendComment} className={props.classNames.sendButton} disabled={!draft.trim()} onClick={() => props.onSubmit(draft)} onMouseDown={(event) => event.preventDefault()}><SendHorizontal aria-hidden="true" size={15} /></IconButton>
  </section>;
}
function CommentPreview({ annotation, index, source, className }: { annotation: Annotation; index: number; source: AnnotationSource; className?: string | undefined }) { const dock = composerDock(annotation, source); return <div aria-label={`Comment ${index} preview`} className={className} role="tooltip" style={dockStyle(dock, source)}>{annotation.body.instruction}</div>; }
function AnnotationShape({ annotation, index, selected, onDown, onPreview, onResize }: { annotation: Annotation; index: number; selected: boolean; onDown: (event: PointerEvent<SVGGElement>, value: Annotation) => void; onPreview: (visible: boolean) => void; onResize: (event: PointerEvent<SVGCircleElement>, value: Annotation) => void }) {
  const selector = annotation.target.selector; const bounds = annotationSelectorBounds(selector); const common = { fill: "none", stroke: accent, strokeWidth: selected ? 6 : 4, vectorEffect: "non-scaling-stroke" as const };
  return <g aria-label={`Annotation ${index}: ${annotation.body.instruction}`} data-annotation-id={annotation.id} data-selected={String(selected)} onBlur={() => onPreview(false)} onFocus={() => onPreview(true)} onPointerEnter={() => onPreview(true)} onPointerLeave={() => onPreview(false)} onPointerDown={(event) => onDown(event, annotation)} role="button" tabIndex={0} style={{ cursor: "move" }}>
    {annotation.presentation.type === "marker" && selector.type === "point" ? <Badge index={index} point={selector} selected={selected} /> : null}
    {annotation.presentation.type === "reaction" && selector.type === "point" ? <Reaction point={selector} reaction={annotation.presentation.reaction} selected={selected} /> : null}
    {annotation.presentation.type === "outline" && selector.type === "rectangle" ? <><rect {...common} {...selector} fill="transparent" />{selected ? <Handle label="Resize rectangle" point={{ x: selector.x + selector.width, y: selector.y + selector.height }} onDown={(event) => onResize(event, annotation)} /> : null}</> : null}
    {annotation.presentation.type === "stroke" && selector.type === "path" ? <><Stroke points={selector.points} selected={selected} />{selected ? <Handle label="Resize drawing" point={{ x: bounds.x + bounds.width, y: bounds.y + bounds.height }} onDown={(event) => onResize(event, annotation)} /> : null}</> : null}
    {annotation.presentation.type === "arrow" && selector.type === "arrow" ? <><Arrow from={selector.from} to={selector.to} selected={selected} />{selected ? <Handle label="Resize arrow" point={selector.to} onDown={(event) => onResize(event, annotation)} /> : null}</> : null}
    {annotation.presentation.type !== "marker" && annotation.presentation.type !== "reaction" ? <Badge index={index} point={bounds} selected={selected} /> : null}
  </g>;
}
function Badge({ index, point, selected }: { index: number; point: AnnotationPoint; selected: boolean }) { return <g><circle cx={point.x} cy={point.y} r="24" fill={accent} stroke="white" strokeWidth={selected ? 6 : 0} vectorEffect="non-scaling-stroke" /><text x={point.x} y={point.y + 1} fill="white" fontSize="22" fontWeight="700" textAnchor="middle" dominantBaseline="middle">{index}</text></g>; }
function Handle({ label, point, onDown }: { label: string; point: AnnotationPoint; onDown: (event: PointerEvent<SVGCircleElement>) => void }) { return <circle aria-label={label} cx={point.x} cy={point.y} r="15" fill={accent} onPointerDown={onDown} />; }
function Stroke({ points, selected, draft }: { points: ReadonlyArray<AnnotationPoint>; selected?: boolean; draft?: boolean }) { return <path d={pathData(points)} fill="none" opacity={draft ? .7 : 1} stroke={accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth={selected ? 12 : 9} vectorEffect="non-scaling-stroke" />; }
function Arrow({ from, to, selected }: { from: AnnotationPoint; to: AnnotationPoint; selected: boolean }) { const a = Math.atan2(to.y - from.y, to.x - from.x); const point = (delta: number) => ({ x: to.x - 34 * Math.cos(a + delta), y: to.y - 34 * Math.sin(a + delta) }); const l = point(-Math.PI / 6), r = point(Math.PI / 6); return <path d={`M ${from.x} ${from.y} L ${to.x} ${to.y} M ${l.x} ${l.y} L ${to.x} ${to.y} L ${r.x} ${r.y}`} fill="none" stroke={accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth={selected ? 10 : 8} vectorEffect="non-scaling-stroke" />; }
function Reaction({ point, reaction, selected, draft }: { point: AnnotationPoint; reaction: "like" | "dislike"; selected: boolean; draft?: boolean }) { const Icon = reaction === "like" ? ThumbsUp : ThumbsDown; return <g aria-label={reaction === "like" ? "Like sticker" : "Dislike sticker"} opacity={draft ? .7 : 1}><circle cx={point.x} cy={point.y} r="29" fill="white" stroke={accent} strokeWidth={selected ? 5 : 3} /><Icon x={point.x - 15} y={point.y - 15} width="30" height="30" color={accent} /></g>; }
function DraftShape({ gesture }: { gesture: Extract<Gesture, { type: "create" }> }) { if (gesture.tool === "like" || gesture.tool === "dislike") return <Reaction point={gesture.start} reaction={gesture.tool} selected={false} draft />; if (gesture.tool === "arrow") return <Arrow from={gesture.start} to={gesture.current} selected />; if (distance(gesture.start, gesture.current) < 16) return <circle cx={gesture.start.x} cy={gesture.start.y} r="32" fill={accent} opacity=".7" />; return <rect {...rectangle(gesture.start, gesture.current)} fill="transparent" stroke={accent} strokeDasharray="18 12" strokeWidth="8" />; }
function project(annotation: Annotation, gesture: Gesture | null): Annotation { if (!gesture || (gesture.type !== "move" && gesture.type !== "resize") || gesture.id !== annotation.id) return annotation; const selector = transformAnnotationSelector(annotation.target.selector, gesture.type === "move" ? { type: "move", dx: gesture.current.x - gesture.start.x, dy: gesture.current.y - gesture.start.y } : { type: "resize", handle: annotationResizeHandle(annotation.target.selector) ?? "south-east", dx: gesture.current.x - gesture.start.x, dy: gesture.current.y - gesture.start.y }); return selector ? { ...annotation, target: { ...annotation.target, selector } } : annotation; }
function createAnnotation(sourceId: string, gesture: Extract<Gesture, { type: "create" }>, id: () => string): Annotation | null { const { tool, start, current } = gesture; if (tool === "like" || tool === "dislike") return { id: id(), target: { sourceId, selector: { type: "point", ...start } }, body: { instruction: "" }, presentation: { type: "reaction", reaction: tool } }; if (tool === "comment") return { id: id(), target: { sourceId, selector: distance(start, current) < 16 ? { type: "point", ...start } : { type: "rectangle", ...rectangle(start, current) } }, body: { instruction: "" }, presentation: { type: distance(start, current) < 16 ? "marker" : "outline" } }; return distance(start, current) < 8 ? null : { id: id(), target: { sourceId, selector: { type: "arrow", from: start, to: current } }, body: { instruction: "" }, presentation: { type: "arrow" } }; }
function drawAnnotation(sourceId: string, points: ReadonlyArray<AnnotationPoint>, id: () => string): Annotation | null { return points.length < 2 || pathLength(points) < 16 ? null : { id: id(), target: { sourceId, selector: { type: "path", points } }, body: { instruction: "" }, presentation: { type: "stroke" } }; }
function eventPoint(event: PointerEvent<SVGElement>): AnnotationPoint | null { const svg = event.currentTarget.ownerSVGElement ?? event.currentTarget as SVGSVGElement; const point = projectWebClientPointToSVG({ x: event.clientX, y: event.clientY }, webSVGViewportFromElement(svg)); return point && { x: point.x, y: point.y }; }
function rectangle(a: AnnotationPoint, b: AnnotationPoint) { return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) }; }
function distance(a: AnnotationPoint, b: AnnotationPoint) { return Math.hypot(b.x - a.x, b.y - a.y); }
function pathLength(points: ReadonlyArray<AnnotationPoint>) { return points.slice(1).reduce((total, point, index) => total + distance(points[index] ?? point, point), 0); }
function pathData(points: ReadonlyArray<AnnotationPoint>) { const first = points[0]; if (!first) return ""; if (points.length === 2) return `M ${first.x} ${first.y} L ${points[1]!.x} ${points[1]!.y}`; const curves = points.slice(1, -1).map((point, index) => { const next = points[index + 2] ?? point; return `Q ${point.x} ${point.y} ${(point.x + next.x) / 2} ${(point.y + next.y) / 2}`; }); const last = points[points.length - 1] ?? first; return [`M ${first.x} ${first.y}`, ...curves, `L ${last.x} ${last.y}`].join(" "); }
function composerDock(annotation: Annotation, source: AnnotationSource) { const bounds = annotationSelectorBounds(annotation.target.selector); return { horizontal: bounds.x + bounds.width / 2 > source.width * .75 ? "left" : "right", vertical: bounds.y < 48 ? "below" : bounds.y > source.height - 48 ? "above" : "center", bounds }; }
function dockStyle(dock: ReturnType<typeof composerDock>, source: AnnotationSource) { const left = dock.horizontal === "left" ? dock.bounds.x - 36 : dock.bounds.x + 36; const x = dock.horizontal === "left" ? "-100%" : "0"; const y = dock.vertical === "above" ? "-100%" : dock.vertical === "below" ? "0" : "-50%"; return { left: `${left / source.width * 100}%`, top: `${dock.bounds.y / source.height * 100}%`, transform: `translate(${x}, ${y})` }; }
function createdMessage(annotation: Annotation) { if (annotation.presentation.type === "reaction") return annotation.presentation.reaction === "like" ? "좋아요 스티커를 붙였습니다." : "싫어요 스티커를 붙였습니다."; return annotation.presentation.type === "marker" ? "위치 코멘트를 만들었습니다." : annotation.presentation.type === "outline" ? "영역 코멘트를 만들었습니다." : annotation.presentation.type === "stroke" ? "자유선 코멘트를 만들었습니다." : "화살표 코멘트를 만들었습니다."; }
