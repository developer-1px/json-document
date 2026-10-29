import { createCanvasEmbeddedDocument, type DocumentObject, type ObjectBounds } from "@interactive-os/json-document-object-document";
import type { JSONValue } from "@interactive-os/json-document";
import type { ObjectEditor } from "./object.js";

export const htmlEmbeddedDocumentType = "html/css/1";
export interface CanvasHTMLDocument extends Record<string, JSONValue> {
  readonly html: string;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
}
/** Platform validation is injected: Editing never parses or executes browser markup. */
export interface CanvasHTMLAdapter {
  parse(html: string): { readonly html: string; readonly nodes: readonly { readonly id: string; readonly tag: string; readonly text: string }[] };
}
export function readCanvasHTML(object: DocumentObject): CanvasHTMLDocument | null {
  const document = object.document;
  if (object.kind !== "embedded-document" || object.documentType !== htmlEmbeddedDocumentType || !document || typeof document !== "object" || Array.isArray(document)) return null;
  const value = document as Record<string, JSONValue>;
  if (typeof value.html !== "string" || typeof value.viewportWidth !== "number" || typeof value.viewportHeight !== "number" || !Number.isFinite(value.viewportWidth) || !Number.isFinite(value.viewportHeight) || value.viewportWidth <= 0 || value.viewportHeight <= 0) return null;
  return value as CanvasHTMLDocument;
}
/** Preserve source bytes and authored viewport; spatial resizing scales the artifact. */
export function createCanvasHTML(html: string, bounds: ObjectBounds, label: string, adapter: CanvasHTMLAdapter) {
  if (![bounds.width, bounds.height].every(value => Number.isFinite(value) && value > 0)) throw new RangeError("HTML viewport dimensions must be positive and finite.");
  adapter.parse(html);
  return createCanvasEmbeddedDocument(htmlEmbeddedDocumentType, { html, viewportWidth: bounds.width, viewportHeight: bounds.height }, bounds, label);
}
/** Shared source commit for UI and agents. Geometry changes do not stale the source. */
export function updateCanvasHTML(editor: ObjectEditor, objectId: string, before: string, html: string, adapter: CanvasHTMLAdapter) {
  const object = (editor.snapshot.value as { objects: readonly DocumentObject[] }).objects.find(object => object.id === objectId);
  const value = object && readCanvasHTML(object);
  if (!value) return { ok: false, code: "html.object-not-found" } as const;
  if (value.html !== before) return { ok: false, code: "html.stale-source" } as const;
  adapter.parse(html);
  return editor.dispatch({ type: "object.document", objectId, document: { ...value, html } });
}

/** Render a known source revision without mutating the live object's envelope. */
export function projectCanvasHTML<T extends DocumentObject>(object: T, html: string, bounds: ObjectBounds) {
  const value = readCanvasHTML(object);
  if (!value) throw Error("Invalid HTML object");
  return { ...object, ...bounds, document: { ...value, html } };
}
