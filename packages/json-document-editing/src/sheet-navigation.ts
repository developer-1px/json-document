import { traverseGrid } from "@interactive-os/json-document-selection";
import { gridPointIndex, gridRangeBounds, type GridPoint, type GridTopology } from "./topology.js";
import type { SheetSelection } from "./sheet.js";

export type SheetTraversalDirection = "previous" | "next" | "up" | "down";

/** Sequential entry preserves a rectangular selection while moving its active cell. */
export function sheetNavigationTarget(topology: GridTopology, selection: SheetSelection, direction: SheetTraversalDirection): {readonly point: GridPoint; readonly preserveRange: boolean} | null {
  const focus = selection.focus;
  const index = focus && gridPointIndex(topology, focus);
  if (!index) return null;
  const primary = selection.primaryIndex === null ? undefined : selection.ranges[selection.primaryIndex];
  const bounds = primary && gridRangeBounds(topology, primary);
  const inRange = bounds && index.rowIndex >= bounds.rowStart && index.rowIndex <= bounds.rowEnd
    && index.columnIndex >= bounds.columnStart && index.columnIndex <= bounds.columnEnd;
  if (bounds && inRange && (bounds.rowEnd > bounds.rowStart || bounds.columnEnd > bounds.columnStart)) {
    const next = traverseGrid({rowIndex: index.rowIndex - bounds.rowStart, columnIndex: index.columnIndex - bounds.columnStart}, {
      rowCount: bounds.rowEnd - bounds.rowStart + 1, columnCount: bounds.columnEnd - bounds.columnStart + 1,
      order: direction === "up" || direction === "down" ? "column-major" : "row-major",
      reverse: direction === "previous" || direction === "up", wrap: true,
    });
    return next ? {point: {rowId: topology.rowIds[next.rowIndex + bounds.rowStart]!, columnId: topology.columnIds[next.columnIndex + bounds.columnStart]!}, preserveRange: true} : null;
  }
  if (direction === "up" || direction === "down") {
    const rowId = topology.rowIds[index.rowIndex + (direction === "up" ? -1 : 1)];
    return rowId === undefined ? null : {point: {rowId, columnId: focus!.columnId}, preserveRange: false};
  }
  const next = traverseGrid(index, {rowCount: topology.rowIds.length, columnCount: topology.columnIds.length,
    order: "row-major", reverse: direction === "previous"});
  return next ? {point: {rowId: topology.rowIds[next.rowIndex]!, columnId: topology.columnIds[next.columnIndex]!}, preserveRange: false} : null;
}
