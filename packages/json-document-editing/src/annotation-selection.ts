import { createKeySelectionFamily, type KeySelection, type KeySelectionContext } from "@interactive-os/json-document-selection";
import type { AnnotationDocument, AnnotationIntent, AnnotationSelection } from "./annotation.js";

const family = createKeySelectionFamily();

// Annotation exposes insertion order. The domain supplies that traversal order;
// the Key family alone owns membership, primary fallback, and reconciliation.
function context(selection: AnnotationSelection, document: AnnotationDocument): KeySelectionContext {
  const rank = new Map(selection.ids.map((id, index) => [id, index]));
  return {
    keys: document.annotations.map(({ id }) => id).sort((a, b) => (rank.get(a) ?? rank.size) - (rank.get(b) ?? rank.size)),
    universe: document.id,
    universeMismatch: "clear",
  };
}
function toKey(selection: AnnotationSelection): KeySelection {
  return { kind: "explicit", keys: selection.ids, primaryKey: selection.primaryId };
}
function fromKey(selection: KeySelection, domain: KeySelectionContext): AnnotationSelection {
  return { kind: "annotation", ids: family.targets(selection, domain), primaryId: selection.primaryKey };
}
export function reconcileAnnotationSelection(selection: AnnotationSelection, document: AnnotationDocument): AnnotationSelection {
  const domain = context(selection, document);
  return fromKey(family.reconcile(toKey(selection), domain).state, domain);
}
export function transitionAnnotationSelection(selection: AnnotationSelection, intent: Extract<AnnotationIntent, { type: "selection.set" }>, document: AnnotationDocument): AnnotationSelection {
  const domain = context(selection, document);
  const command = intent.annotationId === null ? { type: "clear" as const } : { type: intent.mode, keys: [intent.annotationId], primaryKey: intent.annotationId };
  return fromKey(family.transition(toKey(selection), command, domain).state, domain);
}
