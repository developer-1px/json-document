import type { AffordancePreview } from "./result.js";

export type HistoryAffordanceName = "undo" | "redo";

export type HistoryAffordance = {
  readonly name: HistoryAffordanceName;
  readonly disabled: boolean;
};

export type HistoryAffordanceMap = {
  readonly undo: HistoryAffordance;
  readonly redo: HistoryAffordance;
};

export function historyAffordance(snapshot: {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}): AffordancePreview {
  return {
    hand: {
      type: "history",
      undo: { name: "undo", disabled: !snapshot.canUndo },
      redo: { name: "redo", disabled: !snapshot.canRedo },
    },
  };
}
