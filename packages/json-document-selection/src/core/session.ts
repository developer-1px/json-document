export interface SelectionHistoryEntry<Selection, Patch> {
  readonly forward: readonly Patch[];
  readonly inverse: readonly Patch[];
  readonly selectionBefore: Selection;
  readonly selectionAfter: Selection;
}
