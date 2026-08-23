import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
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
  initialAnnotationSnapshot,
  renderAnnotationImage,
  restoreAnnotationSnapshot,
  serializeAnnotationSnapshot,
  type AnnotationSnapshot,
  type AnnotationSource,
  type PointTarget,
  type RasterAnnotation,
} from "./annotation-state";
import { annotationDemoRecipe } from "./annotation-demo-styles";
import { useAnnotationHistory } from "./use-annotation-history";

type Tool = "select" | "comment" | "draw" | "arrow";
type Output = "structured" | "image";
type Gesture =
  | { readonly type: "create"; readonly tool: "comment" | "arrow"; readonly start: PointTarget; readonly current: PointTarget }
  | { readonly type: "draw"; readonly points: ReadonlyArray<PointTarget> }
  | { readonly type: "move"; readonly id: string; readonly start: PointTarget; readonly before: AnnotationSnapshot }
  | { readonly type: "resize"; readonly id: string; readonly start: PointTarget; readonly before: AnnotationSnapshot };

const accent = "rgb(var(--color-border-accent))";
const annotationDemoStyles = annotationDemoRecipe();

export function AnnotationDemoRoute() {
  const history = useAnnotationHistory(initialAnnotationSnapshot);
  const [tool, setTool] = useState<Tool>("comment");
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [savedState, setSavedState] = useState<string | null>(null);
  const [output, setOutput] = useState<Output>("structured");
  const [renderedImage, setRenderedImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [announcement, setAnnouncement] = useState("클릭하거나 드래그해서 수정 코멘트를 남기세요.");
  const svgRef = useRef<SVGSVGElement>(null);
  const rasterUrlsRef = useRef(new Map<string, string>([[
    initialAnnotationSnapshot.document.source.id,
    sitePath(initialAnnotationSnapshot.document.source.src),
  ]]));
  const snapshot = history.snapshot;
  const selected = snapshot.document.annotations.find((annotation) => annotation.id === snapshot.selectedId) ?? null;
  const source = snapshot.document.source;
  const sourceUrl = rasterUrlsRef.current.get(source.id) ?? sourcePath(source.src);

  useEffect(() => {
    if (output !== "image") return;
    let active = true;
    setRenderedImage(null);
    void renderAnnotationImage(snapshot, sourceUrl).then((url) => {
      if (active) setRenderedImage(url);
    });
    return () => { active = false; };
  }, [output, snapshot, sourceUrl]);

  const structuredOutput = useMemo(() => presentStructuredSnapshot(snapshot), [snapshot]);
  const structuredDownloadUrl = useMemo(
    () => `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(structuredOutput, null, 2))}`,
    [structuredOutput],
  );

  function setSelected(selectedId: string | null) {
    history.replace({ ...snapshot, selectedId });
  }

  function sendComment(annotation: RasterAnnotation, instruction: string) {
    const nextInstruction = instruction.trim();
    if (annotation.body.instruction === nextInstruction) {
      setTool("select");
      return;
    }
    history.commit({
      ...updateAnnotation(snapshot, annotation.id, (current) => ({
        ...current,
        body: { instruction: nextInstruction },
      })),
      selectedId: annotation.id,
    });
    setTool("select");
    setAnnouncement("수정 요청을 추가했습니다.");
  }

  function cancelComment(annotation: RasterAnnotation) {
    if (annotation.body.instruction === "") {
      history.commit({
        document: {
          ...snapshot.document,
          annotations: snapshot.document.annotations.filter(({ id }) => id !== annotation.id),
        },
        selectedId: null,
      });
      setAnnouncement("작성 중인 요청을 취소했습니다.");
      return;
    }
    history.replace({ ...snapshot, selectedId: null });
  }

  function chooseTool(nextTool: Tool) {
    setTool(nextTool);
    if (snapshot.selectedId !== null) {
      history.replace({ ...snapshot, selectedId: null });
    }
  }

  function deleteSelected() {
    if (snapshot.selectedId === null) return;
    history.commit({
      document: {
        ...snapshot.document,
        annotations: snapshot.document.annotations.filter(({ id }) => id !== snapshot.selectedId),
      },
      selectedId: null,
    });
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

  function handleAnnotationPointerDown(event: PointerEvent<SVGGElement>, annotation: RasterAnnotation) {
    event.stopPropagation();
    if (tool !== "select") {
      setSelected(annotation.id);
      return;
    }
    const svg = svgRef.current;
    if (svg === null) return;
    svg.setPointerCapture(event.pointerId);
    const before = snapshot.selectedId === annotation.id ? snapshot : { ...snapshot, selectedId: annotation.id };
    history.replace(before);
    setGesture({ type: "move", id: annotation.id, start: eventPoint(event), before });
  }

  function handleResizePointerDown(event: PointerEvent<SVGCircleElement>, annotation: RasterAnnotation) {
    event.stopPropagation();
    const svg = svgRef.current;
    if (svg === null) return;
    svg.setPointerCapture(event.pointerId);
    setGesture({ type: "resize", id: annotation.id, start: eventPoint(event), before: snapshot });
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
    const dx = point.x - gesture.start.x;
    const dy = point.y - gesture.start.y;
    history.replace(transformAnnotation(gesture.before, gesture.id, gesture.type, dx, dy));
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (gesture === null) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (gesture.type === "draw") {
      const annotation = createDrawAnnotation(gesture.points);
      if (annotation !== null) {
        history.commit(appendAnnotation(snapshot, annotation));
        setTool("select");
        setAnnouncement("자유선 코멘트를 만들었습니다.");
      }
    } else if (gesture.type === "create") {
      const annotation = createAnnotation(gesture.tool, gesture.start, gesture.current);
      if (annotation !== null) {
        history.commit(appendAnnotation(snapshot, annotation));
        setTool("select");
        setAnnouncement(annotationAnnouncement(annotation));
      }
    } else {
      history.finishTransient(gesture.before, snapshot);
      setAnnouncement(gesture.type === "move" ? "Annotation을 이동했습니다." : "Target을 resize했습니다.");
    }
    setGesture(null);
  }

  function handlePointerCancel(event: PointerEvent<SVGSVGElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (gesture?.type === "move" || gesture?.type === "resize") history.replace(gesture.before);
    setGesture(null);
    setAnnouncement("진행 중인 조작을 취소했습니다.");
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const command = event.metaKey || event.ctrlKey;
    if (command && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) history.redo();
      else history.undo();
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
    setSavedState(serializeAnnotationSnapshot(snapshot));
    setAnnouncement("Structured annotation state를 저장했습니다.");
  }

  function restoreState() {
    if (savedState === null) return;
    history.commit(restoreAnnotationSnapshot(savedState));
    setAnnouncement("저장한 state에서 overlay를 복원했습니다.");
  }

  async function replaceImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) return;
    try {
      const { source: nextSource, url } = await readRasterSource(file);
      rasterUrlsRef.current.set(nextSource.id, url);
      history.commit({
        document: { version: 1, source: nextSource, annotations: [] },
        selectedId: null,
      });
      setZoom(1);
      setAnnouncement(`${file.name} 이미지로 교체했습니다.`);
    } catch {
      setAnnouncement("지원하는 raster 이미지를 불러오지 못했습니다.");
    }
  }

  async function downloadImage() {
    const url = await renderAnnotationImage(snapshot, sourceUrl);
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
              {snapshot.document.annotations.map((annotation, index) => (
                <AnnotationShape key={annotation.id} annotation={annotation} index={index + 1} selected={annotation.id === snapshot.selectedId} onPointerDown={handleAnnotationPointerDown} onResizePointerDown={handleResizePointerDown} />
              ))}
              {gesture?.type === "create" ? <DraftShape gesture={gesture} /> : null}
              {gesture?.type === "draw" ? <StrokeLine points={gesture.points} draft /> : null}
            </svg>
            {selected ? (
              <CommentComposer annotation={selected} index={snapshot.document.annotations.indexOf(selected) + 1} source={source} onCancel={() => cancelComment(selected)} onSend={(instruction) => sendComment(selected, instruction)} />
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
            {JSON.stringify(presentStructuredSnapshot(snapshot))}
          </output>
        </div>
      </ProductApp>
    </DemoPage>
  );
}

function CommentComposer(props: {
  readonly annotation: RasterAnnotation;
  readonly index: number;
  readonly source: AnnotationSource;
  readonly onCancel: () => void;
  readonly onSend: (instruction: string) => void;
}) {
  const [draft, setDraft] = useState(props.annotation.body.instruction);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setDraft(props.annotation.body.instruction), [props.annotation.id, props.annotation.body.instruction]);
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input === null) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
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
          if (draft.trim() !== "") props.onSend(draft);
        }}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (draft.trim() !== "") props.onSend(draft);
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
        onClick={() => props.onSend(draft)}
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
  readonly annotation: RasterAnnotation;
  readonly index: number;
  readonly selected: boolean;
  readonly onPointerDown: (event: PointerEvent<SVGGElement>, annotation: RasterAnnotation) => void;
  readonly onResizePointerDown: (event: PointerEvent<SVGCircleElement>, annotation: RasterAnnotation) => void;
}) {
  const { annotation } = props;
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
      {annotation.mark.type === "marker" && annotation.target.type === "point" ? (
        <>
          <rect
            x={annotation.target.x + 10}
            y={annotation.target.y + 10}
            width="16"
            height="16"
            fill={accent}
            transform={`rotate(45 ${annotation.target.x + 18} ${annotation.target.y + 18})`}
          />
          <circle cx={annotation.target.x} cy={annotation.target.y} r="24" fill={accent} />
          <text x={annotation.target.x} y={annotation.target.y + 1} fill="white" fontSize="24" fontWeight="700" textAnchor="middle" dominantBaseline="middle">
            {props.index}
          </text>
        </>
      ) : null}
      {annotation.mark.type === "rectangle" && annotation.target.type === "rectangle" ? (
        <>
          <rect {...common} {...annotation.target} fill="transparent" />
          {props.selected ? (
            <circle
              aria-label="Resize rectangle"
              cx={annotation.target.x + annotation.target.width}
              cy={annotation.target.y + annotation.target.height}
              r="15"
              fill={accent}
              onPointerDown={(event) => props.onResizePointerDown(event, annotation)}
              style={{ cursor: "nwse-resize" }}
            />
          ) : null}
        </>
      ) : null}
      {annotation.mark.type === "draw" ? (
        <>
          <StrokeLine points={annotation.mark.points} selected={props.selected} />
          {props.selected ? (
            <circle
              aria-label="Resize drawing"
              cx={annotation.target.type === "rectangle" ? annotation.target.x + annotation.target.width : 0}
              cy={annotation.target.type === "rectangle" ? annotation.target.y + annotation.target.height : 0}
              r="15"
              fill={accent}
              onPointerDown={(event) => props.onResizePointerDown(event, annotation)}
              style={{ cursor: "nwse-resize" }}
            />
          ) : null}
        </>
      ) : null}
      {annotation.mark.type === "arrow" ? (
        <>
          <ArrowLine from={annotation.mark.from} to={annotation.mark.to} selected={props.selected} />
          {props.selected ? (
            <circle
              aria-label="Resize arrow"
              cx={annotation.mark.to.x}
              cy={annotation.mark.to.y}
              r="15"
              fill={accent}
              onPointerDown={(event) => props.onResizePointerDown(event, annotation)}
              style={{ cursor: "crosshair" }}
            />
          ) : null}
        </>
      ) : null}
      {annotation.mark.type !== "marker" ? (
        <>
          <rect x={bounds.x - 19} y={bounds.y - 19} width="38" height="38" rx="8" fill={accent} stroke="white" strokeWidth={props.selected ? 6 : 0} vectorEffect="non-scaling-stroke" />
          <text x={bounds.x} y={bounds.y + 1} fill="white" fontSize="22" fontWeight="700" textAnchor="middle" dominantBaseline="middle">{props.index}</text>
        </>
      ) : null}
    </g>
  );
}

function StrokeLine(props: {
  readonly points: ReadonlyArray<PointTarget>;
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

function strokePathData(points: ReadonlyArray<PointTarget>): string {
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

function ArrowLine(props: { readonly from: PointTarget; readonly to: PointTarget; readonly selected: boolean }) {
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
  kind: "comment" | "arrow",
  start: PointTarget,
  end: PointTarget,
): RasterAnnotation | null {
  const id = `annotation-${crypto.randomUUID()}`;
  if (kind === "comment") {
    if (distance(start, end) < 16) return { id, target: start, body: { instruction: "" }, mark: { type: "marker" } };
    const target = rectangleFromPoints(start, end);
    return { id, target: { type: "rectangle", ...target }, body: { instruction: "" }, mark: { type: "rectangle" } };
  }
  if (distance(start, end) < 8) return null;
  return { id, target: end, body: { instruction: "" }, mark: { type: "arrow", from: start, to: end } };
}

function createDrawAnnotation(points: ReadonlyArray<PointTarget>): RasterAnnotation | null {
  if (points.length < 2 || pathLength(points) < 16) return null;
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const target = {
    type: "rectangle" as const,
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
  return {
    id: `annotation-${crypto.randomUUID()}`,
    target,
    body: { instruction: "" },
    mark: { type: "draw", points },
  };
}

function appendAnnotation(snapshot: AnnotationSnapshot, annotation: RasterAnnotation): AnnotationSnapshot {
  return {
    document: { ...snapshot.document, annotations: [...snapshot.document.annotations, annotation] },
    selectedId: annotation.id,
  };
}

function updateAnnotation(
  snapshot: AnnotationSnapshot,
  id: string,
  update: (annotation: RasterAnnotation) => RasterAnnotation,
): AnnotationSnapshot {
  return {
    ...snapshot,
    document: {
      ...snapshot.document,
      annotations: snapshot.document.annotations.map((annotation) => annotation.id === id ? update(annotation) : annotation),
    },
  };
}

function transformAnnotation(
  snapshot: AnnotationSnapshot,
  id: string,
  operation: "move" | "resize",
  dx: number,
  dy: number,
): AnnotationSnapshot {
  return updateAnnotation(snapshot, id, (annotation) => operation === "move"
    ? moveAnnotation(annotation, dx, dy)
    : resizeAnnotation(annotation, dx, dy));
}

function moveAnnotation(annotation: RasterAnnotation, dx: number, dy: number): RasterAnnotation {
  if (annotation.mark.type === "arrow") {
    const from = movePoint(annotation.mark.from, dx, dy);
    const to = movePoint(annotation.mark.to, dx, dy);
    return { ...annotation, target: to, mark: { ...annotation.mark, from, to } };
  }
  if (annotation.mark.type === "draw") {
    const points = annotation.mark.points.map((point) => movePoint(point, dx, dy));
    return {
      ...annotation,
      target: annotation.target.type === "rectangle"
        ? { ...annotation.target, x: annotation.target.x + dx, y: annotation.target.y + dy }
        : annotation.target,
      mark: { ...annotation.mark, points },
    };
  }
  if (annotation.target.type === "point") return { ...annotation, target: movePoint(annotation.target, dx, dy) };
  return { ...annotation, target: { ...annotation.target, x: annotation.target.x + dx, y: annotation.target.y + dy } };
}

function resizeAnnotation(annotation: RasterAnnotation, dx: number, dy: number): RasterAnnotation {
  if (annotation.mark.type === "arrow") {
    const to = movePoint(annotation.mark.to, dx, dy);
    return { ...annotation, target: to, mark: { ...annotation.mark, to } };
  }
  if (annotation.target.type !== "rectangle") return annotation;
  if (annotation.mark.type === "draw") {
    const nextWidth = Math.max(16, annotation.target.width + dx);
    const nextHeight = Math.max(16, annotation.target.height + dy);
    const scaleX = nextWidth / Math.max(1, annotation.target.width);
    const scaleY = nextHeight / Math.max(1, annotation.target.height);
    return {
      ...annotation,
      target: { ...annotation.target, width: nextWidth, height: nextHeight },
      mark: {
        ...annotation.mark,
        points: annotation.mark.points.map((point) => ({
          type: "point",
          x: annotation.target.x + (point.x - annotation.target.x) * scaleX,
          y: annotation.target.y + (point.y - annotation.target.y) * scaleY,
        })),
      },
    };
  }
  return {
    ...annotation,
    target: {
      ...annotation.target,
      width: Math.max(16, annotation.target.width + dx),
      height: Math.max(16, annotation.target.height + dy),
    },
  };
}

function movePoint(point: PointTarget, dx: number, dy: number): PointTarget {
  return { type: "point", x: point.x + dx, y: point.y + dy };
}

function annotationDock(annotation: RasterAnnotation, source: AnnotationSource) {
  const bounds = annotationBounds(annotation);
  const horizontal = bounds.x + bounds.width / 2 >= source.width / 2 ? "left" : "right";
  const vertical = bounds.y + bounds.height / 2 >= source.height / 2 ? "above" : "below";
  const pointOffset = annotation.target.type === "point" ? 24 : 0;
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

function annotationBounds(annotation: RasterAnnotation) {
  if (annotation.mark.type === "arrow") return rectangleFromPoints(annotation.mark.from, annotation.mark.to);
  if (annotation.target.type === "rectangle") return annotation.target;
  return { x: annotation.target.x, y: annotation.target.y, width: 0, height: 0 };
}

function eventPoint(event: PointerEvent<SVGElement>): PointTarget {
  const svg = event.currentTarget.ownerSVGElement ?? event.currentTarget as SVGSVGElement;
  const bounds = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  return {
    type: "point",
    x: ((event.clientX - bounds.left) / bounds.width) * viewBox.width,
    y: ((event.clientY - bounds.top) / bounds.height) * viewBox.height,
  };
}

function rectangleFromPoints(start: PointTarget, end: PointTarget) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function distance(start: PointTarget, end: PointTarget): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function pathLength(points: ReadonlyArray<PointTarget>): number {
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

function annotationAnnouncement(annotation: RasterAnnotation): string {
  if (annotation.mark.type === "marker") return "위치 코멘트를 만들었습니다.";
  if (annotation.mark.type === "rectangle") return "영역 코멘트를 만들었습니다.";
  if (annotation.mark.type === "draw") return "자유선 코멘트를 만들었습니다.";
  return "화살표 코멘트를 만들었습니다.";
}

function markLabel(annotation: RasterAnnotation): string {
  if (annotation.mark.type === "marker") return "Point";
  if (annotation.mark.type === "rectangle") return "Area";
  if (annotation.mark.type === "draw") return "Draw";
  return "Arrow";
}

function sitePath(path: string): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${basePath}${path}` || "/";
}

function sourcePath(path: string): string {
  return path.startsWith("data:") ? path : sitePath(path);
}

function presentStructuredSnapshot(snapshot: AnnotationSnapshot) {
  return {
    ...snapshot.document,
    selectedId: snapshot.selectedId,
  };
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
