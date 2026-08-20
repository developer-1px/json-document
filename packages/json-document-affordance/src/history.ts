import type { AffordanceResult } from "./result.js";

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
}): AffordanceResult {
  return {
    hand: {
      type: "history",
      undo: { name: "undo", disabled: !snapshot.canUndo },
      redo: { name: "redo", disabled: !snapshot.canRedo },
    },
  };
}

export function historyCommandsFrom(result: AffordanceResult): HistoryAffordanceMap {
  if (result.hand?.type !== "history") {
    return {
      undo: { name: "undo", disabled: true },
      redo: { name: "redo", disabled: true },
    };
  }
  return { undo: result.hand.undo, redo: result.hand.redo };
}
