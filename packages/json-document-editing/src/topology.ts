import { createOrderedAxis } from "./ordered-axis.js";

/** Visible order on one axis. Tree rows, document blocks. */
export interface LineTopology {
  readonly ids: ReadonlyArray<string>;
}

/** Visible order on two axes. Sheet rows×columns. */
export interface GridTopology {
  readonly rowIds: ReadonlyArray<string>;
  readonly columnIds: ReadonlyArray<string>;
}

export interface GridPoint {
  readonly rowId: string;
  readonly columnId: string;
}

export interface GridRangeBounds {
  readonly rowStart: number;
  readonly rowEnd: number;
  readonly columnStart: number;
  readonly columnEnd: number;
}

export function lineTopology(ids: ReadonlyArray<string>): LineTopology {
  return { ids };
}

export function gridTopology(
  rowIds: ReadonlyArray<string>,
  columnIds: ReadonlyArray<string>,
): GridTopology {
  return { rowIds, columnIds };
}

export function lineInterval(
  topology: LineTopology,
  anchorId: string,
  focusId: string,
): ReadonlyArray<string> {
  return createOrderedAxis(topology.ids).interval(anchorId, focusId);
}

export function gridPointIndex(
  topology: GridTopology,
  point: GridPoint,
): { readonly rowIndex: number; readonly columnIndex: number } | null {
  const rowIndex = createOrderedAxis(topology.rowIds).indexOf(point.rowId);
  const columnIndex = createOrderedAxis(topology.columnIds).indexOf(point.columnId);
  if (rowIndex === null || columnIndex === null) return null;
  return { rowIndex, columnIndex };
}

export function gridRangeBounds(
  topology: GridTopology,
  range: { readonly anchor: GridPoint; readonly focus: GridPoint },
): GridRangeBounds | null {
  const anchor = gridPointIndex(topology, range.anchor);
  const focus = gridPointIndex(topology, range.focus);
  if (anchor === null || focus === null) return null;
  return {
    rowStart: Math.min(anchor.rowIndex, focus.rowIndex),
    rowEnd: Math.max(anchor.rowIndex, focus.rowIndex),
    columnStart: Math.min(anchor.columnIndex, focus.columnIndex),
    columnEnd: Math.max(anchor.columnIndex, focus.columnIndex),
  };
}

export function gridCellsInRange(
  topology: GridTopology,
  range: { readonly anchor: GridPoint; readonly focus: GridPoint },
): ReadonlyArray<GridPoint> {
  const bounds = gridRangeBounds(topology, range);
  if (bounds === null) return [];
  const cells: GridPoint[] = [];
  for (let row = bounds.rowStart; row <= bounds.rowEnd; row += 1) {
    for (let column = bounds.columnStart; column <= bounds.columnEnd; column += 1) {
      cells.push({
        rowId: topology.rowIds[row]!,
        columnId: topology.columnIds[column]!,
      });
    }
  }
  return cells;
}
