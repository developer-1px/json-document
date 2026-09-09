import type { CanvasObject, CanvasObjectDraft, CanvasObjectKind, DocumentObject, ObjectBounds, ObjectPoint } from "./object-model.js";

export interface ObjectTransform {
  readonly dx: number;
  readonly dy: number;
  readonly dw?: number;
  readonly dh?: number;
}

/** Shared committed/preview geometry. Path points stay normalized; resize changes only bounds. */
export function transformObject<Object extends DocumentObject>(object: Object, transform: ObjectTransform): Object {
  const { dx, dy, dw = 0, dh = 0 } = transform;
  if (![dx, dy, dw, dh].every(Number.isFinite)) throw new TypeError("Object transform must be finite.");
  const resized = transform.dw !== undefined || transform.dh !== undefined;
  return {
    ...object,
    x: object.x + dx,
    y: object.y + dy,
    width: resized ? Math.max(1, object.width + dw) : object.width,
    height: resized ? Math.max(1, object.height + dh) : object.height,
  };
}

/** Legacy objects project without changing their persisted shape. Label is the only text value. */
export function projectObject(object: DocumentObject): CanvasObject {
  return object.kind === undefined ? { ...object, color: object.color ?? "transparent", kind: "rectangle" } : object as CanvasObject;
}

export function createCanvasObject(
  kind: Exclude<CanvasObjectKind, "path">,
  bounds: ObjectBounds,
  style: { readonly color: string; readonly label: string; readonly fontSize?: number },
): CanvasObjectDraft {
  const base = { ...bounds, width: Math.max(1, bounds.width), height: Math.max(1, bounds.height), color: style.color, label: style.label };
  return kind === "text" ? { ...base, kind, fontSize: style.fontSize ?? 32 } : { ...base, kind };
}

/** Converts slide-space samples to one bounding box and normalized path geometry. */
export function createCanvasPath(
  points: ReadonlyArray<ObjectPoint>,
  style: { readonly color: string; readonly label: string; readonly strokeWidth: number },
): Extract<CanvasObjectDraft, { readonly kind: "path" }> {
  if (points.length < 2 || points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) throw new TypeError("A path requires at least two finite points.");
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x); minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x); maxY = Math.max(maxY, point.y);
  }
  const width = Math.max(1, maxX - minX), height = Math.max(1, maxY - minY);
  return {
    kind: "path", x: minX, y: minY, width, height, ...style,
    points: points.map((point) => ({ x: (point.x - minX) / width, y: (point.y - minY) / height })),
  };
}
