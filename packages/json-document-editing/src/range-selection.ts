import {
  createRangeSelectionFamily,
  type OrderedTopology,
  type RangeSelection,
  type SelectionRange,
} from "@interactive-os/json-document-selection";

export type RangeSelectionMode = "replace" | "extend" | "toggle";

export function selectRangePoint<Point>(
  current: RangeSelection<Point>,
  point: Point,
  mode: RangeSelectionMode,
  sameTarget: (left: Point, right: Point) => boolean,
): RangeSelection<Point> {
  const topology = pointTopology(sameTarget);
  const family = createRangeSelectionFamily<Point>();
  return family.transition(current, mode === "replace"
    ? { type: "collapse", point }
    : mode === "extend"
      ? { type: "extend-primary", point }
      : { type: "toggle-point", point }, { topology }).state;
}

/** Replace all ranges in one transition; a missing domain range clears selection. */
export function replaceRangeSelection<Point>(
  current: RangeSelection<Point>,
  range: SelectionRange<Point> | null,
  sameTarget: (left: Point, right: Point) => boolean,
): RangeSelection<Point> {
  return createRangeSelectionFamily<Point>().transition(current,
    range === null ? { type: "clear" } : { type: "replace-range", range },
    { topology: pointTopology(sameTarget) }).state;
}

function pointTopology<Point>(equals: (left: Point, right: Point) => boolean): OrderedTopology<Point, Point> {
  return {
    equals,
    interval: (anchor, focus) => equals(anchor, focus) ? [anchor] : [anchor, focus],
    reconcilePoint: (candidate) => candidate,
  };
}

/** Reconcile domain points while retaining the canonical range/primary rules. */
export function reconcileRangeSelection<Point>(
  selection: RangeSelection<Point>,
  reconcilePoint: (point: Point) => Point | null,
): RangeSelection<Point> {
  return createRangeSelectionFamily<Point>().reconcile(selection, {
    topology: {
      equals: (left, right) => left === right,
      interval: (anchor, focus) => [anchor, focus],
      reconcilePoint,
    },
  }).state;
}
