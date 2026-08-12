export interface NavigationState<Point> {
  readonly current: Point | null;
}

export type EditingMode<Lease extends string = string> =
  | { readonly kind: "navigate" }
  | { readonly kind: "edit"; readonly lease: Lease };

export interface SelectionSession<Selection, Point, Lease extends string = string> {
  readonly selection: Selection;
  readonly navigation: NavigationState<Point>;
  readonly editing: EditingMode<Lease>;
}

export interface ScopedSelection<Scope extends string, Selection> {
  readonly scope: Scope;
  readonly selection: Selection;
}

export interface SelectionEditIntent<Selection, Intent> {
  readonly selection: Selection;
  readonly intent: Intent;
}

export interface SelectionEditResult<Selection, Patch> {
  readonly forward: readonly Patch[];
  readonly inverse: readonly Patch[];
  readonly selectionAfter: Selection;
}

export interface SelectionHistoryEntry<Selection, Patch> {
  readonly forward: readonly Patch[];
  readonly inverse: readonly Patch[];
  readonly selectionBefore: Selection;
  readonly selectionAfter: Selection;
}
