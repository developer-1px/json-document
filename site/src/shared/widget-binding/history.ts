import {
  historyAffordance,
  historyCommandsFrom,
  type HistoryAffordance,
  type HistoryAffordanceMap,
  type HistoryAffordanceName,
} from "@interactive-os/json-document-affordance";

export type { HistoryAffordance as HistoryCommand, HistoryAffordanceMap as HistoryCommandMap, HistoryAffordanceName as HistoryCommandName };

export function historyCommands(snapshot: {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}): HistoryAffordanceMap {
  return historyCommandsFrom(historyAffordance(snapshot));
}
