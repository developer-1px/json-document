export type {
  CapabilityResult,
} from "./capabilities/result.js";
export { createDocumentRuntime } from "./create.js";
export type {
  DocumentRuntime,
  DocumentRuntimeOptions,
} from "./create.js";
export type {
  ClipboardCopyError,
  ClipboardCopyOk,
  ClipboardCopyOptions,
  ClipboardCopyResult,
  ClipboardCutError,
  ClipboardCutOk,
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
  ClipboardSource,
  ClipboardState,
  ClipboardWriteOptions,
  JSONDocumentPasteOptions,
  JSONDocumentPasteTarget,
} from "./clipboard/contract.js";
export type {
  JSONDocumentDuplicateError,
  JSONDocumentDuplicateOptions,
  JSONDocumentDuplicateResult,
  JSONDocumentEditError,
  JSONDocumentEditOk,
  JSONDocumentEditResult,
} from "./editing/actions.js";
export type {
  JSONDocumentInsertOptions,
  JSONDocumentInsertTarget,
  JSONDocumentMoveTarget,
} from "./editing/target.js";
export {
  JSONDocumentError,
} from "../../foundation/error/index.js";
export type {
  ErrorPolicy,
} from "../../foundation/error/index.js";
export type {
  HistoryTransactionOptions,
  JSONChangeMetadata,
  JSONDocumentCommitOptions,
  JSONDocumentSelectionTarget,
} from "./history/metadata.js";
export type { JSONDocumentHistory } from "./history/undoRedo.js";
export {
  applyOperation,
  applyPatch,
} from "../../foundation/patch/index.js";
export { applyPatchToTrustedState } from "../schema/validation/patch.js";
export type {
  JSONPatchOperation,
  JSONResult,
} from "../../foundation/patch/index.js";
export type { JSONPatchInput } from "./state/patch.js";
export {
  PointerSyntaxError,
  appendSegment,
  buildPointer,
  escapeSegment,
  lastSegment,
  lastSegmentIndex,
  parentPointer,
  parsePointer,
  resolveSiblingRange,
  tryParsePointer,
  unescapeSegment,
  withLastSegment,
} from "../../foundation/pointer/index.js";
export { trackPointer } from "../../foundation/patch/index.js";
export type {
  Pointer,
  ResolveSiblingRangeOptions,
  SiblingLocation,
  SiblingRangeErrorCode,
  SiblingRangeResult,
} from "../../foundation/pointer/index.js";
export type {
  EntriesResult,
  EntryKind,
  QueryResult,
  ReadEntry,
  ReadResult,
} from "./reading/read.js";
export type {
  SchemaDescription,
  SchemaKind,
} from "./schema/description.js";
export type {
  SchemaDescriptionResult,
  SchemaKindResult,
  SchemaQueryResult,
} from "./schema/query.js";
export type {
  SchemaErrorCode,
  SchemaErrorResult,
  SchemaPathMode,
} from "./schema/resolve.js";
export type { SchemaState } from "./schema/state.js";
export type {
  SelectionOptions,
  SelectionState,
} from "./selection/create.js";
export {
  replaceTextSurfaceSelection,
  syncTextSurfaceMutation,
  textSurfaceFragment,
} from "./text-surface/index.js";
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
} from "./text-surface/index.js";
export type {
  DeleteSelectionTextResult,
  SelectionTextDeleteDirection,
  SelectionTextDeleteOptions,
} from "../selection/textDelete.js";
export type {
  ReplaceSelectionTextResult,
  SelectionTextEdit,
  SelectionTextEditErrorCode,
  SelectionTextEditOptions,
  SelectionTextEditsResult,
} from "../selection/textEdit.js";
export type {
  SelectionAffinity,
  SelectionEdge,
  SelectionPoint,
  SelectionPointObject,
  SelectionRange,
  SelectionRangeInput,
} from "../selection/point.js";
export type {
  SelectionContext,
  SelectionMode,
  SelectionSnap,
} from "../selection/snap.js";
export type {
  SelectionCursorDirection,
  SelectionCursorErrorCode,
  SelectionCursorOptions,
  SelectionCursorResult,
  SelectionCursorTarget,
} from "../selection/reducer.js";
export type {
  SelectionDirection,
  SelectionOrderErrorCode,
  SelectionOrderOptions,
  SelectionOrderedRange,
  SelectionOrderedRangeEntry,
  SelectionPointOrderResult,
  SelectionRangeOrderResult,
  SelectionRangesOrderResult,
  SelectionScopeErrorCode,
  SelectionScopeOptions,
  SelectionScopeResult,
  SelectionScopeTarget,
} from "../selection/order.js";
export type {
  SelectionPointerSpan,
  SelectionPointerSpansResult,
  SelectionSpanOptions,
} from "../selection/spans.js";
export type {
  SelectionSource,
  SelectionType,
} from "../selection/read.js";
