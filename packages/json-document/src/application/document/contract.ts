import type { CapabilityResult } from "../../domain/document/capabilities/result.js";
import type { JSONPatchOperation, JSONResult } from "../../domain/document/patch/index.js";
import type { Pointer } from "../../domain/document/pointer/index.js";
import type { SelectionSource } from "../../domain/selection/read.js";
import type {
  ClipboardCopyOptions,
  ClipboardCopyResult,
  ClipboardCutOptions,
  ClipboardCutResult,
  ClipboardPasteResult,
  ClipboardState,
  JSONDocumentPasteOptions,
  JSONDocumentPasteTarget,
} from "../../domain/document/clipboard/contract.js";
import type { SchemaState } from "../../domain/document/schema/state.js";
import type { SelectionState, SelectionOptions } from "../../domain/document/selection/create.js";
import type { JSONDocumentError } from "../../domain/document/error/index.js";
import type {
  JSONChangeMetadata,
  JSONDocumentCommitOptions,
} from "../../domain/document/history/metadata.js";
import type { JSONDocumentHistory } from "../../domain/document/history/undoRedo.js";
import type {
  JSONDocumentEditResult,
  JSONDocumentDuplicateOptions,
  JSONDocumentDuplicateResult,
} from "../../domain/document/editing/actions.js";
import type {
  JSONDocumentInsertOptions,
  JSONDocumentInsertTarget,
  JSONDocumentMoveTarget,
} from "../../domain/document/editing/target.js";
import type {
  EntriesResult,
  QueryResult,
  ReadResult,
} from "../../domain/document/reading/read.js";
import type { JSONPatchInput } from "../../domain/document/state/patch.js";

export interface JSONDocumentOptions {
  strict?: boolean | undefined;
  onError?: (error: JSONDocumentError) => void;
  /**
   * Treat `initial` as already-validated `z.output<S>`.
   * This skips the initial schema parse; use only when the caller owns that boundary.
   */
  trustedInitial?: boolean | undefined;
  history?: number;
  selection?: boolean | SelectionOptions;
  onChange?: () => void;
}

export type JSONCapabilityResult = CapabilityResult;

export interface JSONDocument<T> {
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
  undo(): JSONCapabilityResult;
  redo(): JSONCapabilityResult;
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
  canPatch(operations: JSONPatchInput): JSONCapabilityResult;
  canFind(jsonpath: string): JSONCapabilityResult;
  canInsert(value: unknown): JSONCapabilityResult;
  canInsert(target: JSONDocumentInsertTarget, value: unknown, options?: JSONDocumentInsertOptions): JSONCapabilityResult;
  canReplace(value: unknown): JSONCapabilityResult;
  canReplace(path: Pointer, value: unknown): JSONCapabilityResult;
  canDelete(source?: SelectionSource): JSONCapabilityResult;
  canMove(target: JSONDocumentMoveTarget): JSONCapabilityResult;
  canMove(source: Pointer, target: JSONDocumentMoveTarget): JSONCapabilityResult;
  canDuplicate(source: Pointer, options?: JSONDocumentDuplicateOptions): JSONCapabilityResult;
  canDuplicate(options?: JSONDocumentDuplicateOptions): JSONCapabilityResult;
  canCopy(source?: SelectionSource): JSONCapabilityResult;
  canCut(source?: SelectionSource): JSONCapabilityResult;
  canPaste(target?: JSONDocumentPasteTarget, options?: JSONDocumentPasteOptions): JSONCapabilityResult;
  canUndo(): JSONCapabilityResult;
  canRedo(): JSONCapabilityResult;
}
