export type HistoryCommandName = "undo" | "redo";

export type HistoryCommand = {
  readonly name: HistoryCommandName;
  readonly disabled: boolean;
};

export type HistoryCommandMap = {
  readonly undo: HistoryCommand;
  readonly redo: HistoryCommand;
};

export function historyCommands(snapshot: {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}): HistoryCommandMap {
  return {
    undo: { name: "undo", disabled: !snapshot.canUndo },
    redo: { name: "redo", disabled: !snapshot.canRedo },
  };
}
