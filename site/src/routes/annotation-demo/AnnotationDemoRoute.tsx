import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { createJSONDocument } from "@interactive-os/json-document";
import {
  ANNOTATION_PROFILE_V1,
  assertAnnotationDocument,
  createAnnotationEditor,
  type Annotation,
  type AnnotationDocument,
  type AnnotationPoint,
  type AnnotationSource,
} from "@interactive-os/json-document-editing";
import { createGestureSession, type InteractionHandleDescriptor, type InteractionHandleEvent } from "@interactive-os/json-document-affordance";
import {
  createWebPointerSession,
  projectWebClientPointToSVG,
  readWebRasterFile,
  renderWebAnnotationRaster,
  webSVGViewportFromElement,
} from "@interactive-os/json-document-web";
import {
  ArrowUpRight,
  Download,
  ImagePlus,
  MessageSquare,
  MousePointer2,
  Pencil,
  Redo2,
  RotateCcw,
  Save,
  SendHorizontal,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { Command, Field, Tabs, Toggle, useInteractionHandle } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader } from "../../shared/ui/primitives";
import { ProductShell } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../shared/ui/styles";
import { CodeBlock } from "../../shared/ui/code-block";
import {
  initialAnnotationDocument,
} from "./annotation-state";
import { annotationDemoRecipe } from "./annotation-demo-styles";

type Tool = "select" | "comment" | "draw" | "arrow" | "like" | "dislike";
type Output = "structured" | "image";
type Gesture =
  | { readonly type: "create"; readonly tool: Exclude<Tool, "select" | "draw">; readonly start: AnnotationPoint; readonly current: AnnotationPoint }
  | { readonly type: "draw"; readonly points: ReadonlyArray<AnnotationPoint> }
  | { readonly type: "move"; readonly id: string; readonly start: AnnotationPoint; readonly current: AnnotationPoint }
  | { readonly type: "resize"; readonly id: string; readonly start: AnnotationPoint; readonly current: AnnotationPoint };

const accent = "rgb(var(--color-border-accent))";
const annotationDemoStyles = annotationDemoRecipe();

export function AnnotationDemoRoute() {
  const [documentSource] = useState(() => createJSONDocument(initialAnnotationDocument));
  const [editor] = useState(() => createAnnotationEditor(documentSource));
  useSyncExternalStore(editor.subscribe, () => editor.snapshot.revision, () => editor.snapshot.revision);
  const [tool, setTool] = useState<Tool>("comment");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [, setGestureRevision] = useState(0);
  const [gestureSession] = useState(() => createGestureSession<Gesture>({
    onBegin: () => setGestureRevision((revision) => revision + 1),
    onPreview: () => setGestureRevision((revision) => revision + 1),
    onCommit: () => setGestureRevision((revision) => revision + 1),
    onCancel: () => setGestureRevision((revision) => revision + 1),
  }));
  const [pointerSession] = useState(() => createWebPointerSession<{ readonly active: true }>());
  const [savedState, setSavedState] = useState<string | null>(null);
  const [output, setOutput] = useState<Output>("structured");
  const [renderedImage, setRenderedImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [announcement, setAnnouncement] = useState("클릭하거나 드래그해서 수정 코멘트를 남기세요.");
  const svgRef = useRef<SVGSVGElement>(null);
  const rasterUrlsRef = useRef(new Map<string, string>([[
    initialAnnotationDocument.sources[0]!.id,
    sitePath(initialAnnotationDocument.sources[0]!.src),
  ]]));
  const documentValue = editor.snapshot.value as AnnotationDocument;
  const selectedId = editor.snapshot.selection.primaryId;
  const selected = documentValue.annotations.find((annotation) => annotation.id === selectedId) ?? null;
  const source = documentValue.sources[0]!;
  const sourceUrl = rasterUrlsRef.current.get(source.id) ?? sourcePath(source.src);
  const gesture = gestureSession.getActive();

  useEffect(() => {
    if (output !== "image") return;
    let active = true;
    setRenderedImage(null);
    void renderWebAnnotationRaster({ document: documentValue, sourceId: source.id, sourceURL: sourceUrl, style: rasterStyle() }).then((result) => {
      if (active) setRenderedImage(result.ok ? result.dataURL : null);
    });
    return () => { active = false; };
  }, [output, documentValue, sourceUrl]);

  const structuredOutput = useMemo(() => presentStructuredSnapshot(documentValue, selectedId), [documentValue, selectedId]);
  const structuredDownloadUrl = useMemo(
    () => `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(structuredOutput, null, 2))}`,
    [structuredOutput],
  );

  function setSelected(selectedId: string | null) {
    editor.dispatch({ type: "selection.set", annotationId: selectedId, mode: "replace" });
  }

  function sendComment(annotation: Annotation, instruction: string) {
    const nextInstruction = instruction.trim();
    if (annotation.body.instruction === nextInstruction) {
      setTool("select");
      return;
    }
    editor.dispatch({ type: "annotation.body.set", annotationId: annotation.id, instruction: nextInstruction });
    setTool("select");
    setAnnouncement("수정 요청을 추가했습니다.");
  }

  function submitComment(annotation: Annotation, instruction: string) {
    sendComment(annotation, instruction);
    setEditingId(null);
  }

  function cancelComment(annotation: Annotation) {
    if (annotation.body.instruction === "") {
      editor.dispatch({ type: "annotation.delete", annotationId: annotation.id });
      setAnnouncement("작성 중인 요청을 취소했습니다.");
      setEditingId(null);
      return;
    }
    setSelected(null);
    setEditingId(null);
  }

  function chooseTool(nextTool: Tool) {
    setTool(nextTool);
    setEditingId(null);
    if (selectedId !== null) setSelected(null);
  }

  function deleteSelected() {
    if (selectedId === null) return;
    editor.dispatch({ type: "annotation.delete", annotationId: selectedId });
    setEditingId(null);
    setAnnouncement("선택한 annotation을 삭제했습니다.");
  }

  function handleCanvasPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget && (event.target as Element).closest("[data-annotation-id]")) return;
    const point = eventPoint(event);
    if (point === null) return;
    if (tool === "select") return setSelected(null);
    pointerSession.begin(event.currentTarget, event.pointerId, { active: true });
    if (tool === "draw") {
      gestureSession.begin({ type: "draw", points: [point] });
      return;
    }
    gestureSession.begin({ type: "create", tool, start: point, current: point });
  }

  function handleAnnotationInteraction(
    interaction: InteractionHandleEvent,
    event: PointerEvent<SVGElement>,
    annotation: Annotation,
    type: "move" | "resize",
  ) {
    if (interaction.phase === "start") {
      if (type === "move") {
        setEditingId(null);
        setPreviewId(null);
        setSelected(annotation.id);
        if (tool !== "select") return;
      }
      const start = eventPoint(event);
      if (start !== null) gestureSession.begin({ type, id: annotation.id, start, current: start });
      return;
    }
    if (interaction.phase === "cancel") {
      gestureSession.cancel("pointer-cancel");
      setAnnouncement("진행 중인 조작을 취소했습니다.");
      return;
    }
    const active = gestureSession.getActive();
    if (active?.type !== type || active.id !== annotation.id) return;
    const current = eventPoint(event);
    if (current === null) return;
    gestureSession.preview({ ...active, current });
    if (interaction.phase === "commit") commitActiveGesture();
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (gesture === null || pointerSession.getSnapshot()?.pointerId !== event.pointerId) return;
    const point = eventPoint(event);
    if (point === null) return;
    if (gesture.type === "draw") {
      const previous = gesture.points.at(-1);
      if (previous !== undefined && distance(previous, point) >= 4) {
        gestureSession.preview({ type: "draw", points: [...gesture.points, point] });
      }
      return;
    }
    if (gesture.type === "create") {
      gestureSession.preview({ ...gesture, current: point });
      return;
    }
    gestureSession.preview({ ...gesture, current: point });
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (pointerSession.commit(event.pointerId) === null) return;
    commitActiveGesture();
  }

  function commitActiveGesture() {
    const gesture = gestureSession.commit();
    if (gesture === null) return;
    if (gesture.type === "draw") {
      const annotation = createDrawAnnotation(source.id, gesture.points);
      if (annotation !== null) {
        editor.dispatch({ type: "annotation.create", annotation });
        setTool("select");
        setEditingId(annotation.presentation.type === "reaction" ? null : annotation.id);
        setAnnouncement("자유선 코멘트를 만들었습니다.");
      }
    } else if (gesture.type === "create") {
      const annotation = createAnnotation(source.id, gesture.tool, gesture.start, gesture.current);
      if (annotation !== null) {
        editor.dispatch({ type: "annotation.create", annotation });
        setTool("select");
        setEditingId(annotation.presentation.type === "reaction" ? null : annotation.id);
        setAnnouncement(annotationAnnouncement(annotation));
      }
    } else {
      const dx = gesture.current.x - gesture.start.x;
      const dy = gesture.current.y - gesture.start.y;
      if (gesture.type === "move" && Math.hypot(dx, dy) < 4) {
        const annotation = documentValue.annotations.find((item) => item.id === gesture.id);
        if (annotation !== undefined && annotation.presentation.type !== "reaction") setEditingId(gesture.id);
        return;
      }
      editor.dispatch(gesture.type === "move"
        ? { type: "annotation.move", annotationId: gesture.id, dx, dy }
        : { type: "annotation.resize", annotationId: gesture.id, handle: resizeHandle(documentValue, gesture.id), dx, dy });
      setAnnouncement(gesture.type === "move" ? "Annotation을 이동했습니다." : "Target을 resize했습니다.");
    }
  }

  function cancelPointerGesture(event: PointerEvent<SVGSVGElement>, reason: "pointer-cancel" | "lost-capture") {
    const cancelled = pointerSession.cancel(event.pointerId, reason === "lost-capture" ? "lost-capture" : "cancel");
    if (cancelled === null) return;
    gestureSession.cancel(reason);
    setAnnouncement("진행 중인 조작을 취소했습니다.");
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const command = event.metaKey || event.ctrlKey;
    if (command && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) editor.redo();
      else editor.undo();
      return;
    }
    if (!command) {
      const shortcutTool = toolFromShortcut(event.key);
      if (shortcutTool !== null) {
        event.preventDefault();
        chooseTool(shortcutTool);
        return;
      }
    }
    if (event.key === "Escape") {
      event.preventDefault();
      const pointer = pointerSession.getSnapshot();
      if (pointer !== null) pointerSession.cancel(pointer.pointerId);
      gestureSession.cancel("cancel");
      chooseTool("select");
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelected();
    }
  }

  function saveState() {
    setSavedState(JSON.stringify(documentValue));
    setAnnouncement("Structured annotation state를 저장했습니다.");
  }

  function restoreState() {
    if (savedState === null) return;
    const restored = JSON.parse(savedState) as AnnotationDocument;
    assertAnnotationDocument(restored);
    documentSource.commit([{ op: "replace", path: "", value: restored }]);
    setSelected(null);
    setAnnouncement("저장한 state에서 overlay를 복원했습니다.");
  }

  async function replaceImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) return;
    try {
      const raster = await readWebRasterFile(file);
      if (!raster.ok) throw new Error(raster.reason ?? raster.code);
      const nextSource: AnnotationSource = { id: `upload-${file.name}-${file.lastModified}`, src: file.name, width: raster.width, height: raster.height };
      const url = raster.dataURL;
      rasterUrlsRef.current.set(nextSource.id, url);
      documentSource.commit([{ op: "replace", path: "", value: {
        profile: ANNOTATION_PROFILE_V1,
        id: documentValue.id,
        sources: [nextSource],
        annotations: [],
      } }]);
      setZoom(1);
      setAnnouncement(`${file.name} 이미지로 교체했습니다.`);
    } catch {
      setAnnouncement("지원하는 raster 이미지를 불러오지 못했습니다.");
    }
  }

  async function downloadImage() {
    const result = await renderWebAnnotationRaster({ document: documentValue, sourceId: source.id, sourceURL: sourceUrl, style: rasterStyle() });
    if (!result.ok) { setAnnouncement("Annotation 이미지를 만들지 못했습니다."); return; }
    const link = document.createElement("a");
    link.href = result.dataURL;
    link.download = "annotation-request.png";
    link.click();
    setAnnouncement("Annotation이 적용된 이미지를 다운로드했습니다.");
  }

  return (
    <DemoPage documentation={(
      <PageHeader illustration="cursor" title="Annotation Hands Demo" aside={<p className={classes("m-0 text-right", ui.text.meta)} aria-live="polite">{announcement}</p>}>
        이미지 위에서 위치를 표시하고 수정 요청을 남겨 보세요.
      </PageHeader>
    )}>
      <ProductShell canvasClassName={annotationDemoStyles.productCanvas()}>
        <div className={annotationDemoStyles.canvasFrame()} style={{ aspectRatio: `${source.width} / ${source.height}` }}>
          <div className={annotationDemoStyles.stage()} style={{ width: `${zoom * 100}%` }}>
            <svg
              ref={svgRef}
              aria-label="Raster annotation canvas"
              className={classes(annotationDemoStyles.canvas(), tool === "select" ? "cursor-default" : "cursor-crosshair")}
              data-tool={tool}
              onKeyDown={handleKeyDown}
              onPointerDown={handleCanvasPointerDown}
              onLostPointerCapture={(event) => cancelPointerGesture(event, "lost-capture")}
              onPointerCancel={(event) => cancelPointerGesture(event, "pointer-cancel")}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              role="application"
              tabIndex={0}
              viewBox={`0 0 ${source.width} ${source.height}`}
            >
              <image href={sourceUrl} width={source.width} height={source.height} pointerEvents="none" />
              {documentValue.annotations.map((annotation, index) => (
                <AnnotationShape key={annotation.id} annotation={projectGestureAnnotation(annotation, gesture)} index={index + 1} selected={annotation.id === selectedId} onHandle={handleAnnotationInteraction} onPreviewChange={(visible) => setPreviewId(visible ? annotation.id : null)} />
              ))}
              {gesture?.type === "create" ? <DraftShape gesture={gesture} /> : null}
              {gesture?.type === "draw" ? <StrokeLine points={gesture.points} draft /> : null}
            </svg>
            {documentValue.annotations.map((annotation, index) => gesture === null && previewId === annotation.id && annotation.body.instruction.trim() !== "" && editingId !== annotation.id ? (
              <CommentPreview key={annotation.id} annotation={annotation} index={index + 1} source={source} />
            ) : null)}
            {selected && editingId === selected.id ? (
              <CommentComposer annotation={selected} index={documentValue.annotations.indexOf(selected) + 1} source={source} onCancel={() => cancelComment(selected)} onSave={(instruction) => sendComment(selected, instruction)} onSubmit={(instruction) => submitComment(selected, instruction)} />
            ) : null}
          </div>
          <nav aria-label="Annotation tools" className={annotationDemoStyles.toolDock()}>
            {(["select", "comment", "draw", "arrow", "like", "dislike"] as const).map((value) => (
              <Toggle label={toolLabel(value)} tooltip={`${toolLabel(value)} (${toolShortcut(value)})`} pressed={tool === value} className={annotationDemoStyles.dockButton()} key={value} onClick={() => chooseTool(value)}>
                <ToolIcon tool={value} />
              </Toggle>
            ))}
            <span className={annotationDemoStyles.dockDivider()} aria-hidden="true" />
            <Command label="Delete annotation" className={annotationDemoStyles.dockButton()} disabled={selected === null} onClick={deleteSelected}><Trash2 aria-hidden="true" size={16} /></Command>
            <Command label="Download annotated image" className={annotationDemoStyles.dockButton()} onClick={() => void downloadImage()}><Download aria-hidden="true" size={16} /></Command>
          </nav>
        </div>
      </ProductShell>
      <details className={classes("fixed bottom-4 right-4 z-50 max-h-[calc(100vh-2rem)] w-[min(34rem,calc(100vw-2rem))] overflow-auto p-3", ui.surface.overlay)}>
        <summary className={ui.interactive.link.prominent}>Annotation output</summary>
        <div className="mt-3">
          <OutputPanel
            canRestore={savedState !== null}
            onRestore={restoreState}
            onSave={saveState}
            output={output}
            setOutput={setOutput}
            structured={structuredOutput}
            structuredDownloadUrl={structuredDownloadUrl}
            renderedImage={renderedImage}
          />
        </div>
      </details>
    </DemoPage>
  );
}

function CommentComposer(props: {
  readonly annotation: Annotation;
  readonly index: number;
  readonly source: AnnotationSource;
  readonly onCancel: () => void;
  readonly onSave: (instruction: string) => void;
  readonly onSubmit: (instruction: string) => void;
}) {
  const [draft, setDraft] = useState(props.annotation.body.instruction);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setDraft(props.annotation.body.instruction), [props.annotation.id, props.annotation.body.instruction]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const input = inputRef.current;
      if (input === null) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
    return () => cancelAnimationFrame(frame);
  }, [props.annotation.id]);
  const dock = composerDock(props.annotation, props.source);
  return (
    <section
      aria-label={`Request ${props.index} comment`}
      className={annotationDemoStyles.commentCard()}
      data-side={`${dock.vertical}-${dock.horizontal}`}
      style={{
        left: `${(dock.anchor.x / props.source.width) * 100}%`,
        top: `${(dock.anchor.y / props.source.height) * 100}%`,
        transform: dockTransform(dock),
      }}
    >
      <Field
        controlRef={inputRef}
        label="Annotation instruction"
        multiline
        className={annotationDemoStyles.commentInput()}
        onBlur={() => {
          if (draft.trim() !== "") props.onSave(draft);
        }}
        onValueChange={setDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (draft.trim() !== "") props.onSubmit(draft);
          }
          if (event.key === "Escape") props.onCancel();
        }}
        placeholder="수정 요청을 입력하세요…"
        rows={1}
        value={draft}
      />
      <Command
        label="Send comment"
        rootClassName="shrink-0"
        className={annotationDemoStyles.sendButton()}
        disabled={draft.trim() === ""}
        onClick={() => props.onSubmit(draft)}
        onMouseDown={(event) => event.preventDefault()}
      >
        <SendHorizontal aria-hidden="true" size={15} />
      </Command>
    </section>
  );
}

function ToolIcon(props: { readonly tool: Tool }) {
  if (props.tool === "select") return <MousePointer2 aria-hidden="true" size={16} />;
  if (props.tool === "comment") return <MessageSquare aria-hidden="true" size={16} />;
  if (props.tool === "draw") return <Pencil aria-hidden="true" size={16} />;
  if (props.tool === "like") return <ThumbsUp aria-hidden="true" size={16} />;
  if (props.tool === "dislike") return <ThumbsDown aria-hidden="true" size={16} />;
  return <ArrowUpRight aria-hidden="true" size={16} />;
}

function CommentPreview(props: { readonly annotation: Annotation; readonly index: number; readonly source: AnnotationSource }) {
  const dock = composerDock(props.annotation, props.source);
  return (
    <div
      aria-label={`Comment ${props.index} preview`}
      className={annotationDemoStyles.commentPreview()}
      role="tooltip"
      style={{
        left: `${(dock.anchor.x / props.source.width) * 100}%`,
        top: `${(dock.anchor.y / props.source.height) * 100}%`,
        transform: dockTransform(dock),
      }}
    >
      {props.annotation.body.instruction}
    </div>
  );
}

function AnnotationShape(props: {
  readonly annotation: Annotation;
  readonly index: number;
  readonly selected: boolean;
  readonly onHandle: (interaction: InteractionHandleEvent, event: PointerEvent<SVGElement>, annotation: Annotation, type: "move" | "resize") => void;
  readonly onPreviewChange: (visible: boolean) => void;
}) {
  const { annotation } = props;
  const drag = useInteractionHandle<SVGGElement>({
    descriptor: { kind: "drag", cursor: { idle: "move", active: "grabbing" } },
    onHandle: (interaction, event) => props.onHandle(interaction, event, annotation, "move"),
  });
  const selector = annotation.target.selector;
  const bounds = annotationBounds(annotation);
  const common = {
    fill: "none",
    stroke: accent,
    strokeWidth: props.selected ? 6 : 4,
    vectorEffect: "non-scaling-stroke" as const,
  };
  return (
    <g
      aria-label={`Annotation ${props.index}: ${annotation.body.instruction}`}
      data-annotation-id={annotation.id}
      data-selected={props.selected ? "true" : "false"}
      onBlur={() => props.onPreviewChange(false)}
      onFocus={() => props.onPreviewChange(true)}
      onPointerEnter={() => props.onPreviewChange(true)}
      onPointerLeave={() => props.onPreviewChange(false)}
      {...drag.handleProps}
      role="button"
      tabIndex={0}
      style={{ cursor: drag.cursor }}
    >
      {annotation.presentation.type === "marker" && selector.type === "point" ? (
        <CommentNumberBadge index={props.index} point={selector} selected={props.selected} />
      ) : null}
      {annotation.presentation.type === "reaction" && selector.type === "point" ? (
        <ReactionSticker point={selector} reaction={annotation.presentation.reaction} selected={props.selected} />
      ) : null}
      {annotation.presentation.type === "outline" && selector.type === "rectangle" ? (
        <>
          <rect {...common} {...selector} fill="transparent" />
          {props.selected ? (
            <AnnotationPointHandle
              aria-label="Resize rectangle"
              cx={selector.x + selector.width}
              cy={selector.y + selector.height}
              descriptor={{ kind: "resize", edge: "se", cursor: { idle: "nwse-resize" } }}
              onHandle={(interaction, event) => props.onHandle(interaction, event, annotation, "resize")}
            />
          ) : null}
        </>
      ) : null}
      {annotation.presentation.type === "stroke" && selector.type === "path" ? (
        <>
          <StrokeLine points={selector.points} selected={props.selected} />
          {props.selected ? (
            <AnnotationPointHandle aria-label="Resize drawing" cx={bounds.x + bounds.width} cy={bounds.y + bounds.height} descriptor={{ kind: "resize", edge: "se", cursor: { idle: "nwse-resize" } }} onHandle={(interaction, event) => props.onHandle(interaction, event, annotation, "resize")} />
          ) : null}
        </>
      ) : null}
      {annotation.presentation.type === "arrow" && selector.type === "arrow" ? (
        <>
          <ArrowLine from={selector.from} to={selector.to} selected={props.selected} />
          {props.selected ? (
            <AnnotationPointHandle
              aria-label="Resize arrow"
              cx={selector.to.x}
              cy={selector.to.y}
              descriptor={{ kind: "control" }}
              onHandle={(interaction, event) => props.onHandle(interaction, event, annotation, "resize")}
            />
          ) : null}
        </>
      ) : null}
      {annotation.presentation.type !== "marker" && annotation.presentation.type !== "reaction" ? (
        <CommentNumberBadge index={props.index} point={bounds} selected={props.selected} />
      ) : null}
    </g>
  );
}

function AnnotationPointHandle(props: {
  readonly "aria-label": string;
  readonly cx: number;
  readonly cy: number;
  readonly descriptor: InteractionHandleDescriptor;
  readonly onHandle: (interaction: InteractionHandleEvent, event: PointerEvent<SVGCircleElement>) => void;
}) {
  const binding = useInteractionHandle<SVGCircleElement>({ descriptor: props.descriptor, onHandle: props.onHandle });
  return <circle {...binding.handleProps} aria-label={props["aria-label"]} cx={props.cx} cy={props.cy} r="15" fill={accent} style={{ cursor: binding.cursor }} />;
}

function CommentNumberBadge(props: { readonly index: number; readonly point: AnnotationPoint; readonly selected: boolean }) {
  return (
    <g>
      <path d={commentBubblePath(props.point)} fill={accent} stroke="white" strokeWidth={props.selected ? 6 : 0} vectorEffect="non-scaling-stroke" />
      <text x={props.point.x} y={props.point.y + 1} fill="white" fontSize="22" fontWeight="700" textAnchor="middle" dominantBaseline="middle">{props.index}</text>
    </g>
  );
}

function commentBubblePath(point: AnnotationPoint): string {
  const { x, y } = point;
  return `M ${x} ${y - 24} C ${x + 13.25} ${y - 24} ${x + 24} ${y - 13.25} ${x + 24} ${y} C ${x + 24} ${y + 13.25} ${x + 13.25} ${y + 24} ${x} ${y + 24} L ${x - 24} ${y + 24} L ${x - 24} ${y} C ${x - 24} ${y - 13.25} ${x - 13.25} ${y - 24} ${x} ${y - 24} Z`;
}

function StrokeLine(props: {
  readonly points: ReadonlyArray<AnnotationPoint>;
  readonly selected?: boolean;
  readonly draft?: boolean;
}) {
  const first = props.points[0];
  if (first === undefined) return null;
  const path = strokePathData(props.points);
  return (
    <path
      d={path}
      fill="none"
      opacity={props.draft ? 0.7 : 1}
      stroke={accent}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.selected ? 12 : 9}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function strokePathData(points: ReadonlyArray<AnnotationPoint>): string {
  const first = points[0];
  if (first === undefined) return "";
  if (points.length === 2) {
    const last = points[1] ?? first;
    return `M ${first.x} ${first.y} L ${last.x} ${last.y}`;
  }
  const curves = points.slice(1, -1).map((point, index) => {
    const next = points[index + 2] ?? point;
    return `Q ${point.x} ${point.y} ${(point.x + next.x) / 2} ${(point.y + next.y) / 2}`;
  });
  const last = points.at(-1) ?? first;
  return [`M ${first.x} ${first.y}`, ...curves, `L ${last.x} ${last.y}`].join(" ");
}

function ArrowLine(props: { readonly from: AnnotationPoint; readonly to: AnnotationPoint; readonly selected: boolean }) {
  const angle = Math.atan2(props.to.y - props.from.y, props.to.x - props.from.x);
  const head = 34;
  const left = { x: props.to.x - head * Math.cos(angle - Math.PI / 6), y: props.to.y - head * Math.sin(angle - Math.PI / 6) };
  const right = { x: props.to.x - head * Math.cos(angle + Math.PI / 6), y: props.to.y - head * Math.sin(angle + Math.PI / 6) };
  return (
    <path
      d={`M ${props.from.x} ${props.from.y} L ${props.to.x} ${props.to.y} M ${left.x} ${left.y} L ${props.to.x} ${props.to.y} L ${right.x} ${right.y}`}
      fill="none"
      stroke={accent}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.selected ? 10 : 8}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function DraftShape({ gesture }: { readonly gesture: Extract<Gesture, { type: "create" }> }) {
  if (gesture.tool === "like" || gesture.tool === "dislike") return <ReactionSticker point={gesture.start} reaction={gesture.tool} selected={false} draft />;
  if (gesture.tool === "arrow") return <ArrowLine from={gesture.start} to={gesture.current} selected />;
  if (distance(gesture.start, gesture.current) < 16) {
    return <circle cx={gesture.start.x} cy={gesture.start.y} r="32" fill={accent} opacity="0.7" />;
  }
  const rectangle = rectangleFromPoints(gesture.start, gesture.current);
  return <rect {...rectangle} fill="transparent" stroke={accent} strokeDasharray="18 12" strokeWidth="8" />;
}

function ReactionSticker(props: { readonly point: AnnotationPoint; readonly reaction: "like" | "dislike"; readonly selected: boolean; readonly draft?: boolean }) {
  const Icon = props.reaction === "like" ? ThumbsUp : ThumbsDown;
  return (
    <g aria-label={props.reaction === "like" ? "Like sticker" : "Dislike sticker"} opacity={props.draft ? 0.7 : 1} style={{ filter: "drop-shadow(0 4px 3px rgb(var(--color-foreground-strong) / 0.24))" }}>
      <circle cx={props.point.x} cy={props.point.y} r="29" fill="white" stroke="white" strokeWidth={props.selected ? 12 : 9} vectorEffect="non-scaling-stroke" />
      <circle cx={props.point.x} cy={props.point.y} r="28" fill="white" stroke={accent} strokeWidth={props.selected ? 5 : 3} vectorEffect="non-scaling-stroke" />
      <Icon x={props.point.x - 15} y={props.point.y - 15} width="30" height="30" color={accent} fill="none" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function OutputPanel(props: {
  readonly canRestore: boolean;
  readonly onRestore: () => void;
  readonly onSave: () => void;
  readonly output: Output;
  readonly setOutput: (output: Output) => void;
  readonly structured: unknown;
  readonly structuredDownloadUrl: string;
  readonly renderedImage: string | null;
}) {
  return (
    <section aria-label="Annotation output" className="grid gap-3">
      <Tabs
        className="flex flex-wrap gap-1"
        label="Output format"
        value={props.output}
        options={[{ id: "structured", label: "Structured" }, { id: "image", label: "Image" }]}
        onValueChange={props.setOutput}
        tabId={(value) => `annotation-output-tab-${value}`}
        panelId={(value) => `annotation-output-panel-${value}`}
      />
      {props.output === "structured" ? (
        <div id="annotation-output-panel-structured" role="tabpanel" aria-labelledby="annotation-output-tab-structured" className="grid gap-2">
          <div className="flex flex-wrap gap-1">
            <Command label="Save state" onClick={props.onSave}><Save aria-hidden="true" size={16} /></Command>
            <Command label="Restore state" disabled={!props.canRestore} onClick={props.onRestore}><RotateCcw aria-hidden="true" size={16} /></Command>
            <a className={ui.interactive.link.prominent} download="annotation-request.json" href={props.structuredDownloadUrl}>Download JSON</a>
          </div>
          <CodeBlock
            className={annotationDemoStyles.structuredOutput()}
            label="Annotation structured JSON"
            language="json"
            size="compact"
            source={JSON.stringify(props.structured, null, 2)}
            testId="annotation-structured-output"
          />
        </div>
      ) : props.renderedImage === null ? (
        <p id="annotation-output-panel-image" role="tabpanel" aria-labelledby="annotation-output-tab-image" className={classes("m-0", ui.text.meta)}>Rasterizing…</p>
      ) : (
        <div id="annotation-output-panel-image" role="tabpanel" aria-labelledby="annotation-output-tab-image" className="grid gap-2">
          <img data-testid="annotation-image-output" src={props.renderedImage} alt="원본과 annotation이 합성된 결과" className="block h-auto max-h-64 max-w-full" />
          <a className={ui.interactive.link.prominent} href={props.renderedImage} download="annotation-request.png">Download PNG</a>
        </div>
      )}
    </section>
  );
}

function createAnnotation(
  sourceId: string,
  kind: Exclude<Tool, "select" | "draw">,
  start: AnnotationPoint,
  end: AnnotationPoint,
): Annotation | null {
  const id = `annotation-${crypto.randomUUID()}`;
  if (kind === "like" || kind === "dislike") {
    return { id, target: { sourceId, selector: { type: "point", ...start } }, body: { instruction: "" }, presentation: { type: "reaction", reaction: kind } };
  }
  if (kind === "comment") {
    if (distance(start, end) < 16) return { id, target: { sourceId, selector: { type: "point", ...start } }, body: { instruction: "" }, presentation: { type: "marker" } };
    return { id, target: { sourceId, selector: { type: "rectangle", ...rectangleFromPoints(start, end) } }, body: { instruction: "" }, presentation: { type: "outline" } };
  }
  if (distance(start, end) < 8) return null;
  return { id, target: { sourceId, selector: { type: "arrow", from: start, to: end } }, body: { instruction: "" }, presentation: { type: "arrow" } };
}

function createDrawAnnotation(sourceId: string, points: ReadonlyArray<AnnotationPoint>): Annotation | null {
  if (points.length < 2 || pathLength(points) < 16) return null;
  return {
    id: `annotation-${crypto.randomUUID()}`,
    target: { sourceId, selector: { type: "path", points } },
    body: { instruction: "" },
    presentation: { type: "stroke" },
  };
}

function composerDock(annotation: Annotation, source: AnnotationSource) {
  const bounds = annotationBounds(annotation);
  const horizontal = bounds.x + bounds.width / 2 > source.width * 0.75 ? "left" : "right";
  const vertical = bounds.y < 48 ? "below" : bounds.y > source.height - 48 ? "above" : "center";
  return {
    horizontal,
    vertical,
    anchor: {
      type: "point" as const,
      x: horizontal === "left" ? bounds.x - 36 : bounds.x + 36,
      y: bounds.y,
    },
  };
}

function dockTransform(dock: ReturnType<typeof composerDock>): string {
  const horizontal = dock.horizontal === "left" ? "-100%" : "0";
  const vertical = dock.vertical === "above" ? "-100%" : dock.vertical === "below" ? "0" : "-50%";
  return `translate(${horizontal}, ${vertical})`;
}

function annotationBounds(annotation: Annotation) {
  const selector = annotation.target.selector;
  if (selector.type === "arrow") return rectangleFromPoints(selector.from, selector.to);
  if (selector.type === "rectangle") return selector;
  if (selector.type === "path") {
    const xs = selector.points.map((point) => point.x); const ys = selector.points.map((point) => point.y);
    return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }
  return { x: selector.x, y: selector.y, width: 0, height: 0 };
}

function eventPoint(event: PointerEvent<SVGElement>): AnnotationPoint | null {
  const svg = event.currentTarget.ownerSVGElement ?? event.currentTarget as SVGSVGElement;
  const projected = projectWebClientPointToSVG(
    { x: event.clientX, y: event.clientY },
    webSVGViewportFromElement(svg),
  );
  return projected === null ? null : { x: projected.x, y: projected.y };
}

function rectangleFromPoints(start: AnnotationPoint, end: AnnotationPoint) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function distance(start: AnnotationPoint, end: AnnotationPoint): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function pathLength(points: ReadonlyArray<AnnotationPoint>): number {
  return points.slice(1).reduce((total, point, index) => total + distance(points[index] ?? point, point), 0);
}

function toolLabel(tool: Tool): string {
  return ({ select: "Select", comment: "Comment", draw: "Draw", arrow: "Arrow", like: "Like", dislike: "Dislike" })[tool];
}

function toolShortcut(tool: Tool): string {
  return ({ select: "V", comment: "C", draw: "D", arrow: "A", like: "L", dislike: "K" })[tool];
}

function toolFromShortcut(key: string): Tool | null {
  const normalized = key.toLowerCase();
  if (normalized === "v") return "select";
  if (normalized === "c") return "comment";
  if (normalized === "d") return "draw";
  if (normalized === "a") return "arrow";
  if (normalized === "l") return "like";
  if (normalized === "k") return "dislike";
  return null;
}

function annotationAnnouncement(annotation: Annotation): string {
  if (annotation.presentation.type === "reaction") return annotation.presentation.reaction === "like" ? "좋아요 스티커를 붙였습니다." : "싫어요 스티커를 붙였습니다.";
  if (annotation.presentation.type === "marker") return "위치 코멘트를 만들었습니다.";
  if (annotation.presentation.type === "outline") return "영역 코멘트를 만들었습니다.";
  if (annotation.presentation.type === "stroke") return "자유선 코멘트를 만들었습니다.";
  return "화살표 코멘트를 만들었습니다.";
}

function markLabel(annotation: Annotation): string {
  if (annotation.presentation.type === "reaction") return annotation.presentation.reaction === "like" ? "Like" : "Dislike";
  if (annotation.presentation.type === "marker") return "Point";
  if (annotation.presentation.type === "outline") return "Area";
  if (annotation.presentation.type === "stroke") return "Draw";
  return "Arrow";
}

function sitePath(path: string): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${basePath}${path}` || "/";
}

function sourcePath(path: string): string {
  return path.startsWith("data:") ? path : sitePath(path);
}

function presentStructuredSnapshot(document: AnnotationDocument, selectedId: string | null) {
  return {
    ...document,
    selection: { kind: "annotation", ids: selectedId === null ? [] : [selectedId], primaryId: selectedId },
  };
}

function resizeHandle(document: AnnotationDocument, annotationId: string): "end" | "south-east" {
  return document.annotations.find((item) => item.id === annotationId)?.target.selector.type === "arrow" ? "end" : "south-east";
}

function projectGestureAnnotation(annotation: Annotation, gesture: Gesture | null): Annotation {
  if (gesture === null || (gesture.type !== "move" && gesture.type !== "resize") || gesture.id !== annotation.id) return annotation;
  const dx = gesture.current.x - gesture.start.x;
  const dy = gesture.current.y - gesture.start.y;
  const selector = annotation.target.selector;
  if (gesture.type === "move") {
    const point = (value: AnnotationPoint) => ({ x: value.x + dx, y: value.y + dy });
    const moved = selector.type === "point" || selector.type === "rectangle" ? { ...selector, ...point(selector) }
      : selector.type === "path" ? { ...selector, points: selector.points.map(point) }
        : { ...selector, from: point(selector.from), to: point(selector.to) };
    return { ...annotation, target: { ...annotation.target, selector: moved } };
  }
  if (selector.type === "rectangle") {
    return { ...annotation, target: { ...annotation.target, selector: { ...selector, width: Math.max(1, selector.width + dx), height: Math.max(1, selector.height + dy) } } };
  }
  if (selector.type === "path") {
    const bounds = annotationBounds(annotation);
    const width = Math.max(1, bounds.width); const height = Math.max(1, bounds.height);
    const scaleX = Math.max(1, width + dx) / width; const scaleY = Math.max(1, height + dy) / height;
    return { ...annotation, target: { ...annotation.target, selector: { ...selector, points: selector.points.map((point) => ({ x: bounds.x + (point.x - bounds.x) * scaleX, y: bounds.y + (point.y - bounds.y) * scaleY })) } } };
  }
  if (selector.type === "arrow") {
    const to = { x: selector.to.x + dx, y: selector.to.y + dy };
    return { ...annotation, target: { ...annotation.target, selector: { ...selector, to } } };
  }
  return annotation;
}

function rasterStyle() {
  const color = getComputedStyle(document.documentElement).getPropertyValue("--color-border-accent").trim();
  const accentColor = ["rgb", "(", color, ")"].join("");
  return { stroke: accentColor, fill: accentColor, lineWidth: 8, labelFont: "700 30px system-ui, sans-serif" };
}
