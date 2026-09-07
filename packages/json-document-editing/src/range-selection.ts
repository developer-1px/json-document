import {
  collapsedRangeSelection as collapsed,
  createRangeSelectionFamily,
  emptyRangeSelection as empty,
  primaryRange,
  type OrderedTopology,
  type RangeSelection,
  type SelectionRange,
} from "@interactive-os/json-document-selection";

export type RangeSelectionState<Point> = RangeSelection<Point>;
export type { SelectionRange };

export type RangeSelectionMode = "replace" | "extend" | "toggle";

export function selectRangePoint<Point>(
  current: RangeSelectionState<Point>,
  point: Point,
  mode: RangeSelectionMode,
  sameTarget: (left: Point, right: Point) => boolean,
): RangeSelectionState<Point> {
  const topology: OrderedTopology<Point, Point> = {
    equals: sameTarget,
    interval: (anchor, focus) => sameTarget(anchor, focus) ? [anchor] : [anchor, focus],
    reconcilePoint: (candidate) => candidate,
  };
  const family = createRangeSelectionFamily<Point>();
  return family.transition(current, mode === "replace"
    ? { type: "collapse", point }
    : mode === "extend"
      ? { type: "extend-primary", point }
      : { type: "toggle-point", point }, { topology }).state;
}

export function collapsedRangeSelection<Point>(point: Point): RangeSelectionState<Point> {
  return collapsed(point);
}

export function emptyRangeSelection<Point>(): RangeSelectionState<Point> {
  return empty();
}

/** Reconcile domain points while retaining the canonical range/primary rules. */
export function reconcileRangeSelection<Point>(
  selection: RangeSelectionState<Point>,
  reconcilePoint: (point: Point) => Point | null,
): RangeSelectionState<Point> {
  return createRangeSelectionFamily<Point>().reconcile(selection, {
    topology: {
      equals: (left, right) => left === right,
      interval: (anchor, focus) => [anchor, focus],
      reconcilePoint,
    },
  }).state;
}

export { primaryRange };
