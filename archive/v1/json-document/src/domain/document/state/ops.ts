import type { JSONPatchOperation, JSONResult } from "../../../foundation/patch/index.js";
import type { Pointer } from "../../../foundation/pointer/index.js";
import type { SelectionSnap } from "../../selection/snap.js";
import { resetDocumentHistoryRuntimeState } from "../history/undoRedo.js";
import type {
  DocumentHistoryRuntimeState,
} from "../history/undoRedo.js";
import type {
  JSONChangeMetadata,
} from "../history/metadata.js";
import type { TrustedJSONStateOps } from "./json.js";
import type { DocumentPatchRuntimeState } from "./patch.js";

export interface JSONStateOps<T> {
  add(path: Pointer, value: unknown): JSONResult;
  remove(path: Pointer): JSONResult;
  replace(path: Pointer, value: unknown): JSONResult;
  move(from: Pointer, path: Pointer): JSONResult;
  copy(from: Pointer, path: Pointer): JSONResult;
  test(path: Pointer, value: unknown): JSONResult;

  patch(operations: ReadonlyArray<JSONPatchOperation>, metadata?: JSONChangeMetadata): JSONResult;

  load(value: unknown, options?: { preserveHistory?: boolean }): JSONResult;
  reset(value?: unknown): JSONResult;

  subscribe(listener: (
    applied: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ) => void): () => void;
  readonly state: T;
}

interface DocumentMutationOps {
  applyDocumentPatch(
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ): JSONResult;
}

interface CreateDocumentStateOpsInput<T> {
  rawOps: TrustedJSONStateOps<T>;
  mutation: DocumentMutationOps;
  historyState: DocumentHistoryRuntimeState;
  patchState: DocumentPatchRuntimeState;
  snapSelection: () => SelectionSnap;
  selectionAfterForApplied: (applied: ReadonlyArray<JSONPatchOperation>) => SelectionSnap | undefined;
}

export function createDocumentStateOps<T>(
  input: CreateDocumentStateOpsInput<T>,
): JSONStateOps<T> {
  const {
    rawOps,
    mutation,
    historyState,
    patchState,
    snapSelection,
    selectionAfterForApplied,
  } = input;

  return {
    add: (path, value) => mutation.applyDocumentPatch([{ op: "add", path, value }]),
    remove: (path) => mutation.applyDocumentPatch([{ op: "remove", path }]),
    replace: (path, value) => mutation.applyDocumentPatch([{ op: "replace", path, value }]),
    move: (from, path) => mutation.applyDocumentPatch([{ op: "move", from, path }]),
    copy: (from, path) => mutation.applyDocumentPatch([{ op: "copy", from, path }]),
    test: rawOps.test,
    patch: mutation.applyDocumentPatch,
    load(value, loadOptions?: { preserveHistory?: boolean }) {
      const r = rawOps.load(value);
      if (r.ok) {
        if (loadOptions?.preserveHistory !== true) resetDocumentHistoryRuntimeState(historyState);
      }
      return r;
    },
    reset(value) {
      const r = rawOps.reset(value);
      if (r.ok) {
        resetDocumentHistoryRuntimeState(historyState);
      }
      return r;
    },
    subscribe(listener) {
      patchState.documentSubscriberCount += 1;
      const unsubscribe = rawOps.subscribe((applied, metadata) => {
        listener(applied, {
          ...metadata,
          selectionAfter: metadata?.selectionAfter
            ?? selectionAfterForApplied(applied)
            ?? snapSelection(),
        });
      });
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        patchState.documentSubscriberCount = Math.max(0, patchState.documentSubscriberCount - 1);
        subscribed = false;
        unsubscribe();
      };
    },
    get state() { return rawOps.state; },
  };
}
