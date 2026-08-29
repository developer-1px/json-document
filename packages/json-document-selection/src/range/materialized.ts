import {
  selectionResult,
  type SelectionChange,
  type SelectionFamily,
} from "../core/family.js";
import type { OrderedTopology } from "../ports/index.js";
import type { RangeSelection, SelectionRange } from "./index.js";

export interface MaterializedSelectionRange<Point> extends SelectionRange<Point> {
  readonly points: readonly Point[];
}

export interface MaterializedRangeSelection<Point> extends RangeSelection<Point> {
  readonly ranges: readonly MaterializedSelectionRange<Point>[];
}

export type MaterializedRangeSelectionCommand<Point> =
  | { readonly type: "collapse"; readonly point: Point }
  | { readonly type: "extend-primary"; readonly point: Point }
  | { readonly type: "toggle-point"; readonly point: Point }
  | { readonly type: "clear" };

export interface MaterializedRangeSelectionContext<Point> {
  readonly topology: OrderedTopology<Point, Point>;
}

export interface MaterializedRangeSelectionMapping<Point> {
  mapPoint(point: Point): Point | null;
}

export function emptyMaterializedRangeSelection<Point>(): MaterializedRangeSelection<Point> {
  return { kind: "range", ranges: [], primaryIndex: null };
}

export function createMaterializedRangeSelectionFamily<Point>(): SelectionFamily<
  MaterializedRangeSelection<Point>,
  MaterializedRangeSelectionCommand<Point>,
  MaterializedRangeSelectionContext<Point>,
  MaterializedRangeSelectionMapping<Point>,
  Point,
  SelectionChange
> {
  return {
    transition(state, command, context) {
      const current = normalizeMaterializedRangeSelection(state, context.topology);
      const next = transition(current, command, context.topology);
      return selectionResult(state, next, "transition", (left, right) => equal(left, right, context.topology.equals));
    },
    reconcile(state, context) {
      const next = normalizeMaterializedRangeSelection(state, context.topology);
      return selectionResult(state, next, "reconcile", (left, right) => equal(left, right, context.topology.equals));
    },
    map(state, mapping, context) {
      const mapped: MaterializedRangeSelection<Point> = {
        kind: "range",
        ranges: state.ranges.flatMap((range) => {
          const anchor = mapping.mapPoint(range.anchor);
          const focus = mapping.mapPoint(range.focus);
          const points = range.points.flatMap((point) => {
            const mappedPoint = mapping.mapPoint(point);
            return mappedPoint === null ? [] : [mappedPoint];
          });
          if (anchor === null && focus === null && points.length === 0) return [];
          const fallback = anchor ?? focus ?? points[0]!;
          return [{ anchor: anchor ?? fallback, focus: focus ?? fallback, points }];
        }),
        primaryIndex: state.primaryIndex,
      };
      const next = normalizeMaterializedRangeSelection(mapped, context.topology);
      return selectionResult(state, next, "map", (left, right) => equal(left, right, context.topology.equals));
    },
    targets(state, context) {
      return deduplicatePoints(
        normalizeMaterializedRangeSelection(state, context.topology).ranges.flatMap((range) => range.points),
        context.topology.equals,
      );
    },
  };
}

export function normalizeMaterializedRangeSelection<Point>(
  state: MaterializedRangeSelection<Point>,
  topology: OrderedTopology<Point, Point>,
): MaterializedRangeSelection<Point> {
  const ranges: MaterializedSelectionRange<Point>[] = [];
  let primaryIndex: number | null = null;
  state.ranges.forEach((range, index) => {
    const points = deduplicatePoints(range.points.flatMap((point) => {
      const reconciled = topology.reconcilePoint(point);
      return reconciled === null ? [] : [reconciled];
    }), topology.equals);
    const anchor = topology.reconcilePoint(range.anchor);
    const focus = topology.reconcilePoint(range.focus);
    if (points.length === 0 || (anchor === null && focus === null)) return;
    if (index === state.primaryIndex) primaryIndex = ranges.length;
    ranges.push({ anchor: anchor ?? focus!, focus: focus ?? anchor!, points });
  });
  if (ranges.length === 0) return emptyMaterializedRangeSelection();
  return {
    kind: "range",
    ranges,
    primaryIndex: primaryIndex ?? Math.min(state.primaryIndex ?? 0, ranges.length - 1),
  };
}

function transition<Point>(
  state: MaterializedRangeSelection<Point>,
  command: MaterializedRangeSelectionCommand<Point>,
  topology: OrderedTopology<Point, Point>,
): MaterializedRangeSelection<Point> {
  if (command.type === "clear") return emptyMaterializedRangeSelection();
  const point = topology.reconcilePoint(command.point);
  if (point === null) return state;
  if (command.type === "collapse") return collapsed(point, topology);
  if (command.type === "extend-primary") {
    if (state.primaryIndex === null) return collapsed(point, topology);
    const primary = state.ranges[state.primaryIndex];
    if (primary === undefined) return collapsed(point, topology);
    const points = topology.interval(primary.anchor, point);
    if (points.length === 0) return state;
    const ranges = [...state.ranges];
    ranges[state.primaryIndex] = { anchor: primary.anchor, focus: point, points };
    return { kind: "range", ranges, primaryIndex: state.primaryIndex };
  }
  let removed = false;
  let primaryIndex: number | null = null;
  const ranges: MaterializedSelectionRange<Point>[] = [];
  state.ranges.forEach((range, index) => {
    const points = range.points.filter((candidate) => !topology.equals(candidate, point));
    if (points.length !== range.points.length) removed = true;
    if (points.length === 0) return;
    if (index === state.primaryIndex) primaryIndex = ranges.length;
    ranges.push({
      anchor: topology.equals(range.anchor, point) ? points[0]! : range.anchor,
      focus: topology.equals(range.focus, point) ? points.at(-1)! : range.focus,
      points,
    });
  });
  if (removed) {
    return ranges.length === 0
      ? emptyMaterializedRangeSelection()
      : { kind: "range", ranges, primaryIndex: primaryIndex ?? Math.min(state.primaryIndex ?? 0, ranges.length - 1) };
  }
  return {
    kind: "range",
    ranges: [...state.ranges, { anchor: point, focus: point, points: [point] }],
    primaryIndex: state.ranges.length,
  };
}

function collapsed<Point>(point: Point, topology: OrderedTopology<Point, Point>): MaterializedRangeSelection<Point> {
  const points = topology.interval(point, point);
  return points.length === 0
    ? emptyMaterializedRangeSelection()
    : { kind: "range", ranges: [{ anchor: point, focus: point, points }], primaryIndex: 0 };
}

function deduplicatePoints<Point>(points: readonly Point[], equals: (left: Point, right: Point) => boolean): Point[] {
  return points.filter((point, index) => points.findIndex((candidate) => equals(candidate, point)) === index);
}

function equal<Point>(
  left: MaterializedRangeSelection<Point>,
  right: MaterializedRangeSelection<Point>,
  equals: (left: Point, right: Point) => boolean,
): boolean {
  return left.primaryIndex === right.primaryIndex
    && left.ranges.length === right.ranges.length
    && left.ranges.every((range, index) => {
      const candidate = right.ranges[index];
      return candidate !== undefined
        && equals(range.anchor, candidate.anchor)
        && equals(range.focus, candidate.focus)
        && range.points.length === candidate.points.length
        && range.points.every((point, pointIndex) => equals(point, candidate.points[pointIndex]!));
    });
}
