/** Captured user selection for an agent request; consumers must read current content before editing. */
export interface CanvasEditTarget {
  readonly objectIds: readonly string[];
  readonly nodeId?: string;
  readonly label: string;
}
