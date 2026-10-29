import { createObjectEditor, createCanvasEditorTools } from "@interactive-os/json-document-editing";
import type { CollaborationParticipant } from "./workspace.js";
import type { EditingHistory, EditingHistoryStatus } from "@interactive-os/json-document-editing";
import { changeIdKey } from "./change.js";
import type { HistoryRuntime, HistoryStatus } from "./types.js";

/** Bind Editing to this runtime's selective history, one causal commit per step. */
export function createCollaborationEditingHistory(runtime: HistoryRuntime): EditingHistory {
  return {
    status() {
      const status = runtime.history.status();
      return editingStatus({
        ...status,
        canUndo: runtime.history.canUndo().ok,
        canRedo: runtime.history.canRedo().ok,
      });
    },
    undo() {
      const result = runtime.history.undo();
      return result.ok ? { ok: true, target: changeIdKey(result.target), change: result.change, status: editingStatus(result.status) } : result;
    },
    redo() {
      const result = runtime.history.redo();
      return result.ok ? { ok: true, target: changeIdKey(result.target), change: result.change, status: editingStatus(result.status) } : result;
    },
    subscribe: (listener) => runtime.replica.subscribe(listener),
  };
}

function editingStatus(status: HistoryStatus & { readonly canUndo: boolean; readonly canRedo: boolean }): EditingHistoryStatus {
  return Object.freeze({
    undoTarget: status.undoTarget === null ? null : changeIdKey(status.undoTarget),
    redoTarget: status.redoTarget === null ? null : changeIdKey(status.redoTarget),
    canUndo: status.canUndo,
    canRedo: status.canRedo,
    revision: status.revision,
  });
}

/** Use the participant's observed document, selective history and publication lifecycle. */
export function createCollaborationCanvasTools(participant: CollaborationParticipant, options: Parameters<typeof createObjectEditor>[1] = {}, htmlAdapter?: Parameters<typeof createCanvasEditorTools>[2]) {
  const editor = createObjectEditor(participant.runtime.document, {
    ...options, history: createCollaborationEditingHistory(participant.runtime),
  });
  return createCanvasEditorTools(editor, { read: () => { participant.observe(); return { collaboration: participant.runtime.replica.status() }; }, publish: participant.publish }, htmlAdapter);
}

export { createCollaborationCanvasReview } from "./canvas-review.js";
export type { CollaborationCanvasReviewOptions } from "./canvas-review.js";
