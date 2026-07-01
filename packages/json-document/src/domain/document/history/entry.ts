import type { SelectionSnap } from "../../selection/snap.js";
import type { JSONPatchOperation } from "../../../foundation/patch/index.js";
import type { HistoryTransactionOptions } from "./metadata.js";

export interface DocumentHistoryEntry {
  forward: JSONPatchOperation[];
  inverse: JSONPatchOperation[];
  selectionBefore: SelectionSnap;
  selectionAfter: SelectionSnap;
  metadata?: HistoryTransactionOptions;
  snapshot?: {
    before: unknown;
    after?: unknown;
  };
}
