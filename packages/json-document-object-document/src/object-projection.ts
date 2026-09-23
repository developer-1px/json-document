import type { CanvasObject, CanvasObjectDraft, CanvasObjectKind, DocumentObject, ObjectBounds, ObjectPoint } from "./object-model.js";
import { assertCanvasImageSource } from "./object-validation.js";
import { getObjectStyle, type ObjectStyle } from "./object-style.js";

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

/** Read-only body layout, shared by display, native editing, and text capability checks. */
export interface ObjectTextProjection extends ObjectBounds, Pick<ObjectStyle, "fontSize" | "fontWeight" | "textAlign" | "color"> {
  readonly text: string;
  readonly verticalAlign: "top" | "center";
}

export function projectObjectText(object: DocumentObject): ObjectTextProjection | null {
  const style = getObjectStyle(object);
  if (style.fontSize === undefined) return null;
  const shape = object.kind === "rectangle" || object.kind === "ellipse";
  const padding = object.kind === "text" ? 0 : object.kind === "sticky-note" ? 16 : 12;
  const insetX = object.kind === "ellipse" ? object.width * (1 - Math.SQRT1_2) / 2 : Math.min(padding, object.width / 4);
  const insetY = object.kind === "ellipse" ? object.height * (1 - Math.SQRT1_2) / 2 : Math.min(padding, object.height / 4);
  return {
    x: object.x + insetX, y: object.y + insetY, width: object.width - 2 * insetX, height: object.height - 2 * insetY,
    text: object.label, color: style.textColor ?? style.color!, fontSize: style.fontSize,
    fontWeight: style.fontWeight!, textAlign: style.textAlign!, verticalAlign: shape ? "center" : "top",
  };
}

export function createCanvasObject(
  kind: Exclude<CanvasObjectKind, "path" | "image">,
  bounds: ObjectBounds,
  style: { readonly color: string; readonly label: string; readonly fontSize?: number; readonly textColor?: string },
): CanvasObjectDraft {
  const base = { ...bounds, width: Math.max(1, bounds.width), height: Math.max(1, bounds.height), color: style.color, label: style.label };
  return kind === "text" ? { ...base, kind, fontSize: style.fontSize ?? 32 } : {
    ...base, kind, ...(style.fontSize === undefined ? {} : { fontSize: style.fontSize }), ...(style.textColor === undefined ? {} : { textColor: style.textColor }),
  };
}

/** Fits a decoded raster inside bounds without upscaling; persisted bytes survive JSON round trips. */
export function createCanvasImage(
  image: { readonly source: string; readonly width: number; readonly height: number; readonly label: string },
  bounds: ObjectBounds,
): Extract<CanvasObjectDraft, { readonly kind: "image" }> {
  assertCanvasImageSource(image.source);
  if (![image.width, image.height, bounds.width, bounds.height].every((value) => Number.isFinite(value) && value > 0)
    || ![bounds.x, bounds.y].every(Number.isFinite)) throw new TypeError("Image and fit dimensions must be positive and finite.");
  const scale = Math.min(1, bounds.width / image.width, bounds.height / image.height);
  return { kind: "image", source: image.source, label: image.label, color: "transparent", x: bounds.x, y: bounds.y, width: image.width * scale, height: image.height * scale };
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
