export interface SelectionRange<Point> {
  readonly anchor: Point;
  readonly focus: Point;
}

export interface RangeSelectionState<Point> {
  readonly ranges: ReadonlyArray<SelectionRange<Point>>;
  readonly primaryIndex: number;
}

export type RangeSelectionMode = "replace" | "extend" | "toggle";

export function selectRangePoint<Point>(
  current: RangeSelectionState<Point>,
  point: Point,
  mode: RangeSelectionMode,
  sameTarget: (left: Point, right: Point) => boolean,
): RangeSelectionState<Point> {
  if (mode === "replace") return collapsedRangeSelection(point);

  if (mode === "extend") {
    const primary = primaryRange(current);
    if (primary === null) return collapsedRangeSelection(point);
    const ranges = [...current.ranges];
    ranges[normalPrimaryIndex(current)] = {
      anchor: primary.anchor,
      focus: point,
    };
    return { ranges, primaryIndex: normalPrimaryIndex(current) };
  }

  const existing = current.ranges.findIndex((range) => (
    sameTarget(range.anchor, point)
    && sameTarget(range.focus, point)
  ));
  if (existing < 0) {
    return {
      ranges: [...current.ranges, { anchor: point, focus: point }],
      primaryIndex: current.ranges.length,
    };
  }

  const ranges = current.ranges.filter((_, index) => index !== existing);
  if (ranges.length === 0) return emptyRangeSelection();
  return {
    ranges,
    primaryIndex: Math.min(existing, ranges.length - 1),
  };
}

export function collapsedRangeSelection<Point>(point: Point): RangeSelectionState<Point> {
  return { ranges: [{ anchor: point, focus: point }], primaryIndex: 0 };
}

export function emptyRangeSelection<Point>(): RangeSelectionState<Point> {
  return { ranges: [], primaryIndex: 0 };
}

export function primaryRange<Point>(
  selection: RangeSelectionState<Point>,
): SelectionRange<Point> | null {
  if (selection.ranges.length === 0) return null;
  return selection.ranges[normalPrimaryIndex(selection)] ?? null;
}

function normalPrimaryIndex<Point>(selection: RangeSelectionState<Point>): number {
  return Math.min(
    Math.max(0, selection.primaryIndex),
    Math.max(0, selection.ranges.length - 1),
  );
}
