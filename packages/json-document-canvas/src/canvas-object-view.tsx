import { useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { getObjectStyle, projectObjectText, type CanvasObject, type ObjectTextProjection } from "@interactive-os/json-document-object-document";
import type { InteractionHandleEvent, ResizeEdge } from "@interactive-os/json-document-affordance";
import { contentInteractionAttributes, Field, useInteractionHandle } from "@interactive-os/json-document-ui-primitives-react";

export function CanvasObjectView({ object, hideText = false }: { readonly object: CanvasObject; readonly hideText?: boolean }): ReactNode {
  const style = getObjectStyle(object);
  if (object.kind === "image") return <image href={object.source} x={object.x} y={object.y} width={object.width} height={object.height} preserveAspectRatio="none" />;
  if (object.kind === "path") {
    return <polyline points={object.points.map((point) => `${object.x + point.x * object.width},${object.y + point.y * object.height}`).join(" ")} fill="none" stroke={object.color} strokeWidth={object.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
  }
  const text = projectObjectText(object);
  return <>
    {object.kind === "ellipse"
      ? <ellipse cx={object.x + object.width / 2} cy={object.y + object.height / 2} rx={object.width / 2} ry={object.height / 2} fill={object.color} stroke={style.strokeColor} strokeWidth={style.strokeWidth} />
      : object.kind !== "text" && <rect x={object.x} y={object.y} width={object.width} height={object.height} fill={object.color} stroke={style.strokeColor} strokeWidth={style.strokeWidth} />}
    {!hideText && text && <CanvasTextBox value={text}><div>{text.text + "\u200b"}</div></CanvasTextBox>}
  </>;
}

function textPresentation(value: ObjectTextProjection): CSSProperties {
  return { color: value.color, fontSize: value.fontSize, fontWeight: value.fontWeight, textAlign: value.textAlign,
    fontFamily: "inherit", lineHeight: 1.2, whiteSpace: "pre-wrap", overflowWrap: "anywhere", letterSpacing: "normal" };
}

/** The same body box and line wrapping serve display and the native textarea. */
function CanvasTextBox({ value, children }: { readonly value: ObjectTextProjection; readonly children: ReactNode }) {
  return <foreignObject data-canvas-text-box="" x={value.x} y={value.y} width={value.width} height={value.height}>
    <div style={{ ...textPresentation(value), display: "flex", flexDirection: "column", justifyContent: value.verticalAlign === "center" ? "safe center" : "flex-start", width: "100%", height: "100%", overflow: "hidden" }}>
      <div style={{ position: "relative", flexShrink: 0, minHeight: value.fontSize * 1.2, maxHeight: "100%", overflow: "hidden" }}>{children}</div>
    </div>
  </foreignObject>;
}

export function CanvasObjectTarget(props: {
  readonly object: CanvasObject;
  readonly selected: boolean;
  readonly enabled: boolean;
  readonly copying?: boolean;
  readonly onSelect: (shiftKey: boolean) => void;
  readonly onEdit: () => void;
  readonly onHandle: (interaction: InteractionHandleEvent, event: PointerEvent<SVGElement>) => void;
}) {
  const binding = useInteractionHandle<SVGRectElement>({ descriptor: { kind: "drag" }, onHandle: props.onHandle });
  const { object } = props;
  return (
    <rect {...(props.enabled ? binding.handleProps : {})} x={object.x} y={object.y} width={object.width} height={object.height}
      fill="transparent" role="button" aria-label={object.label || object.kind} aria-pressed={props.selected}
      {...contentInteractionAttributes({ role: "content", selected: props.selected, dragging: binding.active })}
      tabIndex={props.enabled ? 0 : -1} data-canvas-object={object.id} data-kind={object.kind}
      pointerEvents={props.enabled ? "all" : "none"} style={{ cursor: props.copying ? "copy" : binding.cursor, transform: "none" }}
      onDoubleClick={props.onEdit}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === " " || (event.key === "Enter" && !event.shiftKey)) {
          event.preventDefault(); event.stopPropagation(); props.onSelect(event.shiftKey);
          if (event.key === "Enter") props.onEdit();
        }
      }} />
  );
}

export function CanvasResizeTarget(props: {
  readonly object: CanvasObject;
  readonly edge: ResizeEdge;
  readonly onHandle: (interaction: InteractionHandleEvent, event: PointerEvent<SVGElement>) => void;
}) {
  const binding = useInteractionHandle<SVGRectElement>({ descriptor: { kind: "resize", edge: props.edge }, onHandle: props.onHandle });
  const { object, edge } = props;
  const x = object.x + (edge.includes("w") ? 0 : edge.includes("e") ? object.width : object.width / 2);
  const y = object.y + (edge.includes("n") ? 0 : edge.includes("s") ? object.height : object.height / 2);
  if (edge.length === 1) {
    const horizontal = edge === "n" || edge === "s";
    return <rect {...binding.handleProps} data-resize-edge={edge}
      x={horizontal ? object.x : x - 6} y={horizontal ? y - 6 : object.y}
      width={horizontal ? object.width : 12} height={horizontal ? 12 : object.height}
      fill="transparent" style={{ cursor: binding.cursor }} />;
  }
  return <rect {...binding.handleProps} data-resize-edge={edge} x={x - 6} y={y - 6} width={12} height={12}
    fill="rgb(var(--color-background-canvas))" stroke="rgb(var(--color-border-accent))" strokeWidth={2} style={{ cursor: binding.cursor }} />;
}

export function CanvasTextInput(props: {
  readonly object: CanvasObject;
  readonly text: string;
  readonly onChange: (text: string) => void;
  readonly onCommit: () => void;
  readonly onCancel: () => void;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { input.current?.focus(); input.current?.select(); }, [props.object.id]);
  const { object } = props;
  const text = projectObjectText(object);
  if (!text) return null;
  return (
    <CanvasTextBox value={text}>
      <div aria-hidden="true" style={{ visibility: "hidden" }}>{props.text + "\u200b"}</div>
      <Field multiline presentation="seamless" label="Canvas text" controlRef={input} value={props.text} onValueChange={props.onChange}
        style={{ ...textPresentation(text), position: "absolute", inset: 0, minWidth: 0, minHeight: 0, padding: 0, margin: 0, border: 0, width: "100%", height: "100%", resize: "none", background: "transparent", boxSizing: "border-box", userSelect: "text" }}
        onBlur={props.onCommit}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape") { event.preventDefault(); props.onCancel(); }
          else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); props.onCommit(); }
        }} />
    </CanvasTextBox>
  );
}
