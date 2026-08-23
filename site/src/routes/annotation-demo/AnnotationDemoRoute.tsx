import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { ActionButton, ToggleButton } from "../../shared/ui/interactive";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import {
  annotationSource,
  initialAnnotationSnapshot,
  renderAnnotationImage,
  restoreAnnotationSnapshot,
  serializeAnnotationSnapshot,
  type AnnotationSnapshot,
  type PointTarget,
  type RasterAnnotation,
} from "./annotation-state";
import { annotationDemoStyles } from "./annotation-demo-styles";
import { useAnnotationHistory } from "./use-annotation-history";

type Tool = "select" | "point" | "rectangle" | "arrow";
type Output = "structured" | "image";
type Gesture =
  | { readonly type: "create"; readonly tool: "rectangle" | "arrow"; readonly start: PointTarget; readonly current: PointTarget }
  | { readonly type: "move"; readonly id: string; readonly start: PointTarget; readonly before: AnnotationSnapshot }
  | { readonly type: "resize"; readonly id: string; readonly start: PointTarget; readonly before: AnnotationSnapshot };

const accent = "rgb(var(--color-border-accent))";

export function AnnotationDemoRoute() {
  const history = useAnnotationHistory(initialAnnotationSnapshot);
  const [tool, setTool] = useState<Tool>("point");
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [savedState, setSavedState] = useState<string | null>(null);
  const [output, setOutput] = useState<Output>("structured");
  const [renderedImage, setRenderedImage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("Point, rectangle, or arrow로 수정 위치를 표시하세요.");
  const svgRef = useRef<SVGSVGElement>(null);
  const snapshot = history.snapshot;
  const selected = snapshot.document.annotations.find((annotation) => annotation.id === snapshot.selectedId) ?? null;
  const sourceUrl = sitePath(annotationSource.src);

  useEffect(() => {
    if (output !== "image") return;
    let active = true;
    setRenderedImage(null);
    void renderAnnotationImage(snapshot, sourceUrl).then((url) => {
      if (active) setRenderedImage(url);
    });
    return () => { active = false; };
  }, [output, snapshot, sourceUrl]);

  const structuredOutput = useMemo(() => ({
    ...snapshot.document,
    selectedId: snapshot.selectedId,
  }), [snapshot]);

  function setSelected(selectedId: string | null) {
    history.commit({ ...snapshot, selectedId });
  }

  function addPoint(point: PointTarget) {
    const annotation = createAnnotation("marker", point, point);
    if (annotation === null) return;
    history.commit(appendAnnotation(snapshot, annotation));
    setAnnouncement("Point target과 instruction을 만들었습니다.");
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
    if (tool === "point") return addPoint(point);
    if (tool === "select") return setSelected(null);
    setGesture({ type: "create", tool, start: point, current: point });
  }

  function handleAnnotationPointerDown(event: PointerEvent<SVGGElement>, annotation: RasterAnnotation) {
    event.stopPropagation();
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
    if (gesture.type === "create") {
      const annotation = createAnnotation(gesture.tool, gesture.start, gesture.current);
      if (annotation !== null) {
        history.commit(appendAnnotation(snapshot, annotation));
        setAnnouncement(`${gesture.tool} annotation과 instruction을 만들었습니다.`);
      }
    } else {
      history.finishTransient(gesture.before, snapshot);
      setAnnouncement(gesture.type === "move" ? "Annotation을 이동했습니다." : "Target을 resize했습니다.");
    }
    setGesture(null);
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const command = event.metaKey || event.ctrlKey;
    if (command && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) history.redo();
      else history.undo();
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

  return (
    <DemoPage documentation={(
      <PageHeader
        illustration="cursor"
        title="Annotation Hands Demo"
        aside={<p className={classes("m-0 text-right", ui.text.meta)} aria-live="polite">{announcement}</p>}
      >
        원본 raster는 그대로 두고 target, instruction, visible mark를 함께 편집한 뒤 structured state 또는 한 장의 이미지로 투영합니다.
      </PageHeader>
    )}>
      <ProductApp
        toolbarLabel="Annotation tools"
        canvasClassName="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]"
        toolbar={(
          <>
            {(["select", "point", "rectangle", "arrow"] as const).map((value) => (
              <ToggleButton key={value} pressed={tool === value} onClick={() => setTool(value)}>
                {toolLabel(value)}
              </ToggleButton>
            ))}
            <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
            <ActionButton disabled={!history.canUndo} onClick={history.undo}>Undo</ActionButton>
            <ActionButton disabled={!history.canRedo} onClick={history.redo}>Redo</ActionButton>
            <ActionButton disabled={selected === null} onClick={deleteSelected}>Delete</ActionButton>
            <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
            <ActionButton onClick={saveState}>Save state</ActionButton>
            <ActionButton disabled={savedState === null} onClick={restoreState}>Restore state</ActionButton>
          </>
        )}
        inspector={(
          <OutputPanel
            output={output}
            setOutput={setOutput}
            structured={structuredOutput}
            renderedImage={renderedImage}
          />
        )}
      >
        <div className={annotationDemoStyles.canvasFrame}>
          <svg
            ref={svgRef}
            aria-label="Raster annotation canvas"
            className={classes(annotationDemoStyles.canvas, tool === "select" ? "cursor-default" : "cursor-crosshair")}
            data-tool={tool}
            onKeyDown={handleKeyDown}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            role="application"
            tabIndex={0}
            viewBox={`0 0 ${annotationSource.width} ${annotationSource.height}`}
          >
            <image href={sourceUrl} width={annotationSource.width} height={annotationSource.height} pointerEvents="none" />
            {snapshot.document.annotations.map((annotation, index) => (
              <AnnotationShape
                key={annotation.id}
                annotation={annotation}
                index={index + 1}
                selected={annotation.id === snapshot.selectedId}
                onPointerDown={handleAnnotationPointerDown}
                onResizePointerDown={handleResizePointerDown}
              />
            ))}
            {gesture?.type === "create" ? <DraftShape gesture={gesture} /> : null}
          </svg>
        </div>

        <aside className={classes("grid content-start gap-3 p-3", ui.surface.raised)} aria-label="Selected annotation">
          <div>
            <p className={classes("mb-1 mt-0", ui.text.label)}>Instruction</p>
            <p className={classes("m-0", ui.text.meta)}>{selected ? `${selected.mark.type} · ${selected.id}` : "표시를 선택하세요."}</p>
          </div>
          <textarea
            aria-label="Annotation instruction"
            className={classes("min-h-28 w-full resize-y", ui.field.control)}
            disabled={selected === null}
            value={selected?.body.instruction ?? ""}
            onChange={(event) => {
              if (selected === null) return;
              history.commit(updateAnnotation(snapshot, selected.id, (annotation) => ({
                ...annotation,
                body: { instruction: event.target.value },
              })));
            }}
            placeholder="이 영역을 어떻게 바꿀까요?"
          />
          <p className={classes("m-0", ui.text.meta)}>
            Select에서 표시를 drag하세요. Rectangle과 arrow의 끝 handle로 크기를 바꿀 수 있습니다.
          </p>
        </aside>
      </ProductApp>
    </DemoPage>
  );
}

function AnnotationShape(props: {
  readonly annotation: RasterAnnotation;
  readonly index: number;
  readonly selected: boolean;
  readonly onPointerDown: (event: PointerEvent<SVGGElement>, annotation: RasterAnnotation) => void;
  readonly onResizePointerDown: (event: PointerEvent<SVGCircleElement>, annotation: RasterAnnotation) => void;
}) {
  const { annotation } = props;
  const common = {
    fill: "none",
    stroke: accent,
    strokeWidth: props.selected ? 10 : 8,
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
          <circle cx={annotation.target.x} cy={annotation.target.y} r="32" fill={accent} />
          <text x={annotation.target.x} y={annotation.target.y + 2} fill="white" fontSize="32" fontWeight="700" textAnchor="middle" dominantBaseline="middle">
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
    </g>
  );
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
  const rectangle = rectangleFromPoints(gesture.start, gesture.current);
  return <rect {...rectangle} fill="transparent" stroke={accent} strokeDasharray="18 12" strokeWidth="8" />;
}

function OutputPanel(props: {
  readonly output: Output;
  readonly setOutput: (output: Output) => void;
  readonly structured: unknown;
  readonly renderedImage: string | null;
}) {
  return (
    <section aria-label="Annotation output" className="grid gap-3">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Output format">
        <ToggleButton role="tab" pressed={props.output === "structured"} aria-selected={props.output === "structured"} onClick={() => props.setOutput("structured")}>Structured</ToggleButton>
        <ToggleButton role="tab" pressed={props.output === "image"} aria-selected={props.output === "image"} onClick={() => props.setOutput("image")}>Image</ToggleButton>
      </div>
      {props.output === "structured" ? (
        <pre data-testid="annotation-structured-output" className={classes("m-0 max-h-64 overflow-auto whitespace-pre-wrap p-3 font-mono text-xs", ui.surface.inset)}>
          {JSON.stringify(props.structured, null, 2)}
        </pre>
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
  kind: "marker" | "rectangle" | "arrow",
  start: PointTarget,
  end: PointTarget,
): RasterAnnotation | null {
  const id = `annotation-${crypto.randomUUID()}`;
  if (kind === "marker") return { id, target: start, body: { instruction: "이 위치를 수정해 주세요." }, mark: { type: "marker" } };
  if (kind === "rectangle") {
    const target = rectangleFromPoints(start, end);
    if (target.width < 8 || target.height < 8) return null;
    return { id, target: { type: "rectangle", ...target }, body: { instruction: "이 영역을 수정해 주세요." }, mark: { type: "rectangle" } };
  }
  if (distance(start, end) < 8) return null;
  return { id, target: end, body: { instruction: "화살표가 가리키는 위치를 수정해 주세요." }, mark: { type: "arrow", from: start, to: end } };
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
  if (annotation.target.type === "point") return { ...annotation, target: movePoint(annotation.target, dx, dy) };
  return { ...annotation, target: { ...annotation.target, x: annotation.target.x + dx, y: annotation.target.y + dy } };
}

function resizeAnnotation(annotation: RasterAnnotation, dx: number, dy: number): RasterAnnotation {
  if (annotation.mark.type === "arrow") {
    const to = movePoint(annotation.mark.to, dx, dy);
    return { ...annotation, target: to, mark: { ...annotation.mark, to } };
  }
  if (annotation.target.type !== "rectangle") return annotation;
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

function eventPoint(event: PointerEvent<SVGElement>): PointTarget {
  const svg = event.currentTarget.ownerSVGElement ?? event.currentTarget as SVGSVGElement;
  const bounds = svg.getBoundingClientRect();
  return {
    type: "point",
    x: ((event.clientX - bounds.left) / bounds.width) * annotationSource.width,
    y: ((event.clientY - bounds.top) / bounds.height) * annotationSource.height,
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

function toolLabel(tool: Tool): string {
  return ({ select: "Select", point: "Point", rectangle: "Rectangle", arrow: "Arrow" })[tool];
}

function sitePath(path: string): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${basePath}${path}` || "/";
}
