import type * as z from "zod";
import { INTERNAL_CLIPBOARD_CAN_PASTE, createClipboard } from "./clipboard/clipboard.js";
import { createClipboardPasteRuntime } from "./clipboard/paste.js";
import { createDocumentCapabilities } from "./capabilities/create.js";
import { createDocumentEditActions } from "./editing/actions.js";
import { createJSONState, type TrustedJSONStateOps } from "./state/json.js";
import { createDocumentStateOps } from "./state/ops.js";
import { createSchemaState } from "./schema/state.js";
import type { SelectionOptions, SelectionState } from "./selection/create.js";
import { createDocumentSelectionRuntime } from "./selection/runtime.js";
import {
  OK,
  type CapabilityResult,
} from "./capabilities/result.js";
import type {
  ClipboardCopyOptions,
  ClipboardCopyResult,
  ClipboardCutOptions,
  ClipboardCutResult,
  ClipboardPasteResult,
  ClipboardState,
} from "./clipboard/contract.js";
import type {
  JSONDocumentDuplicateOptions,
  JSONDocumentDuplicateResult,
  JSONDocumentEditResult,
} from "./editing/actions.js";
import type {
  JSONDocumentInsertOptions,
  JSONDocumentInsertTarget,
  JSONDocumentMoveTarget,
  JSONDocumentPasteOptions,
  JSONDocumentPasteTarget,
} from "./editing/target.js";
import type {
  JSONChangeMetadata,
  JSONDocumentCommitOptions,
} from "./history/metadata.js";
import type { JSONDocumentHistory } from "./history/undoRedo.js";
import type {
  JSONPatchOperation,
  JSONResult,
} from "../../foundation/patch/index.js";
import type { Pointer } from "../../foundation/pointer/index.js";
import type {
  EntriesResult,
  QueryResult,
  ReadResult,
} from "./reading/read.js";
import { createDocumentRead } from "./reading/read.js";
import type { SchemaState } from "./schema/state.js";
import { createDocumentMutationRuntime, createDocumentPatchRuntimeState, type JSONPatchInput } from "./state/patch.js";
import { createDocumentHistoryRuntime, createDocumentHistoryRuntimeState } from "./history/undoRedo.js";
import type { JSONDocumentError } from "../../foundation/error/index.js";
import type { SelectionSource } from "../selection/read.js";

export interface DocumentRuntimeOptions {
  strict?: boolean | undefined;
  onError?: (error: JSONDocumentError) => void;
  trustedInitial?: boolean | undefined;
  history?: number;
  selection?: boolean | SelectionOptions;
  onChange?: () => void;
}

export interface DocumentRuntime<T> {
  readonly value: T;
  readonly lastPatch: ReadonlyArray<JSONPatchOperation>;
  readonly selection: SelectionState | undefined;
  readonly history: JSONDocumentHistory;
  readonly clipboard: ClipboardState<T>;
  readonly schema: SchemaState;
  patch(operations: JSONPatchInput, metadata?: JSONChangeMetadata): JSONResult;
  commit(operations: ReadonlyArray<JSONPatchOperation>, options?: JSONDocumentCommitOptions): JSONResult;
  find(jsonpath: string): QueryResult;
  insert(target: JSONDocumentInsertTarget, value: unknown, options?: JSONDocumentInsertOptions): JSONDocumentEditResult;
  insert(value: unknown): JSONDocumentEditResult;
  replace(path: Pointer, value: unknown): JSONDocumentEditResult;
  replace(value: unknown): JSONDocumentEditResult;
  delete(source?: SelectionSource): JSONDocumentEditResult;
  move(source: Pointer, target: JSONDocumentMoveTarget): JSONDocumentEditResult;
  move(target: JSONDocumentMoveTarget): JSONDocumentEditResult;
  duplicate(source: Pointer, options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
  duplicate(options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
  copy(source?: SelectionSource, options?: ClipboardCopyOptions): ClipboardCopyResult;
  cut(source?: SelectionSource, options?: ClipboardCutOptions): ClipboardCutResult<T>;
  paste(target?: JSONDocumentPasteTarget, options?: JSONDocumentPasteOptions): ClipboardPasteResult<T>;
  undo(): CapabilityResult;
  redo(): CapabilityResult;
  load(value: unknown, options?: { preserveHistory?: boolean }): JSONResult;
  reset(value?: unknown): JSONResult;
  subscribe(listener: (
    applied: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ) => void): () => void;
  at(path: Pointer): ReadResult;
  exists(path: Pointer): boolean;
  query(jsonpath: string): QueryResult;
  entries(path: Pointer): EntriesResult;
  canPatch(operations: JSONPatchInput): CapabilityResult;
  canFind(jsonpath: string): CapabilityResult;
  canInsert(value: unknown): CapabilityResult;
  canInsert(target: JSONDocumentInsertTarget, value: unknown, options?: JSONDocumentInsertOptions): CapabilityResult;
  canReplace(value: unknown): CapabilityResult;
  canReplace(path: Pointer, value: unknown): CapabilityResult;
  canDelete(source?: SelectionSource): CapabilityResult;
  canMove(target: JSONDocumentMoveTarget): CapabilityResult;
  canMove(source: Pointer, target: JSONDocumentMoveTarget): CapabilityResult;
  canDuplicate(source: Pointer, options?: JSONDocumentDuplicateOptions): CapabilityResult;
  canDuplicate(options?: JSONDocumentDuplicateOptions): CapabilityResult;
  canCopy(source?: SelectionSource): CapabilityResult;
  canCut(source?: SelectionSource): CapabilityResult;
  canPaste(target?: JSONDocumentPasteTarget, options?: JSONDocumentPasteOptions): CapabilityResult;
  canUndo(): CapabilityResult;
  canRedo(): CapabilityResult;
}

export function createDocumentRuntime<S extends z.ZodType>(
  zodSchema: S,
  initial: z.input<S> | z.output<S>,
  options: DocumentRuntimeOptions = {},
): DocumentRuntime<z.output<S>> {
  const rawOps = createJSONState(zodSchema, initial, options) as TrustedJSONStateOps<z.output<S>>;
  const historyLimit = options.history ?? 0;
  const historyState = createDocumentHistoryRuntimeState();
  const patchState = createDocumentPatchRuntimeState();

  const selectionRuntime = createDocumentSelectionRuntime({
    ops: rawOps,
    selection: options.selection,
    onChange: options.onChange,
  });
  const selectionState = selectionRuntime.state;
  const syncLastPatch = (): void => { patchState.lastPatch = rawOps.lastApplied; };
  const mutation = createDocumentMutationRuntime({
    schema: zodSchema,
    rawOps,
    historyLimit,
    historyState,
    patchState,
    selection: selectionRuntime.access,
  });
  const { history, historyControls } = createDocumentHistoryRuntime({
    rawOps,
    historyState,
    selection: selectionRuntime.access,
    syncLastPatch,
  });

  const ops = createDocumentStateOps({
    rawOps,
    mutation,
    historyState,
    patchState,
    snapSelection: selectionRuntime.access.snapSelection,
    syncLastPatch,
  });

  const insertPasteRuntime = createClipboardPasteRuntime({
    schema: zodSchema,
    getState: () => rawOps.state,
    ops,
    previewPatch: rawOps.previewPatch,
    previewTrustedValuesPatch: rawOps.previewTrustedValuesPatch,
    applyPreviewedPatch: mutation.applyPreviewedDocumentPatch,
    getSelectionTarget: () => selectionState?.primaryPointer ?? null,
    getAppliedPatch: () => patchState.lastPatch,
  });
  const insertRuntime = {
    insertPayload(
      payload: unknown,
      target: JSONDocumentInsertTarget | undefined,
      insertOptions: JSONDocumentInsertOptions | undefined,
    ) {
      const result = insertPasteRuntime.pastePayload(payload, target, insertOptions, false, false);
      return result.ok ? OK : result;
    },
    canInsertPayload(
      payload: unknown,
      target: JSONDocumentInsertTarget | undefined,
      insertOptions: JSONDocumentInsertOptions | undefined,
    ) {
      return insertPasteRuntime.canPastePayload(payload, target, insertOptions, false, false);
    },
  };

  const capabilities = createDocumentCapabilities({
    schema: zodSchema,
    ops,
    previewPatch: rawOps.previewPatch,
    getStateJsonTrusted: () => rawOps.stateJsonTrusted,
    history: historyControls,
    ...(selectionRuntime.ref ? { selectionRef: selectionRuntime.ref } : {}),
    insertRuntime,
  });
  const clipboardOptions = {
    schema: zodSchema,
    getState: () => rawOps.state,
    ops,
    previewPatch: rawOps.previewPatch,
    previewTrustedValuesPatch: rawOps.previewTrustedValuesPatch,
    applyPreviewedPatch: mutation.applyPreviewedDocumentPatch,
    getSelectionSource: () => selectionState?.selectedSource ?? null,
    getSelectionTarget: () => selectionState?.primaryPointer ?? null,
    getAppliedPatch: () => patchState.lastPatch,
    getStateJsonTrusted: () => rawOps.stateJsonTrusted,
  };
  const clipboard = createClipboard(options.onChange === undefined ? clipboardOptions : { ...clipboardOptions, onChange: options.onChange });
  const restoreHistory = (direction: "undo" | "redo"): CapabilityResult => {
    const capability = direction === "undo" ? capabilities.undo : capabilities.redo;
    if (!capability.ok) return capability;
    const restored = direction === "undo" ? history.undo() : history.redo();
    return restored
      ? OK
      : {
          ok: false,
          code: "apply_failed",
          reason: `${direction} failed to apply history entry`,
        };
  };
  const read = createDocumentRead(zodSchema, () => rawOps.state);
  const schemaState = createSchemaState(zodSchema);
  const edit = createDocumentEditActions({
    getState: () => rawOps.state,
    selection: selectionState,
    mutation,
    insertRuntime,
  });

  return {
    get value() { return rawOps.state; },
    get lastPatch() { return [...patchState.lastPatch]; },
    get selection() { return selectionRuntime.enabled ? selectionState : undefined; },
    history,
    clipboard,
    schema: schemaState,
    patch: mutation.patch,
    commit: mutation.commit,
    find: read.query,
    insert: edit.insert,
    replace: edit.replace,
    delete: edit.delete,
    move: edit.move,
    duplicate: edit.duplicate,
    copy: clipboard.copy,
    cut: clipboard.cut,
    paste: clipboard.paste,
    undo: () => restoreHistory("undo"),
    redo: () => restoreHistory("redo"),
    load: ops.load,
    reset: ops.reset,
    subscribe: ops.subscribe,
    at: read.at,
    exists: read.exists,
    query: read.query,
    entries: read.entries,
    canPatch: (operations: JSONPatchInput) => capabilities.patch(Array.isArray(operations) ? operations : [operations]),
    canFind: capabilities.find,
    canInsert: capabilities.insert,
    canReplace: capabilities.replace,
    canDelete: capabilities.delete,
    canMove: capabilities.move,
    canDuplicate: capabilities.duplicate,
    canCopy: capabilities.copy,
    canCut: capabilities.cut,
    canPaste: (target?: JSONDocumentPasteTarget, canPasteOptions?: JSONDocumentPasteOptions) => clipboard[INTERNAL_CLIPBOARD_CAN_PASTE](target, canPasteOptions),
    canUndo: () => capabilities.undo,
    canRedo: () => capabilities.redo,
  };
}
