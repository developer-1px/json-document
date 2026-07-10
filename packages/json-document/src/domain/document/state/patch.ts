import type * as z from "zod";
import type {
  ApplyResult,
  JSONPatchOperation,
  JSONResult,
} from "../../../foundation/patch/index.js";
import type { Pointer } from "../../../foundation/pointer/index.js";
import { commitMutable, historyDepth } from "../../../foundation/history/index.js";
import { duplicate as duplicateVerb } from "../../editing/duplicate.js";
import { restoreSelectionTarget } from "../../selection/snap.js";
import type { SelectionSnap } from "../../selection/snap.js";
import type {
  HistoryTransactionOptions,
  JSONChangeMetadata,
  JSONDocumentCommitOptions,
} from "../history/metadata.js";
import type {
  JSONDocumentDuplicateOptions,
  JSONDocumentDuplicateResult,
} from "../editing/actions.js";
import { buildChangeMetadata, compactHistoryMetadata } from "../history/metadata.js";
import { planDocumentHistoryRecord } from "../history/restore.js";
import type {
  DocumentHistoryRuntimeState,
} from "../history/undoRedo.js";
import type {
  PreparedJSONStateChange,
  TrustedJSONStateOps,
} from "./json.js";
import type { SelectionRuntimeAccess } from "../selection/runtime.js";

export type JSONPatchInput = JSONPatchOperation | ReadonlyArray<JSONPatchOperation>;

export type PreviewedDocumentPatchResult =
  | { status: "applied"; result: JSONResult }
  | { status: "stale" };

export interface DocumentPatchRuntimeState {
  lastPatch: ReadonlyArray<JSONPatchOperation>;
  documentSubscriberCount: number;
}

export function createDocumentPatchRuntimeState(): DocumentPatchRuntimeState {
  return {
    lastPatch: [],
    documentSubscriberCount: 0,
  };
}

interface CreateDocumentMutationRuntimeInput<S extends z.ZodType> {
  schema: S;
  rawOps: TrustedJSONStateOps<z.output<S>>;
  historyLimit: number;
  historyState: DocumentHistoryRuntimeState;
  patchState: DocumentPatchRuntimeState;
  selection: SelectionRuntimeAccess;
}

interface DocumentChangeHistoryRecord {
  before: unknown;
  after: unknown;
  operations: ReadonlyArray<JSONPatchOperation>;
  selectionBefore: SelectionSnap;
  selectionAfter: SelectionSnap;
  metadata: JSONChangeMetadata | undefined;
  operationsOwned: boolean;
}

export function createDocumentMutationRuntime<S extends z.ZodType>(
  input: CreateDocumentMutationRuntimeInput<S>,
) {
  const { schema, rawOps, historyLimit, historyState, patchState, selection } = input;

  const recordHistory = (
    before: z.output<S>,
    after: z.output<S>,
    operations: ReadonlyArray<JSONPatchOperation>,
    selectionBefore: SelectionSnap,
    selectionAfter: SelectionSnap,
    metadata?: HistoryTransactionOptions,
    operationsOwned = false,
  ): void => {
    const currentDepth = historyDepth(historyState.stack);
    const recordPlan = planDocumentHistoryRecord({
      activeTransactionStartDepth: historyState.activeTransactionStartDepth,
      currentDepth,
      previous: historyState.stack.undo[historyState.stack.undo.length - 1],
      before,
      after,
      operations,
      selectionBefore,
      selectionAfter,
      metadata,
      operationsOwned,
    });
    if (recordPlan.kind === "skip") return;
    if (recordPlan.kind === "replaceLast") {
      historyState.stack.undo[historyState.stack.undo.length - 1] = recordPlan.entry;
      return;
    }
    commitMutable(historyState.stack, recordPlan.entry, historyLimit);
  };

  const shouldRecordHistory = (operationCount: number): boolean =>
    historyLimit > 0 && !historyState.isRestoring && operationCount > 0;
  const shouldCaptureMetadata = (
    record: boolean,
    metadata: JSONChangeMetadata | undefined,
  ): boolean =>
    record
    || historyState.activeHistoryMetadata !== undefined
    || metadata !== undefined
    || (selection.selectionEnabled && patchState.documentSubscriberCount > 0);
  const historyRecord = (
    record: boolean,
    before: unknown,
    after: unknown,
    operations: ReadonlyArray<JSONPatchOperation>,
    selectionBefore: SelectionSnap,
    selectionAfter: SelectionSnap,
    metadata: JSONChangeMetadata | undefined,
    operationsOwned = false,
  ): DocumentChangeHistoryRecord | null => {
    if (!record) return null;
    return {
      before,
      after,
      operations,
      selectionBefore,
      selectionAfter,
      metadata,
      operationsOwned,
    };
  };
  const applyDocumentChangeResult = (
    result: JSONResult,
    operationCount: number,
    applied: ReadonlyArray<JSONPatchOperation>,
    history: DocumentChangeHistoryRecord | null,
  ): void => {
    if (!result.ok) return;
    patchState.lastPatch = operationCount === 0 ? [] : applied;
    if (history === null) return;
    recordHistory(
      history.before as z.output<S>,
      history.after as z.output<S>,
      history.operations,
      history.selectionBefore,
      history.selectionAfter,
      history.metadata,
      history.operationsOwned,
    );
  };

  const applyDocumentPatch = (
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
    operationsOwned = false,
  ): JSONResult => {
    const record = shouldRecordHistory(operations.length);
    const captureMetadata = shouldCaptureMetadata(record, metadata);
    if (!captureMetadata) {
      const r = rawOps.patch(operations);
      applyDocumentChangeResult(r, operations.length, rawOps.lastApplied, null);
      return r;
    }

    const before = record ? rawOps.state : undefined;
    const selectionBefore = selection.snapSelection();
    const changeMetadata = buildChangeMetadata(
      historyState.activeHistoryMetadata,
      metadata,
      selectionBefore,
      selection.selectionEnabled,
    );
    const r = rawOps.patch(operations, changeMetadata);
    const selectionAfter = selection.snapSelection();
    applyDocumentChangeResult(
      r,
      operations.length,
      rawOps.lastApplied,
      historyRecord(
        record,
        before,
        rawOps.state,
        operations,
        selectionBefore,
        selectionAfter,
        changeMetadata,
        operationsOwned,
      ),
    );
    return r;
  };

  const applyPreviewedDocumentPatch = (
    candidate: ApplyResult<z.ZodTypeAny>,
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ): PreviewedDocumentPatchResult => {
    if (!isPreparedJSONStateChange<z.output<S>>(candidate) || !candidate.result.ok) {
      return { status: "applied", result: applyDocumentPatch(operations, metadata) };
    }
    const prepared = candidate;
    const record = shouldRecordHistory(operations.length);
    const captureMetadata = shouldCaptureMetadata(record, metadata);
    if (!captureMetadata) {
      const publication = rawOps.publishPreparedPatch(prepared);
      if (publication.status === "stale") return publication;
      applyDocumentChangeResult(
        prepared.result,
        prepared.applied.length,
        publication.changed ? prepared.applied : rawOps.lastApplied,
        null,
      );
      return { status: "applied", result: prepared.result };
    }

    const before = record ? rawOps.state : undefined;
    const selectionBefore = selection.snapSelection();
    const changeMetadata = buildChangeMetadata(
      historyState.activeHistoryMetadata,
      metadata,
      selectionBefore,
      selection.selectionEnabled,
    );
    const publication = rawOps.publishPreparedPatch(prepared, changeMetadata);
    if (publication.status === "stale") return publication;
    const selectionAfter = selection.snapSelection();
    applyDocumentChangeResult(
      prepared.result,
      prepared.applied.length,
      rawOps.lastApplied,
      historyRecord(
        record,
        before,
        prepared.state,
        operations,
        selectionBefore,
        selectionAfter,
        changeMetadata,
      ),
    );
    return { status: "applied", result: prepared.result };
  };

  const patch = (operations: JSONPatchInput, metadata?: JSONChangeMetadata): JSONResult => {
    return Array.isArray(operations)
      ? applyDocumentPatch(operations, metadata, false)
      : applyDocumentPatch([operations as JSONPatchOperation], metadata, true);
  };

  const commit = (
    operations: ReadonlyArray<JSONPatchOperation>,
    commitOptions?: JSONDocumentCommitOptions,
  ): JSONResult => {
    const metadata = commitOptions === undefined ? undefined : compactHistoryMetadata(commitOptions);
    if (commitOptions?.selectionAfter === undefined) return applyDocumentPatch(operations, metadata);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const before = rawOps.state;
      const selectionBefore = selection.snapSelection();
      const predicted = rawOps.previewPatch(operations);
      if (predicted.baseRevision !== rawOps.revision || predicted.before !== rawOps.state) continue;
      if (!predicted.result.ok) return patch(operations, metadata);
      const selectionAfter = restoreSelectionTarget(commitOptions.selectionAfter, selection.selectionMode, predicted.state);
      const directMetadata: JSONChangeMetadata = metadata === undefined
        ? { selectionAfter }
        : { ...metadata, selectionAfter };
      const changeMetadata = buildChangeMetadata(
        historyState.activeHistoryMetadata,
        directMetadata,
        selectionBefore,
        selection.selectionEnabled,
      );
      const publication = rawOps.publishPreparedPatch(predicted, changeMetadata);
      if (publication.status === "stale") continue;
      selection.restoreSelection(selectionAfter);
      applyDocumentChangeResult(
        predicted.result,
        operations.length,
        rawOps.lastApplied,
        historyRecord(
          shouldRecordHistory(operations.length),
          before,
          predicted.state,
          operations,
          selectionBefore,
          selectionAfter,
          changeMetadata,
        ),
      );
      return predicted.result;
    }
    throw new Error("state changed repeatedly while preparing commit");
  };

  const duplicate = (
    source: Pointer,
    duplicateOptions?: JSONDocumentDuplicateOptions,
  ): JSONDocumentDuplicateResult<z.output<S>> => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const baseRevision = rawOps.revision;
      const planned = duplicateVerb(schema, rawOps.state, source, duplicateOptions, {
        previewPatch: rawOps.previewPatch,
        trustedPayload: rawOps.stateJsonTrusted,
      });
      if (rawOps.revision !== baseRevision) continue;
      if (!planned.ok) return planned;
      const publication = applyPreviewedDocumentPatch(planned.prepared, planned.patch);
      if (publication.status === "stale") continue;
      const r = publication.result;
      return r.ok
        ? {
            ok: true,
            value: rawOps.state,
            applied: patchState.lastPatch,
            target: planned.duplicatedTo,
            duplicatedTo: planned.duplicatedTo,
          }
        : r;
    }
    throw new Error("state changed repeatedly while preparing duplicate");
  };

  const lastApplied = (): ReadonlyArray<JSONPatchOperation> => patchState.lastPatch;

  return { applyDocumentPatch, applyPreviewedDocumentPatch, patch, commit, duplicate, lastApplied };
}

function isPreparedJSONStateChange<T>(
  candidate: ApplyResult<z.ZodTypeAny>,
): candidate is PreparedJSONStateChange<T> {
  return candidate !== null
    && typeof candidate === "object"
    && "baseRevision" in candidate
    && typeof candidate.baseRevision === "number"
    && "before" in candidate;
}
