export { selectionResult } from "./core/family.js";
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
  idlePointerInteraction,
  reduceMarqueeInteraction,
  reduceNavigation,
  reducePressInteraction,
} from "./interaction/index.js";
export type {
  SelectionChange,
  SelectionFamily,
  SelectionLifecycle,
  SelectionResult,
} from "./core/family.js";
export type {
  EditingMode,
  NavigationState,
  ScopedSelection,
  SelectionEditIntent,
  SelectionEditResult,
  SelectionHistoryEntry,
  SelectionSession,
} from "./core/session.js";
export type {
  KeySelection,
  KeySelectionCommand,
  KeySelectionContext,
  KeySelectionMapping,
} from "./key/index.js";
export type { MaskAlgebra, MaskSelection } from "./mask/index.js";
export type {
  RangeSelection,
  RangeSelectionCommand,
  RangeSelectionContext,
  RangeSelectionMapping,
  SelectionRange,
} from "./range/index.js";
export type {
  InteractionResult,
  MarqueeContext,
  MarqueeSelection,
  NavigationCommand,
  NavigationContext,
  NavigationResult,
  PointerInteractionState,
  PointerSample,
  PressSelection,
  SelectionOperation,
} from "./interaction/index.js";
export type { OrderedTopology, RegionBuilder, SpatialIndex } from "./ports/index.js";
