import type { JSONAppliedChange } from "@interactive-os/json-document";

/** Optional history owner. Its steps replace local inverse-patch history. */
export interface EditingHistory {
  status(): EditingHistoryStatus;
  undo(): EditingHistoryResult;
  redo(): EditingHistoryResult;
  /** Includes history-only changes, even when the document value stays equal. */
  subscribe(listener: () => void): () => void;
}

export interface EditingHistoryStatus {
  readonly undoTarget: string | null;
  readonly redoTarget: string | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly revision: number;
}

export type EditingHistoryResult =
  | {
      readonly ok: true;
      readonly target: string;
      /** This operation's applied change; null for a history-only transition. */
      readonly change: JSONAppliedChange | null;
      /** This operation's status, captured before notifying subscribers. */
      readonly status: EditingHistoryStatus;
    }
  | { readonly ok: false; readonly code: string; readonly reason?: string };

export interface EditingHistoryOptions {
  /** Use the history belonging to the same document. Omit for local history. */
  readonly history?: EditingHistory;
}
