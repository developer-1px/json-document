import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import type { CanvasObject } from "@interactive-os/json-document-object-document";
import type { InteractionHandleEvent, ResizeEdge } from "@interactive-os/json-document-affordance";
import { contentInteractionAttributes, Field, useInteractionHandle } from "@interactive-os/json-document-ui-primitives-react";

export function CanvasObjectView({ object }: { readonly object: CanvasObject }): ReactNode {
  if (object.kind === "image") return <image href={object.source} x={object.x} y={object.y} width={object.width} height={object.height} preserveAspectRatio="none" />;
  if (object.kind === "path") {
    return <polyline points={object.points.map((point) => `${object.x + point.x * object.width},${object.y + point.y * object.height}`).join(" ")} fill="none" stroke={object.color} strokeWidth={object.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
  }
  if (object.kind === "text") return (
    <foreignObject x={object.x} y={object.y} width={object.width} height={object.height}>
      <div style={{ color: object.color, fontSize: object.fontSize, lineHeight: 1.2, whiteSpace: "pre-wrap", overflowWrap: "anywhere", width: "100%", height: "100%", overflow: "hidden" }}>{object.label}</div>
    </foreignObject>
  );
  return object.kind === "ellipse"
    ? <ellipse cx={object.x + object.width / 2} cy={object.y + object.height / 2} rx={object.width / 2} ry={object.height / 2} fill={object.color} />
    : <rect x={object.x} y={object.y} width={object.width} height={object.height} fill={object.color} />;
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
  readonly object: Extract<CanvasObject, { readonly kind: "text" }>;
  readonly text: string;
  readonly onChange: (text: string) => void;
  readonly onCommit: () => void;
  readonly onCancel: () => void;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { input.current?.focus(); input.current?.select(); }, [props.object.id]);
  const { object } = props;
  return (
    <foreignObject x={object.x} y={object.y} width={object.width} height={object.height}>
      <Field multiline presentation="seamless" label="Canvas text" controlRef={input} value={props.text} onValueChange={props.onChange}
        style={{ color: object.color, fontSize: object.fontSize, lineHeight: 1.2, padding: 0, margin: 0, border: 0, width: "100%", height: "100%", resize: "none", background: "transparent", boxSizing: "border-box" }}
        onBlur={props.onCommit}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape") { event.preventDefault(); props.onCancel(); }
          else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); props.onCommit(); }
        }} />
    </foreignObject>
  );
}
