export type HistoryAffordanceName = "undo" | "redo";

import type { AffordancePreview } from "./result.js";

export type HistoryAffordance<Name extends HistoryAffordanceName = HistoryAffordanceName> = {
  readonly name: Name;
  readonly disabled: boolean;
};

export type HistoryAffordanceMap = {
  readonly undo: HistoryAffordance<"undo">;
  readonly redo: HistoryAffordance<"redo">;
};

type HistoryAffordanceHand = { readonly type: "history" } & HistoryAffordanceMap;

export type HistoryAffordanceResult = AffordancePreview<HistoryAffordanceHand> & {
  readonly hand: HistoryAffordanceHand;
};

export function historyAffordance(snapshot: {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}): HistoryAffordanceResult {
  return {
    hand: {
      type: "history",
      undo: { name: "undo", disabled: !snapshot.canUndo },
      redo: { name: "redo", disabled: !snapshot.canRedo },
    },
  };
}
