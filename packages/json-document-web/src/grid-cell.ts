import type { GridPoint } from "@interactive-os/json-document-editing";

export interface WebGridCellAddressAttributes {
  readonly "data-grid-row-id": string;
  readonly "data-grid-column-id": string;
}

export interface WebGridCellAddressElement {
  getAttribute(name: string): string | null;
}

export interface WebGridCellAddressRoot<Cell extends WebGridCellAddressElement> {
  querySelectorAll(selectors: string): ArrayLike<Cell>;
}

/** Projects a canonical grid point to stable Web DOM address attributes. */
export function webGridCellAddressProps(point: GridPoint): WebGridCellAddressAttributes {
  return {
    "data-grid-row-id": point.rowId,
    "data-grid-column-id": point.columnId,
  };
}

/** Finds the rendered grid cell for a canonical point without owning focus policy. */
export function findWebGridCell<Cell extends WebGridCellAddressElement>(
  root: WebGridCellAddressRoot<Cell> | null,
  point: GridPoint,
): Cell | null {
  if (root === null) return null;
  const cells = root.querySelectorAll("[data-grid-row-id][data-grid-column-id]");
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];
    if (cell?.getAttribute("data-grid-row-id") === point.rowId
      && cell.getAttribute("data-grid-column-id") === point.columnId) {
      return cell;
    }
  }
  return null;
}
