export { selectionResult } from "./core/family.js";
export { traverseGrid } from "./interaction/grid-traversal.js";
export type { GridTraversalIndex, GridTraversalOptions } from "./interaction/grid-traversal.js";
export {
  createKeySelectionFamily,
  emptyKeySelection,
  normalizeKeySelection,
} from "./key/index.js";
export {
  collapsedRangeSelection,
  createRangeSelectionFamily,
  emptyRangeSelection,
  normalizeRangeSelection,
  primaryRange,
} from "./range/index.js";
export {
  createMaterializedRangeSelectionFamily,
  emptyMaterializedRangeSelection,
  normalizeMaterializedRangeSelection,
  resolveMaterializedSelectionDragSource,
} from "./range/materialized.js";
export type {
  SelectionChange,
  SelectionFamily,
  SelectionLifecycle,
  SelectionResult,
} from "./core/family.js";
export type { SelectionHistoryEntry } from "./core/session.js";
export type {
  KeySelection,
  KeySelectionCommand,
  KeySelectionContext,
  KeySelectionMapping,
} from "./key/index.js";
export type {
  RangeSelection,
  RangeSelectionCommand,
  RangeSelectionContext,
  RangeSelectionMapping,
  SelectionRange,
} from "./range/index.js";
export type {
  MaterializedRangeSelection,
  MaterializedRangeSelectionCommand,
  MaterializedRangeSelectionContext,
  MaterializedRangeSelectionMapping,
  MaterializedSelectionRange,
  MaterializedSelectionDragSource,
} from "./range/materialized.js";
export type { NavigationCommand, SelectionOperation } from "./interaction/index.js";
export type { OrderedTopology } from "./ports/index.js";
