import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { Check, MoreHorizontal, X } from "lucide-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { annotationSource, type AnnotationSource, type PointTarget, type RasterAnnotation, type RectangleTarget } from "./annotation-state";
import { annotationDemoRecipe } from "./annotation-demo-styles";

type CreateGesture = { readonly start: PointTarget; readonly current: PointTarget };
const accent = "rgb(var(--color-border-accent))";
const annotationDemoStyles = annotationDemoRecipe();

export function AnnotationDemoRoute() {
  const [annotations, setAnnotations] = useState<ReadonlyArray<RasterAnnotation>>([]);
  const [draft, setDraft] = useState<RasterAnnotation | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gesture, setGesture] = useState<CreateGesture | null>(null);
  const [announcement, setAnnouncement] = useState("이미지를 클릭하거나 영역을 드래그해 주세요.");
  const selected = annotations.find(({ id }) => id === selectedId) ?? null;

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if ((event.target as Element).closest("[data-annotation-id]") !== null) return;
    const point = eventPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(null);
    setGesture({ start: point, current: point });
  }
  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (gesture !== null) setGesture({ ...gesture, current: eventPoint(event) });
  }
  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (gesture === null) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDraft(createDraft(gesture.start, gesture.current));
    setGesture(null);
    setAnnouncement("수정 요청을 작성해 주세요.");
  }
  function cancelDraft() {
    setDraft(null);
    setAnnouncement("작성 중인 요청을 취소했습니다.");
  }
  function submitDraft(instruction: string) {
    if (draft === null || instruction.trim() === "") return;
    setAnnotations((current) => [...current, { ...draft, body: { instruction: instruction.trim() } }]);
    setDraft(null);
    setAnnouncement("수정 요청을 추가했습니다.");
  }

  return (
    <DemoPage documentation={(
      <PageHeader illustration="cursor" title="Annotation Hands Demo" aside={<p className={classes("m-0 text-right", ui.text.meta)} aria-live="polite">{announcement}</p>}>
        이미지에서 수정할 위치를 클릭하거나 영역을 드래그하고 요청을 남겨 보세요.
      </PageHeader>
    )}>
      <ProductApp canvasClassName={annotationDemoStyles.productCanvas()}>
        <div className={annotationDemoStyles.canvasFrame()}>
          <div className={annotationDemoStyles.stage()}>
            <svg aria-label="Raster annotation canvas" className={annotationDemoStyles.canvas()} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} role="application" tabIndex={0} viewBox={`0 0 ${annotationSource.width} ${annotationSource.height}`}>
              <image href={sitePath(annotationSource.src)} width={annotationSource.width} height={annotationSource.height} pointerEvents="none" />
              {annotations.map((annotation, index) => <CommittedAnnotation key={annotation.id} annotation={annotation} index={index + 1} selected={annotation.id === selectedId} onSelect={() => setSelectedId(annotation.id)} />)}
              {draft ? <DraftAnnotation annotation={draft} /> : null}
              {gesture ? <GestureRegion gesture={gesture} /> : null}
            </svg>
            {draft ? <DraftComposer onCancel={cancelDraft} onSubmit={submitDraft} /> : null}
            {selected ? <CommentThread annotation={selected} index={annotations.indexOf(selected) + 1} source={annotationSource} /> : null}
          </div>
        </div>
      </ProductApp>
    </DemoPage>
  );
}

function DraftComposer(props: { readonly onCancel: () => void; readonly onSubmit: (instruction: string) => void }) {
  const [value, setValue] = useState("");
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && value.trim() !== "") props.onSubmit(value);
    if (event.key === "Escape") props.onCancel();
  }
  return (
    <section aria-label="Draft comment" className={annotationDemoStyles.draftComposer()}>
      <span className={annotationDemoStyles.draftIdentity()} aria-hidden="true" />
      <textarea aria-label="Annotation instruction" autoFocus className={annotationDemoStyles.commentInput()} onChange={(event) => setValue(event.target.value)} onKeyDown={handleKeyDown} placeholder="수정 요청을 입력하세요…" rows={1} value={value} />
      <button aria-label="Cancel comment" className={annotationDemoStyles.composerAction()} onClick={props.onCancel} type="button"><X aria-hidden="true" size={16} /></button>
      <span className={annotationDemoStyles.composerDivider()} aria-hidden="true" />
      <button aria-label="Submit comment" className={annotationDemoStyles.submitAction()} disabled={value.trim() === ""} onClick={() => props.onSubmit(value)} type="button"><Check aria-hidden="true" size={17} /></button>
    </section>
  );
}

function CommentThread(props: { readonly annotation: RasterAnnotation; readonly index: number; readonly source: AnnotationSource }) {
  const anchor = annotationAnchor(props.annotation);
  return (
    <section aria-label={`Annotation ${props.index} thread`} className={annotationDemoStyles.threadCard()} style={{ left: `${(anchor.x / props.source.width) * 100}%`, top: `${(anchor.y / props.source.height) * 100}%` }}>
      <div className={annotationDemoStyles.threadHeader()}>
        <span className={annotationDemoStyles.threadBadge()}>{props.index}</span><span className={ui.text.meta}>방금</span>
        <button aria-label="More comment actions" className={annotationDemoStyles.threadMenu()} type="button"><MoreHorizontal aria-hidden="true" size={17} /></button>
      </div>
      <p className={annotationDemoStyles.threadBody()}>{props.annotation.body.instruction}</p>
      <div className={annotationDemoStyles.threadRule()} />
      <input aria-label="Reply" className={annotationDemoStyles.replyInput()} placeholder="답글…" />
    </section>
  );
}

function CommittedAnnotation(props: { readonly annotation: RasterAnnotation; readonly index: number; readonly selected: boolean; readonly onSelect: () => void }) {
  const rectangle = props.annotation.target.type === "rectangle" ? props.annotation.target : null;
  const anchor = annotationAnchor(props.annotation);
  return (
    <g aria-label={`Annotation ${props.index}`} data-annotation-id={props.annotation.id} onPointerDown={(event) => { event.stopPropagation(); props.onSelect(); }} role="button" style={{ cursor: "pointer" }}>
      {rectangle ? <rect fill="transparent" height={rectangle.height} stroke={accent} strokeWidth={props.selected ? 5 : 3} vectorEffect="non-scaling-stroke" width={rectangle.width} x={rectangle.x} y={rectangle.y} /> : null}
      <rect fill={accent} height="38" rx="8" stroke="white" strokeWidth={props.selected ? 6 : 0} vectorEffect="non-scaling-stroke" width="38" x={anchor.x - 19} y={anchor.y - 19} />
      <text fill="white" fontSize="22" fontWeight="700" textAnchor="middle" dominantBaseline="middle" x={anchor.x} y={anchor.y + 1}>{props.index}</text>
    </g>
  );
}

function DraftAnnotation(props: { readonly annotation: RasterAnnotation }) {
  const target = props.annotation.target;
  const anchor = annotationAnchor(props.annotation);
  return (
    <g aria-hidden="true">
      {target.type === "rectangle" ? <rect fill={accent} fillOpacity="0.1" height={target.height} stroke={accent} strokeDasharray="8 6" strokeWidth="3" vectorEffect="non-scaling-stroke" width={target.width} x={target.x} y={target.y} /> : null}
      <circle cx={anchor.x} cy={anchor.y} fill="white" r="8" stroke={accent} strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function GestureRegion(props: { readonly gesture: CreateGesture }) {
  const rectangle = rectangleFromPoints(props.gesture.start, props.gesture.current);
  if (rectangle.width < 12 && rectangle.height < 12) return null;
  return <rect {...rectangle} fill={accent} fillOpacity="0.08" stroke={accent} strokeDasharray="8 6" strokeWidth="3" vectorEffect="non-scaling-stroke" />;
}

function createDraft(start: PointTarget, end: PointTarget): RasterAnnotation {
  const rectangle = rectangleFromPoints(start, end);
  const point = rectangle.width < 12 && rectangle.height < 12;
  return { id: crypto.randomUUID(), target: point ? start : { type: "rectangle", ...rectangle }, body: { instruction: "" }, mark: { type: point ? "marker" : "rectangle" } };
}
function annotationAnchor(annotation: RasterAnnotation): PointTarget {
  return annotation.target.type === "point" ? annotation.target : { type: "point", x: annotation.target.x, y: annotation.target.y };
}
function eventPoint(event: PointerEvent<SVGSVGElement>): PointTarget {
  const bounds = event.currentTarget.getBoundingClientRect();
  return { type: "point", x: ((event.clientX - bounds.left) / bounds.width) * annotationSource.width, y: ((event.clientY - bounds.top) / bounds.height) * annotationSource.height };
}
function rectangleFromPoints(start: PointTarget, end: PointTarget): Omit<RectangleTarget, "type"> {
  return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}
function sitePath(path: string): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${basePath}${path}` || "/";
}
