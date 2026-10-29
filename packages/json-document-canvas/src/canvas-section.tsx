import { projectObjectText, type CanvasObject } from "@interactive-os/json-document-object-document";

/** A named free-layout region; containment and geometry belong to ObjectDocument. */
export function CanvasSection({ object, hideTitle = false }: {
  readonly object: Extract<CanvasObject, { kind: "section" }>;
  readonly hideTitle?: boolean;
}) {
  const title = projectObjectText(object)!;
  return <g data-canvas-section={object.id}>
    <rect x={object.x} y={object.y} width={object.width} height={object.height} rx={8}
      fill={object.color} stroke="rgb(var(--color-border-default))" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    {!hideTitle && <foreignObject x={title.x} y={title.y} width={title.width} height={title.height} pointerEvents="none">
      <div style={{ fontSize: title.fontSize, color: title.color, lineHeight: "24px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title.text}</div>
    </foreignObject>}
  </g>;
}
