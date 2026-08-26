import { buildPointer, type JSONPatchOperation, type JSONValue } from "@interactive-os/json-document";
import { resolveDocumentSource, type EditingDocumentSource } from "./document-source.js";
import { createEditingSession, type EditingResult, type EditingSnapshot } from "./session.js";
import { assertAnnotation, assertAnnotationDocument } from "./annotation-validation.js";

export const ANNOTATION_PROFILE_V1 = "urn:interactive-os:json-document:annotation:1" as const;
export interface AnnotationPoint extends Record<string, JSONValue> { readonly x: number; readonly y: number }
export interface AnnotationSource extends Record<string, JSONValue> { readonly id: string; readonly src: string; readonly width: number; readonly height: number }
export type AnnotationSelector =
  | ({ readonly type: "point" } & AnnotationPoint)
  | ({ readonly type: "rectangle"; readonly width: number; readonly height: number } & AnnotationPoint)
  | { readonly type: "path"; readonly points: ReadonlyArray<AnnotationPoint> }
  | { readonly type: "arrow"; readonly from: AnnotationPoint; readonly to: AnnotationPoint };
export type AnnotationPresentation =
  | { readonly type: "marker" }
  | { readonly type: "reaction"; readonly reaction: "like" | "dislike" }
  | { readonly type: "outline" }
  | { readonly type: "stroke" }
  | { readonly type: "arrow" };
export interface Annotation extends Record<string, JSONValue> { readonly id: string; readonly body: { readonly instruction: string }; readonly target: { readonly sourceId: string; readonly selector: AnnotationSelector }; readonly presentation: AnnotationPresentation }
export interface AnnotationDocument extends Record<string, JSONValue> { readonly profile: typeof ANNOTATION_PROFILE_V1; readonly id: string; readonly sources: ReadonlyArray<AnnotationSource>; readonly annotations: ReadonlyArray<Annotation> }
export interface AnnotationSelection extends Record<string, JSONValue> { readonly kind: "annotation"; readonly ids: ReadonlyArray<string>; readonly primaryId: string | null }
export type AnnotationIntent =
  | { readonly type: "selection.set"; readonly annotationId: string | null; readonly mode: "replace" | "toggle" }
  | { readonly type: "annotation.create"; readonly annotation: Annotation }
  | { readonly type: "annotation.body.set"; readonly annotationId: string; readonly instruction: string }
  | { readonly type: "annotation.move"; readonly annotationId: string; readonly dx: number; readonly dy: number }
  | { readonly type: "annotation.resize"; readonly annotationId: string; readonly handle: "end" | "south-east"; readonly dx: number; readonly dy: number }
  | { readonly type: "annotation.delete"; readonly annotationId: string };
export interface AnnotationEditor { readonly snapshot: EditingSnapshot<AnnotationSelection>; dispatch(intent: AnnotationIntent): EditingResult<AnnotationSelection>; undo(): EditingResult<AnnotationSelection>; redo(): EditingResult<AnnotationSelection>; subscribe(listener: () => void): () => void }

export function createAnnotationEditor(source: EditingDocumentSource<AnnotationDocument>): AnnotationEditor {
  const document = resolveDocumentSource(source);
  assertAnnotationDocument(document.value as AnnotationDocument);
  const session = createEditingSession({ document, selection: selectionFor([]) });
  const value = () => session.snapshot.value as AnnotationDocument;
  function dispatch(intent: AnnotationIntent): EditingResult<AnnotationSelection> {
    const annotations = value().annotations;
    if (intent.type === "selection.set") {
      if (intent.annotationId !== null && !annotations.some((item) => item.id === intent.annotationId)) return failure("annotation.not-found");
      const current = session.snapshot.selection.ids;
      const ids = intent.mode === "toggle" && intent.annotationId !== null
        ? current.includes(intent.annotationId) ? current.filter((id) => id !== intent.annotationId) : [...current, intent.annotationId]
        : intent.annotationId === null ? [] : [intent.annotationId];
      return success(session.select(selectionFor(ids, ids.includes(intent.annotationId ?? "") ? intent.annotationId : ids.at(-1) ?? null)));
    }
    if (intent.type === "annotation.create") {
      try { assertAnnotation(intent.annotation, new Set(value().sources.map((item) => item.id))); } catch (error) { return failure("annotation.invalid", message(error)); }
      if (annotations.some((item) => item.id === intent.annotation.id)) return failure("annotation.id-conflict");
      return session.apply({ operations: [{ op: "add", path: `/annotations/${annotations.length}`, value: intent.annotation }], selectionAfter: selectionFor([intent.annotation.id]), origin: intent.type });
    }
    const index = annotations.findIndex((item) => item.id === intent.annotationId);
    const annotation = annotations[index];
    if (!annotation) return failure("annotation.not-found");
    if (intent.type === "annotation.delete") {
      const remaining = annotations.filter((item) => item.id !== annotation.id);
      const next = remaining[Math.min(index, remaining.length - 1)];
      return session.apply({ operations: [{ op: "remove", path: buildPointer(["annotations", index]) }], selectionAfter: selectionFor(next ? [next.id] : []), origin: intent.type });
    }
    if (intent.type === "annotation.body.set") {
      return replace(index, { ...annotation, body: { instruction: intent.instruction } }, intent.type);
    }
    const selector = intent.type === "annotation.move" ? move(annotation.target.selector, intent.dx, intent.dy) : resize(annotation.target.selector, intent.handle, intent.dx, intent.dy);
    if (!selector) return failure("annotation.resize-unsupported");
    return replace(index, { ...annotation, target: { ...annotation.target, selector } }, intent.type);
  }
  function replace(index: number, annotation: Annotation, origin: string): EditingResult<AnnotationSelection> {
    try { assertAnnotation(annotation); } catch (error) { return failure("annotation.invalid", message(error)); }
    const operation: JSONPatchOperation = { op: "replace", path: buildPointer(["annotations", index]), value: annotation };
    return session.apply({ operations: [operation], selectionAfter: selectionFor([annotation.id]), origin });
  }
  return { get snapshot() { return session.snapshot; }, dispatch, undo: () => session.undo(), redo: () => session.redo(), subscribe: (listener) => session.subscribe(listener) };
}

function move(selector: AnnotationSelector, dx: number, dy: number): AnnotationSelector {
  const point = (p: AnnotationPoint) => ({ x: p.x + dx, y: p.y + dy });
  if (selector.type === "point" || selector.type === "rectangle") return { ...selector, ...point(selector) };
  if (selector.type === "path") return { ...selector, points: selector.points.map(point) };
  return { ...selector, from: point(selector.from), to: point(selector.to) };
}
function resize(selector: AnnotationSelector, handle: "end" | "south-east", dx: number, dy: number): AnnotationSelector | null {
  if (handle === "south-east" && selector.type === "rectangle") return { ...selector, width: Math.max(1, selector.width + dx), height: Math.max(1, selector.height + dy) };
  if (handle === "south-east" && selector.type === "path") {
    const xs = selector.points.map((point) => point.x); const ys = selector.points.map((point) => point.y);
    const x = Math.min(...xs); const y = Math.min(...ys); const width = Math.max(1, Math.max(...xs) - x); const height = Math.max(1, Math.max(...ys) - y);
    const scaleX = Math.max(1, width + dx) / width; const scaleY = Math.max(1, height + dy) / height;
    return { ...selector, points: selector.points.map((point) => ({ x: x + (point.x - x) * scaleX, y: y + (point.y - y) * scaleY })) };
  }
  if (handle === "end" && selector.type === "arrow") { const to = { x: selector.to.x + dx, y: selector.to.y + dy }; return to.x === selector.from.x && to.y === selector.from.y ? null : { ...selector, to }; }
  return null;
}
function selectionFor(ids: ReadonlyArray<string>, primaryId: string | null = ids.at(-1) ?? null): AnnotationSelection { return { kind: "annotation", ids, primaryId }; }
function success(snapshot: EditingSnapshot<AnnotationSelection>): EditingResult<AnnotationSelection> { return { ok: true, snapshot }; }
function failure(code: string, reason?: string): EditingResult<AnnotationSelection> { return { ok: false, code, ...(reason === undefined ? {} : { reason }) }; }
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
