import { createJSONDocument } from "@interactive-os/json-document";
import { ANNOTATION_PROFILE_V1, createAnnotationEditor, type AnnotationDocument } from "./annotation.js";
import { assertAnnotationDocument } from "./annotation-validation.js";

/** Frozen source and marks share a revision; advancing starts a new review. */
export interface AnnotationReviewDocument extends AnnotationDocument {
  readonly source: string;
}
export interface AnnotationReviewSessionOptions {
  readonly id: string;
  readonly source: string;
  readonly width: number;
  readonly height: number;
}
export function createAnnotationReviewSession(options: AnnotationReviewSessionOptions, initial?: unknown) {
  if (initial !== undefined && (!initial || typeof initial !== "object" || Array.isArray(initial))) throw Error("Invalid review source");
  const restored = initial as (AnnotationDocument & { source?: string; html?: string }) | undefined;
  const value: AnnotationReviewDocument = restored
    ? { ...restored, source: restored.source ?? restored.html! }
    : { profile: ANNOTATION_PROFILE_V1, id: options.id, source: options.source,
      sources: [{ id: options.id, src: options.id, width: options.width, height: options.height }], annotations: [] };
  // Legacy storage carried the source in `html`; retain only the canonical field.
  delete value.html;
  assertAnnotationDocument(value);
  if (typeof value.source !== "string" || value.id !== options.id || value.sources.length !== 1 || value.sources[0]!.id !== options.id) throw Error("Invalid review source");
  const document = createJSONDocument(value);
  const editor = createAnnotationEditor(document);
  return {
    editor,
    get snapshot() { return { value: document.value as AnnotationReviewDocument }; },
    subscribe: (listener: () => void) => document.subscribe(listener),
    advance(source: string) {
      document.commit([{ op: "replace", path: "", value: { ...document.value as AnnotationReviewDocument, source, annotations: [] } }]);
      editor.dispatch({ type: "selection.set", annotationId: null, mode: "replace" });
    },
  };
}
export type AnnotationReviewSession = ReturnType<typeof createAnnotationReviewSession>;
