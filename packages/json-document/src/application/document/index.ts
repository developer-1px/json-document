// json-document — application document facade.
// Lower-layer helpers are exposed through application-owned surface modules so
// package consumers do not import domain/foundation paths directly.

export { createJSONDocument } from "./create.js";
export type {
  JSONCapabilityResult,
  JSONDocument,
  JSONDocumentOptions,
} from "./contract.js";
export type {
  JSONDocumentSchemaInput,
  JSONDocumentSchemaLike,
  JSONDocumentSchemaOutput,
} from "./schema-type.js";

export { JSONDocumentError } from "./error.js";
export type {
  HistoryTransactionOptions,
  JSONChangeMetadata,
  JSONDocumentCommitOptions,
  JSONDocumentHistory,
  JSONDocumentSelectionTarget,
} from "./history.js";
export type {
  JSONDocumentDuplicateError,
  JSONDocumentDuplicateOptions,
  JSONDocumentDuplicateResult,
  JSONDocumentEditError,
  JSONDocumentEditResult,
  JSONDocumentInsertOptions,
  JSONDocumentInsertTarget,
  JSONDocumentMoveTarget,
} from "./editing.js";
export type {
  JSONDocumentPasteOptions,
  JSONDocumentPasteTarget,
  ClipboardCopyOptions,
  ClipboardCopyError,
  ClipboardCopyOk,
  ClipboardCopyResult,
  ClipboardCutOk,
  ClipboardCutError,
  ClipboardCutOptions,
  ClipboardCutResult,
  ClipboardEmpty,
  ClipboardMutationOk,
  ClipboardPasteDiscriminatorMismatch,
  ClipboardPasteError,
  ClipboardPasteResult,
  ClipboardReadOk,
  ClipboardReadOptions,
  ClipboardReadResult,
  ClipboardState,
  ClipboardWriteOptions,
  ClipboardSource,
} from "./clipboard.js";
export type {
  EntriesResult,
  EntryKind,
  QueryResult,
  ReadEntry,
  ReadResult,
} from "./reading.js";
export type {
  SchemaDescription,
  SchemaDescriptionResult,
  SchemaErrorCode,
  SchemaErrorResult,
  SchemaKind,
  SchemaKindResult,
  SchemaPathMode,
  SchemaQueryResult,
  SchemaState,
} from "./schema.js";
export type {
  SelectionOptions,
  SelectionState,
  SelectionAffinity,
  SelectionContext,
  SelectionCursorDirection,
  SelectionCursorErrorCode,
  SelectionCursorOptions,
  SelectionCursorResult,
  SelectionCursorTarget,
  SelectionDirection,
  SelectionEdge,
  SelectionMode,
  SelectionOrderErrorCode,
  SelectionOrderOptions,
  SelectionOrderedRange,
  SelectionOrderedRangeEntry,
  SelectionPoint,
  SelectionPointObject,
  SelectionPointOrderResult,
  SelectionPointerSpan,
  SelectionPointerSpansResult,
  SelectionRange,
  SelectionRangeInput,
  SelectionRangeOrderResult,
  SelectionRangesOrderResult,
  SelectionScopeErrorCode,
  SelectionScopeOptions,
  SelectionScopeResult,
  SelectionScopeTarget,
  SelectionSnap,
  SelectionSource,
  SelectionSpanOptions,
  SelectionType,
  DeleteSelectionTextResult,
  ReplaceSelectionTextResult,
  SelectionTextDeleteDirection,
  SelectionTextDeleteOptions,
  SelectionTextEdit,
  SelectionTextEditErrorCode,
  SelectionTextEditOptions,
  SelectionTextEditsResult,
} from "./selection.js";
export {
  applyOperation,
  applyPatch,
  applyPatchToTrustedState,
} from "./patch.js";
export type {
  JSONPatchInput,
  JSONPatchOperation,
  JSONResult,
} from "./patch.js";
export {
  parsePointer,
  tryParsePointer,
  buildPointer,
  escapeSegment,
  unescapeSegment,
  PointerSyntaxError,
  parentPointer,
  lastSegment,
  lastSegmentIndex,
  appendSegment,
  withLastSegment,
  resolveSiblingRange,
  trackPointer,
} from "./pointer.js";
export type {
  Pointer,
  ResolveSiblingRangeOptions,
  SiblingLocation,
  SiblingRangeErrorCode,
  SiblingRangeResult,
} from "./pointer.js";
export {
  replaceTextSurfaceSelection,
  syncTextSurfaceMutation,
  textSurfaceFragment,
} from "./text-surface.js";
export type {
  TextSurface,
  TextSurfaceAtom,
  TextSurfaceError,
  TextSurfaceErrorCode,
  TextSurfaceFragment,
  TextSurfaceFragmentResult,
  TextSurfaceMutationRange,
  TextSurfaceMutationResult,
  TextSurfaceRange,
  TextSurfaceReplaceOptions,
  TextSurfaceReplaceResult,
  TextSurfaceReplacement,
  TextSurfaceSelectionRange,
} from "./text-surface.js";
