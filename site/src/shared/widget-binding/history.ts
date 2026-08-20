import {
  applyAffordance,
  historyAffordance,
  type HistoryAffordance,
  type HistoryAffordanceMap,
  type HistoryAffordanceName,
} from "@interactive-os/json-document-affordance";

export type { HistoryAffordance as HistoryCommand, HistoryAffordanceMap as HistoryCommandMap, HistoryAffordanceName as HistoryCommandName };

export function historyCommands(snapshot: {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}): HistoryAffordanceMap {
  let commands: HistoryAffordanceMap = {
    undo: { name: "undo", disabled: true },
    redo: { name: "redo", disabled: true },
  };
  applyAffordance(historyAffordance(snapshot), {
    hand: (hand) => {
      if (hand.type === "history") commands = { undo: hand.undo, redo: hand.redo };
    },
  });
  return commands;
}
