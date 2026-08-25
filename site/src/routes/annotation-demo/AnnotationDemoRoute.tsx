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
import {
  ArrowUpRight,
  Download,
  ImagePlus,
  MessageSquare,
  MousePointer2,
  Pencil,
  Redo2,
  Send,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { ActionButton, IconButton, ToggleButton } from "../../shared/ui/interactive";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import {
  initialAnnotationDocument,
  renderAnnotationImage,
} from "./annotation-state";
import { annotationDemoRecipe } from "./annotation-demo-styles";

type Tool = "select" | "comment" | "draw" | "arrow";
type Output = "structured" | "image";
type Gesture =
  | { readonly type: "create"; readonly tool: "comment" | "arrow"; readonly start: AnnotationPoint; readonly current: AnnotationPoint }
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
  const [gesture, setGesture] = useState<Gesture | null>(null);
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

  useEffect(() => {
    if (output !== "image") return;
    let active = true;
    setRenderedImage(null);
    void renderAnnotationImage(documentValue, sourceUrl).then((url) => {
      if (active) setRenderedImage(url);
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
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === "select") return setSelected(null);
    if (tool === "draw") {
      setGesture({ type: "draw", points: [point] });
      return;
    }
    setGesture({ type: "create", tool, start: point, current: point });
  }

  function handleAnnotationPointerDown(event: PointerEvent<SVGGElement>, annotation: Annotation) {
    event.stopPropagation();
    setEditingId(annotation.id);
    if (tool !== "select") {
      setSelected(annotation.id);
      return;
    }
    const svg = svgRef.current;
    if (svg === null) return;
    svg.setPointerCapture(event.pointerId);
    setSelected(annotation.id);
    const start = eventPoint(event);
    setGesture({ type: "move", id: annotation.id, start, current: start });
  }

  function handleResizePointerDown(event: PointerEvent<SVGCircleElement>, annotation: Annotation) {
    event.stopPropagation();
    const svg = svgRef.current;
    if (svg === null) return;
    svg.setPointerCapture(event.pointerId);
    const start = eventPoint(event);
    setGesture({ type: "resize", id: annotation.id, start, current: start });
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (gesture === null) return;
    const point = eventPoint(event);
    if (gesture.type === "draw") {
      const previous = gesture.points.at(-1);
      if (previous !== undefined && distance(previous, point) >= 4) {
        setGesture({ type: "draw", points: [...gesture.points, point] });
      }
      return;
    }
    if (gesture.type === "create") {
      setGesture({ ...gesture, current: point });
      return;
    }
    setGesture({ ...gesture, current: point });
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (gesture === null) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (gesture.type === "draw") {
      const annotation = createDrawAnnotation(source.id, gesture.points);
      if (annotation !== null) {
        editor.dispatch({ type: "annotation.create", annotation });
        setTool("select");
        setEditingId(annotation.id);
        setAnnouncement("자유선 코멘트를 만들었습니다.");
      }
    } else if (gesture.type === "create") {
      const annotation = createAnnotation(source.id, gesture.tool, gesture.start, gesture.current);
      if (annotation !== null) {
        editor.dispatch({ type: "annotation.create", annotation });
        setTool("select");
        setEditingId(annotation.id);
        setAnnouncement(annotationAnnouncement(annotation));
      }
    } else {
      const dx = gesture.current.x - gesture.start.x;
      const dy = gesture.current.y - gesture.start.y;
      editor.dispatch(gesture.type === "move"
        ? { type: "annotation.move", annotationId: gesture.id, dx, dy }
        : { type: "annotation.resize", annotationId: gesture.id, handle: resizeHandle(documentValue, gesture.id), dx, dy });
      setAnnouncement(gesture.type === "move" ? "Annotation을 이동했습니다." : "Target을 resize했습니다.");
    }
    setGesture(null);
  }

  function handlePointerCancel(event: PointerEvent<SVGSVGElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setGesture(null);
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
      const { source: nextSource, url } = await readRasterSource(file);
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
    const url = await renderAnnotationImage(documentValue, sourceUrl);
    const link = document.createElement("a");
    link.href = url;
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
      <ProductApp canvasClassName={annotationDemoStyles.productCanvas()}>
        <div className={annotationDemoStyles.canvasFrame()} style={{ aspectRatio: `${source.width} / ${source.height}` }}>
          <div className={annotationDemoStyles.stage()} style={{ width: `${zoom * 100}%` }}>
            <svg
              ref={svgRef}
              aria-label="Raster annotation canvas"
              className={classes(annotationDemoStyles.canvas(), tool === "select" ? "cursor-default" : "cursor-crosshair")}
              data-tool={tool}
              onKeyDown={handleKeyDown}
              onPointerDown={handleCanvasPointerDown}
              onPointerCancel={handlePointerCancel}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              role="application"
              tabIndex={0}
              viewBox={`0 0 ${source.width} ${source.height}`}
            >
              <image href={sourceUrl} width={source.width} height={source.height} pointerEvents="none" />
              {documentValue.annotations.map((annotation, index) => (
                <AnnotationShape key={annotation.id} annotation={annotation} index={index + 1} selected={annotation.id === selectedId} onPointerDown={handleAnnotationPointerDown} onResizePointerDown={handleResizePointerDown} />
              ))}
              {gesture?.type === "create" ? <DraftShape gesture={gesture} /> : null}
              {gesture?.type === "draw" ? <StrokeLine points={gesture.points} draft /> : null}
            </svg>
            {selected && editingId === selected.id ? (
              <CommentComposer annotation={selected} index={documentValue.annotations.indexOf(selected) + 1} source={source} onCancel={() => cancelComment(selected)} onSave={(instruction) => sendComment(selected, instruction)} onSubmit={(instruction) => submitComment(selected, instruction)} />
            ) : null}
          </div>
          <nav aria-label="Annotation tools" className={annotationDemoStyles.toolDock()}>
            {(["select", "comment", "draw", "arrow"] as const).map((value) => (
              <button aria-label={toolLabel(value)} aria-pressed={tool === value} className={annotationDemoStyles.dockButton()} key={value} onClick={() => chooseTool(value)} title={`${toolLabel(value)} (${toolShortcut(value)})`} type="button">
                <ToolIcon tool={value} />
              </button>
            ))}
            <span className={annotationDemoStyles.dockDivider()} aria-hidden="true" />
            <button aria-label="Delete annotation" className={annotationDemoStyles.dockButton()} disabled={selected === null} onClick={deleteSelected} type="button"><Trash2 aria-hidden="true" size={16} /></button>
            <button aria-label="Download annotated image" className={annotationDemoStyles.dockButton()} onClick={() => void downloadImage()} type="button"><Download aria-hidden="true" size={16} /></button>
          </nav>
          <output className="sr-only" data-testid="annotation-structured-output">
            {JSON.stringify(presentStructuredSnapshot(documentValue, selectedId))}
          </output>
        </div>
      </ProductApp>
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
  const dock = annotationDock(props.annotation, props.source);
  const opensLeft = dock.horizontal === "left";
  const opensAbove = dock.vertical === "above";
  const tailStyle = opensAbove
    ? opensLeft ? annotationDemoStyles.commentTailAboveLeft() : annotationDemoStyles.commentTailAboveRight()
    : opensLeft ? annotationDemoStyles.commentTailBelowLeft() : annotationDemoStyles.commentTailBelowRight();
  return (
    <section
      aria-label={`Request ${props.index} comment`}
      className={annotationDemoStyles.commentCard()}
      data-side={`${dock.vertical}-${dock.horizontal}`}
      style={{
        left: `${(dock.anchor.x / props.source.width) * 100}%`,
        top: `${(dock.anchor.y / props.source.height) * 100}%`,
        transform: `translate(${opensLeft ? "-100%" : "0"}, ${opensAbove ? "-100%" : "0"})`,
      }}
    >
      <span className={tailStyle} aria-hidden="true" />
      <textarea
        ref={inputRef}
        aria-label="Annotation instruction"
        className={classes(ui.field.control, annotationDemoStyles.commentInput())}
        onBlur={() => {
          if (draft.trim() !== "") props.onSave(draft);
        }}
        onChange={(event) => setDraft(event.target.value)}
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
      <ActionButton
        aria-label="Send comment"
        className={annotationDemoStyles.sendButton()}
        disabled={draft.trim() === ""}
        kind="primary"
        onClick={() => props.onSubmit(draft)}
        onMouseDown={(event) => event.preventDefault()}
        title="Send comment"
      >
        <Send aria-hidden="true" size={15} />
      </ActionButton>
    </section>
  );
}

function ToolIcon(props: { readonly tool: Tool }) {
  if (props.tool === "select") return <MousePointer2 aria-hidden="true" size={16} />;
  if (props.tool === "comment") return <MessageSquare aria-hidden="true" size={16} />;
  if (props.tool === "draw") return <Pencil aria-hidden="true" size={16} />;
  return <ArrowUpRight aria-hidden="true" size={16} />;
}

function AnnotationShape(props: {
  readonly annotation: Annotation;
  readonly index: number;
  readonly selected: boolean;
  readonly onPointerDown: (event: PointerEvent<SVGGElement>, annotation: Annotation) => void;
  readonly onResizePointerDown: (event: PointerEvent<SVGCircleElement>, annotation: Annotation) => void;
}) {
  const { annotation } = props;
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
      onPointerDown={(event) => props.onPointerDown(event, annotation)}
      role="button"
      style={{ cursor: "move" }}
    >
      {annotation.presentation.type === "marker" && selector.type === "point" ? (
        <>
          <rect
            x={selector.x + 10}
            y={selector.y + 10}
            width="16"
            height="16"
            fill={accent}
            transform={`rotate(45 ${selector.x + 18} ${selector.y + 18})`}
          />
          <circle cx={selector.x} cy={selector.y} r="24" fill={accent} />
          <text x={selector.x} y={selector.y + 1} fill="white" fontSize="24" fontWeight="700" textAnchor="middle" dominantBaseline="middle">
            {props.index}
          </text>
        </>
      ) : null}
      {annotation.presentation.type === "outline" && selector.type === "rectangle" ? (
        <>
          <rect {...common} {...selector} fill="transparent" />
          {props.selected ? (
            <circle
              aria-label="Resize rectangle"
              cx={selector.x + selector.width}
              cy={selector.y + selector.height}
              r="15"
              fill={accent}
              onPointerDown={(event) => props.onResizePointerDown(event, annotation)}
              style={{ cursor: "nwse-resize" }}
            />
          ) : null}
        </>
      ) : null}
      {annotation.presentation.type === "stroke" && selector.type === "path" ? (
        <>
          <StrokeLine points={selector.points} selected={props.selected} />
          {props.selected ? (
            <circle aria-label="Resize drawing" cx={bounds.x + bounds.width} cy={bounds.y + bounds.height} r="15" fill={accent} onPointerDown={(event) => props.onResizePointerDown(event, annotation)} style={{ cursor: "nwse-resize" }} />
          ) : null}
        </>
      ) : null}
      {annotation.presentation.type === "arrow" && selector.type === "arrow" ? (
        <>
          <ArrowLine from={selector.from} to={selector.to} selected={props.selected} />
          {props.selected ? (
            <circle
              aria-label="Resize arrow"
              cx={selector.to.x}
              cy={selector.to.y}
              r="15"
              fill={accent}
              onPointerDown={(event) => props.onResizePointerDown(event, annotation)}
              style={{ cursor: "crosshair" }}
            />
          ) : null}
        </>
      ) : null}
      {annotation.presentation.type !== "marker" ? (
        <>
          <rect x={bounds.x - 19} y={bounds.y - 19} width="38" height="38" rx="8" fill={accent} stroke="white" strokeWidth={props.selected ? 6 : 0} vectorEffect="non-scaling-stroke" />
          <text x={bounds.x} y={bounds.y + 1} fill="white" fontSize="22" fontWeight="700" textAnchor="middle" dominantBaseline="middle">{props.index}</text>
        </>
      ) : null}
    </g>
  );
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
  if (gesture.tool === "arrow") return <ArrowLine from={gesture.start} to={gesture.current} selected />;
  if (distance(gesture.start, gesture.current) < 16) {
    return <circle cx={gesture.start.x} cy={gesture.start.y} r="32" fill={accent} opacity="0.7" />;
  }
  const rectangle = rectangleFromPoints(gesture.start, gesture.current);
  return <rect {...rectangle} fill="transparent" stroke={accent} strokeDasharray="18 12" strokeWidth="8" />;
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
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Output format">
        <ToggleButton role="tab" pressed={props.output === "structured"} aria-selected={props.output === "structured"} onClick={() => props.setOutput("structured")}>Structured</ToggleButton>
        <ToggleButton role="tab" pressed={props.output === "image"} aria-selected={props.output === "image"} onClick={() => props.setOutput("image")}>Image</ToggleButton>
      </div>
      {props.output === "structured" ? (
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-1">
            <ActionButton onClick={props.onSave}>Save state</ActionButton>
            <ActionButton disabled={!props.canRestore} onClick={props.onRestore}>Restore state</ActionButton>
            <a className={ui.interactive.link.prominent} download="annotation-request.json" href={props.structuredDownloadUrl}>Download JSON</a>
          </div>
          <pre data-testid="annotation-structured-output" className={classes(annotationDemoStyles.structuredOutput(), ui.surface.inset)}>
            {JSON.stringify(props.structured, null, 2)}
          </pre>
        </div>
      ) : props.renderedImage === null ? (
        <p className={classes("m-0", ui.text.meta)}>Rasterizing…</p>
      ) : (
        <div className="grid gap-2">
          <img data-testid="annotation-image-output" src={props.renderedImage} alt="원본과 annotation이 합성된 결과" className="block h-auto max-h-64 max-w-full" />
          <a className={ui.interactive.link.prominent} href={props.renderedImage} download="annotation-request.png">Download PNG</a>
        </div>
      )}
    </section>
  );
}

function createAnnotation(
  sourceId: string,
  kind: "comment" | "arrow",
  start: AnnotationPoint,
  end: AnnotationPoint,
): Annotation | null {
  const id = `annotation-${crypto.randomUUID()}`;
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

function annotationDock(annotation: Annotation, source: AnnotationSource) {
  const bounds = annotationBounds(annotation);
  const horizontal = bounds.x + bounds.width / 2 >= source.width / 2 ? "left" : "right";
  const vertical = bounds.y + bounds.height / 2 >= source.height / 2 ? "above" : "below";
  const pointOffset = annotation.target.selector.type === "point" ? 24 : 0;
  return {
    horizontal,
    vertical,
    anchor: {
      type: "point" as const,
      x: horizontal === "left" ? bounds.x - pointOffset : bounds.x + bounds.width + pointOffset,
      y: vertical === "above" ? bounds.y - pointOffset : bounds.y + bounds.height + pointOffset,
    },
  };
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

function eventPoint(event: PointerEvent<SVGElement>): AnnotationPoint {
  const svg = event.currentTarget.ownerSVGElement ?? event.currentTarget as SVGSVGElement;
  const bounds = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * viewBox.width,
    y: ((event.clientY - bounds.top) / bounds.height) * viewBox.height,
  };
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
  return ({ select: "Select", comment: "Comment", draw: "Draw", arrow: "Arrow" })[tool];
}

function toolShortcut(tool: Tool): string {
  return ({ select: "V", comment: "C", draw: "D", arrow: "A" })[tool];
}

function toolFromShortcut(key: string): Tool | null {
  const normalized = key.toLowerCase();
  if (normalized === "v") return "select";
  if (normalized === "c") return "comment";
  if (normalized === "d") return "draw";
  if (normalized === "a") return "arrow";
  return null;
}

function annotationAnnouncement(annotation: Annotation): string {
  if (annotation.presentation.type === "marker") return "위치 코멘트를 만들었습니다.";
  if (annotation.presentation.type === "outline") return "영역 코멘트를 만들었습니다.";
  if (annotation.presentation.type === "stroke") return "자유선 코멘트를 만들었습니다.";
  return "화살표 코멘트를 만들었습니다.";
}

function markLabel(annotation: Annotation): string {
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

async function readRasterSource(file: File): Promise<{ source: AnnotationSource; url: string }> {
  const url = await readFileAsDataUrl(file);
  const image = await loadRaster(url);
  return {
    source: {
      id: `upload-${file.name}-${file.lastModified}`,
      src: file.name,
      width: image.naturalWidth,
      height: image.naturalHeight,
    },
    url,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read image"));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });
}

function loadRaster(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to decode image"));
    image.src = src;
  });
}
