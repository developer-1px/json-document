export {
  createContentEditableAdapter,
  createContentEditableAdapter as createCollaborationContentEditableAdapter,
} from "./lease.js";
export {
  plainTextDOMAdapter,
  plainTextDOMAdapter as plainTextCollaborationDOM,
} from "./dom/plain-text.js";
export type {
  ContentEditableAdapter,
  ContentEditableOptions,
  ContentEditableResult,
  DOMObservation,
  CollaborationContentEditableAdapter,
  CollaborationContentEditableOptions,
  CollaborationContentEditableResult,
  CollaborationTextDOM,
  CollaborationTextDOMObservation,
  TextDOMAdapter,
} from "./types.js";
