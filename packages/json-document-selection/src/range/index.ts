import {
  selectionResult,
  type SelectionChange,
  type SelectionFamily,
} from "../core/family.js";
import type { OrderedTopology } from "../ports/index.js";

export interface SelectionRange<Point> {
  readonly anchor: Point;
  readonly focus: Point;
}

export interface RangeSelection<Point> {
  readonly kind: "range";
  readonly ranges: readonly SelectionRange<Point>[];
  readonly primaryIndex: number | null;
}

export type RangeSelectionCommand<Point> =
  | { readonly type: "collapse"; readonly point: Point }
  | { readonly type: "extend-primary"; readonly point: Point }
  | { readonly type: "add-collapsed"; readonly point: Point }
  | { readonly type: "toggle-point"; readonly point: Point }
  | { readonly type: "replace-range"; readonly range: SelectionRange<Point> }
  | { readonly type: "clear" };

export interface RangeSelectionContext<Point, Target> {
  readonly topology: OrderedTopology<Point, Target>;
}

export interface RangeSelectionMapping<Point> {
  mapPoint(point: Point): Point | null;
}

export function emptyRangeSelection<Point>(): RangeSelection<Point> {
  return { kind: "range", ranges: [], primaryIndex: null };
}

export function collapsedRangeSelection<Point>(point: Point): RangeSelection<Point> {
  return { kind: "range", ranges: [{ anchor: point, focus: point }], primaryIndex: 0 };
}

export function primaryRange<Point>(selection: RangeSelection<Point>): SelectionRange<Point> | null {
  if (selection.primaryIndex === null) return null;
  return selection.ranges[selection.primaryIndex] ?? null;
}

export function createRangeSelectionFamily<Point, Target = Point>(): SelectionFamily<
  RangeSelection<Point>,
  RangeSelectionCommand<Point>,
  RangeSelectionContext<Point, Target>,
  RangeSelectionMapping<Point>,
  Target,
  SelectionChange
> {
  return {
    transition(state, command, context) {
      const current = normalizeRangeSelection(state, context.topology);
      const next = transitionRangeSelection(current, command, context.topology);
      return selectionResult(state, next, "transition", (left, right) => (
        equalRangeSelection(left, right, context.topology.equals)
      ));
    },
    reconcile(state, context) {
      const next = normalizeRangeSelection(state, context.topology);
      return selectionResult(state, next, "reconcile", (left, right) => (
        equalRangeSelection(left, right, context.topology.equals)
      ));
    },
    map(state, mapping, context) {
      const mapped: RangeSelection<Point> = {
        kind: "range",
        ranges: state.ranges.flatMap((range) => {
          const anchor = mapping.mapPoint(range.anchor);
          const focus = mapping.mapPoint(range.focus);
          if (anchor === null && focus === null) return [];
          return [{ anchor: anchor ?? focus!, focus: focus ?? anchor! }];
        }),
        primaryIndex: state.primaryIndex,
      };
      const next = normalizeRangeSelection(mapped, context.topology);
      return selectionResult(state, next, "map", (left, right) => (
        equalRangeSelection(left, right, context.topology.equals)
      ));
    },
    targets(state, context) {
      const normalized = normalizeRangeSelection(state, context.topology);
      return normalized.ranges.flatMap((range) => context.topology.interval(range.anchor, range.focus));
    },
  };
}

export function normalizeRangeSelection<Point, Target>(
  state: RangeSelection<Point>,
  topology: OrderedTopology<Point, Target>,
): RangeSelection<Point> {
  const ranges: SelectionRange<Point>[] = [];
  let primaryIndex: number | null = null;
  for (let index = 0; index < state.ranges.length; index += 1) {
    const range = state.ranges[index]!;
    const anchor = topology.reconcilePoint(range.anchor);
    const focus = topology.reconcilePoint(range.focus);
    if (anchor === null && focus === null) continue;
    if (index === state.primaryIndex) primaryIndex = ranges.length;
    ranges.push({ anchor: anchor ?? focus!, focus: focus ?? anchor! });
  }
  if (ranges.length === 0) return emptyRangeSelection();
  return {
    kind: "range",
    ranges,
    primaryIndex: primaryIndex ?? Math.min(state.primaryIndex ?? 0, ranges.length - 1),
  };
}

function transitionRangeSelection<Point, Target>(
  state: RangeSelection<Point>,
  command: RangeSelectionCommand<Point>,
  topology: OrderedTopology<Point, Target>,
): RangeSelection<Point> {
  if (command.type === "clear") return emptyRangeSelection();
  if (command.type === "collapse") return normalizedCollapsed(command.point, topology);
  if (command.type === "replace-range") {
    return normalizeRangeSelection({ kind: "range", ranges: [command.range], primaryIndex: 0 }, topology);
  }
  if (command.type === "extend-primary") {
    const point = topology.reconcilePoint(command.point);
    if (point === null) return state;
    const primary = primaryRange(state);
    if (primary === null || state.primaryIndex === null) return collapsedRangeSelection(point);
    const ranges = [...state.ranges];
    ranges[state.primaryIndex] = { anchor: primary.anchor, focus: point };
    return { kind: "range", ranges, primaryIndex: state.primaryIndex };
  }
  if (command.type === "add-collapsed") {
    const point = topology.reconcilePoint(command.point);
    if (point === null) return state;
    return {
      kind: "range",
      ranges: [...state.ranges, { anchor: point, focus: point }],
      primaryIndex: state.ranges.length,
    };
  }

  const point = topology.reconcilePoint(command.point);
  if (point === null) return state;
  const existing = state.ranges.findIndex((range) => (
    topology.equals(range.anchor, point) && topology.equals(range.focus, point)
  ));
  if (existing < 0) {
    return {
      kind: "range",
      ranges: [...state.ranges, { anchor: point, focus: point }],
      primaryIndex: state.ranges.length,
    };
  }
  const ranges = state.ranges.filter((_, index) => index !== existing);
  if (ranges.length === 0) return emptyRangeSelection();
  return {
    kind: "range",
    ranges,
    primaryIndex: Math.min(existing, ranges.length - 1),
  };
}

function normalizedCollapsed<Point, Target>(
  point: Point,
  topology: OrderedTopology<Point, Target>,
): RangeSelection<Point> {
  const reconciled = topology.reconcilePoint(point);
  return reconciled === null ? emptyRangeSelection() : collapsedRangeSelection(reconciled);
}

function equalRangeSelection<Point>(
  left: RangeSelection<Point>,
  right: RangeSelection<Point>,
  equals: (left: Point, right: Point) => boolean,
): boolean {
  return left.primaryIndex === right.primaryIndex
    && left.ranges.length === right.ranges.length
    && left.ranges.every((range, index) => {
      const candidate = right.ranges[index];
      return candidate !== undefined
        && equals(range.anchor, candidate.anchor)
        && equals(range.focus, candidate.focus);
    });
}
