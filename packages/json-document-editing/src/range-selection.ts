import {
  createRangeSelectionFamily,
  type OrderedTopology,
  type RangeSelection,
} from "@interactive-os/json-document-selection";

export type RangeSelectionMode = "replace" | "extend" | "toggle";

export function selectRangePoint<Point>(
  current: RangeSelection<Point>,
  point: Point,
  mode: RangeSelectionMode,
  sameTarget: (left: Point, right: Point) => boolean,
): RangeSelection<Point> {
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
