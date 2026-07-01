// Advanced selection entrypoint.
// The core document facade exposes selection as `doc.selection` when enabled.

export type {
  SelectionOptions,
  SelectionState,
} from "./application/document/selection/create.js";
export type {
  SelectionAffinity,
  SelectionEdge,
  SelectionPoint,
  SelectionPointObject,
  SelectionRange,
  SelectionRangeInput,
} from "./domain/selection/point.js";
export type {
  SelectionContext,
  SelectionMode,
  SelectionSnap,
} from "./domain/selection/snap.js";
export type {
  SelectionCursorDirection,
  SelectionCursorErrorCode,
  SelectionCursorOptions,
  SelectionCursorResult,
  SelectionCursorTarget,
} from "./domain/selection/reducer.js";
export type {
  SelectionDirection,
  SelectionOrderedRange,
  SelectionOrderedRangeEntry,
  SelectionOrderErrorCode,
  SelectionOrderOptions,
  SelectionPointOrderResult,
  SelectionRangeOrderResult,
  SelectionRangesOrderResult,
  SelectionScopeErrorCode,
  SelectionScopeOptions,
  SelectionScopeResult,
  SelectionScopeTarget,
} from "./domain/selection/order.js";
export type {
  SelectionPointerSpan,
  SelectionPointerSpansResult,
  SelectionSpanOptions,
} from "./domain/selection/spans.js";
export type {
  SelectionSource,
  SelectionType,
} from "./domain/selection/read.js";
export type {
  ReplaceSelectionTextResult,
  SelectionTextEdit,
  SelectionTextEditErrorCode,
  SelectionTextEditOptions,
  SelectionTextEditsResult,
} from "./domain/selection/textEdit.js";
export type {
  DeleteSelectionTextResult,
  SelectionTextDeleteDirection,
  SelectionTextDeleteOptions,
} from "./domain/selection/textDelete.js";
