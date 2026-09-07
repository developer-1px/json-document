import type { EditingHistory } from "@interactive-os/json-document-editing";
import { changeIdKey } from "./change.js";
import type { HistoryRuntime } from "./types.js";

/** Bind Editing to this runtime's selective history, one causal commit per step. */
export function createCollaborationEditingHistory(runtime: HistoryRuntime): EditingHistory {
  return {
    status() {
      const status = runtime.history.status();
      return {
        undoTarget: status.undoTarget === null ? null : changeIdKey(status.undoTarget),
        redoTarget: status.redoTarget === null ? null : changeIdKey(status.redoTarget),
        canUndo: runtime.history.canUndo().ok,
        canRedo: runtime.history.canRedo().ok,
        revision: status.revision,
      };
    },
    undo() {
      const result = runtime.history.undo();
      return result.ok ? { ok: true, target: changeIdKey(result.target) } : result;
    },
    redo() {
      const result = runtime.history.redo();
      return result.ok ? { ok: true, target: changeIdKey(result.target) } : result;
    },
    subscribe: (listener) => runtime.replica.subscribe(listener),
  };
}
