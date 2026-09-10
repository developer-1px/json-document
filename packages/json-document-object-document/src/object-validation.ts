import { createJSONDocument, type JSONValue } from "@interactive-os/json-document";
import { assertRasterImageSource as assertCanvasImageSource } from "@interactive-os/json-document-file-intake";
import type { CanvasDocument, ObjectDocument } from "./object-model.js";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function positive(value: unknown): value is number {
  return finite(value) && value > 0;
}

export function assertObjectDocument(value: unknown): void {
  if (!record(value) || !Array.isArray(value.objects)) throw new TypeError("Object document requires an objects array.");
  createJSONDocument(value as JSONValue);
  const ids = new Set<string>();
  for (const object of value.objects) {
    if (!record(object) || typeof object.id !== "string" || object.id.length === 0) throw new TypeError("Object ids must not be empty.");
    if (ids.has(object.id)) throw new TypeError(`Object id must be unique: ${JSON.stringify(object.id)}.`);
    if (typeof object.label !== "string" || (object.color !== undefined && typeof object.color !== "string")) throw new TypeError("Object label and color must be strings.");
    if (![object.x, object.y, object.width, object.height].every(finite)) throw new TypeError(`Object geometry must be finite: ${JSON.stringify(object.id)}.`);
    if ((object.width as number) < 0 || (object.height as number) < 0) throw new TypeError(`Object dimensions must not be negative: ${JSON.stringify(object.id)}.`);
    if (object.kind !== undefined) {
      if (typeof object.color !== "string") throw new TypeError("Canvas objects require a color string.");
      if (!["text", "rectangle", "ellipse", "path", "image"].includes(object.kind as string)) throw new TypeError("Unknown Object kind.");
      if (!positive(object.width) || !positive(object.height)) throw new TypeError("Canvas object dimensions must be positive.");
      if (object.kind === "text" && !positive(object.fontSize)) throw new TypeError("Text fontSize must be positive and finite.");
      if (object.kind === "image") assertCanvasImageSource(object.source);
      if (object.kind === "path") {
        if (!positive(object.strokeWidth) || !Array.isArray(object.points) || object.points.length < 2) throw new TypeError("Path requires a positive strokeWidth and at least two points.");
        for (const point of object.points) {
          if (!record(point) || !finite(point.x) || !finite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) throw new TypeError("Path points must be finite normalized coordinates in [0, 1].");
        }
      }
    }
    ids.add(object.id);
  }
  if (value.profile === "canvas/1") assertCanvasShape(value as unknown as ObjectDocument);
}

/** Embedded raster only: no external fetch, SVG, HTML, or session-scoped blob URL. Decoding belongs to the platform. */
export { assertCanvasImageSource };

function assertCanvasShape(value: ObjectDocument): void {
  if (!positive(value.width) || !positive(value.height)) throw new TypeError("Canvas dimensions must be positive and finite.");
  if (value.objects.some((object) => object.kind === undefined)) throw new TypeError("Canvas objects require an explicit kind.");
}

export function assertCanvasDocument(value: unknown): asserts value is CanvasDocument {
  assertObjectDocument(value);
  if (!record(value) || value.profile !== "canvas/1") throw new TypeError("Expected Canvas profile canvas/1.");
}

/** Validates the complete JSON tree as well as the profile; does not retain caller-owned values. */
export function parseCanvasDocument(json: string): CanvasDocument {
  const value: unknown = JSON.parse(json);
  assertCanvasDocument(value);
  return createJSONDocument(value).value as CanvasDocument;
}

export function serializeCanvasDocument(document: CanvasDocument): string {
  assertCanvasDocument(document);
  return JSON.stringify(createJSONDocument(document as JSONValue).value, null, 2);
}
