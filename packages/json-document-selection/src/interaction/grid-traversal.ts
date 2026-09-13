/** Ordinal coordinates in the visible axes, independent of cell IDs and DOM. */
export interface GridTraversalIndex {
  readonly rowIndex: number;
  readonly columnIndex: number;
}

export interface GridTraversalOptions {
  readonly rowCount: number;
  readonly columnCount: number;
  readonly order: "row-major" | "column-major";
  readonly reverse?: boolean;
  /** Cycle inside an explicitly selected rectangle. Outside a selection, stop at the boundary. */
  readonly wrap?: boolean;
}

/** Traverse visible rectangular axes without materializing their cells (including large sparse sheets). */
export function traverseGrid(index: GridTraversalIndex, options: GridTraversalOptions): GridTraversalIndex | null {
  const {rowCount, columnCount, order} = options;
  if (![rowCount, columnCount, index.rowIndex, index.columnIndex].every(Number.isSafeInteger)
    || rowCount <= 0 || columnCount <= 0 || !Number.isSafeInteger(rowCount * columnCount)
    || index.rowIndex < 0 || index.rowIndex >= rowCount || index.columnIndex < 0 || index.columnIndex >= columnCount) return null;
  const width = order === "row-major" ? columnCount : rowCount;
  const offset = order === "row-major" ? index.rowIndex * width + index.columnIndex : index.columnIndex * width + index.rowIndex;
  const count = rowCount * columnCount;
  let next = offset + (options.reverse ? -1 : 1);
  if (options.wrap) next = (next + count) % count;
  if (next < 0 || next >= count) return null;
  return order === "row-major"
    ? {rowIndex: Math.floor(next / width), columnIndex: next % width}
    : {rowIndex: next % width, columnIndex: Math.floor(next / width)};
}
