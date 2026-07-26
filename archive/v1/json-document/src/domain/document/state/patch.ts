import type * as z from "zod";
import type {
  ApplyResult,
  JSONPatchOperation,
  JSONResult,
} from "../../../foundation/patch/index.js";
import type { Pointer } from "../../../foundation/pointer/index.js";
import { commitMutable, historyDepth } from "../../../foundation/history/index.js";
import { duplicate as duplicateVerb } from "../../editing/duplicate.js";
import { restoreSelectionTarget, sameSelectionSnap } from "../../selection/snap.js";
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
import { mergeDocumentHistoryEntriesSince } from "../history/undoRedo.js";
import type {
  JSONStatePatchExecution,
  PreparedJSONStateChange,
  PreparedJSONStatePublication,
  TrustedJSONStateOps,
} from "./json.js";
import type { SelectionRuntimeAccess } from "../selection/runtime.js";

export type JSONPatchInput = JSONPatchOperation | ReadonlyArray<JSONPatchOperation>;

export type PreviewedDocumentPatchResult =
  | { status: "applied"; result: JSONResult; applied: ReadonlyArray<JSONPatchOperation> }
  | { status: "stale" };

export interface DetailedDocumentPatchResult {
  readonly result: JSONResult;
  readonly applied: ReadonlyArray<JSONPatchOperation>;
}

export interface DocumentPatchRuntimeState {
  lastPatch: ReadonlyArray<JSONPatchOperation>;
  lastPatchSequence: number;
  documentSubscriberCount: number;
}

export function createDocumentPatchRuntimeState(): DocumentPatchRuntimeState {
  return {
    lastPatch: [],
    lastPatchSequence: 0,
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
  sequence: number;
  revision: number;
  transactionToken: object | undefined;
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
  const pendingHistory: DocumentChangeHistoryRecord[] = [];
  let mutationDepth = 0;

  // Selection subscribes before this runtime is created. This observer therefore
  // captures the recovered selection and canonical patch before public listeners
  // can reenter the document.
  rawOps.subscribe((applied) => {
    const sequence = rawOps.sequenceForApplied(applied);
    if (sequence !== undefined && sequence < patchState.lastPatchSequence) return;
    patchState.lastPatch = applied;
    if (sequence !== undefined) patchState.lastPatchSequence = sequence;
  });

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
  const flushPendingHistory = (): void => {
    if (pendingHistory.length === 0) return;
    pendingHistory.sort((left, right) => left.sequence - right.sequence);
    const records = pendingHistory.splice(0, pendingHistory.length);
    let transactionToken: object | undefined;
    let transactionStartDepth: number | undefined;
    const mergeTransaction = (): void => {
      if (transactionStartDepth !== undefined) {
        mergeDocumentHistoryEntriesSince(historyState, transactionStartDepth);
      }
      transactionToken = undefined;
      transactionStartDepth = undefined;
    };
    for (const history of records) {
      if (history.transactionToken !== transactionToken) {
        mergeTransaction();
        transactionToken = history.transactionToken;
        if (transactionToken !== undefined) transactionStartDepth = historyDepth(historyState.stack);
      }
      recordHistory(
        history.before as z.output<S>,
        history.after as z.output<S>,
        history.operations,
        history.selectionBefore,
        history.selectionAfter,
        history.metadata,
        history.operationsOwned,
      );
    }
    mergeTransaction();
  };
  const withinMutation = <T>(run: () => T): T => {
    mutationDepth += 1;
    try {
      return run();
    } finally {
      mutationDepth -= 1;
      if (mutationDepth === 0) flushPendingHistory();
    }
  };
  const queuePublication = (
    publication: PreparedJSONStatePublication<z.output<S>>,
    record: boolean,
    selectionBefore: SelectionSnap | undefined,
    metadata: JSONChangeMetadata | undefined,
    selectionAfterOverride?: SelectionSnap,
  ): ReadonlyArray<JSONPatchOperation> => {
    if (!publication.changed) return [];
    if (record && selectionBefore !== undefined) {
      pendingHistory.push({
        sequence: publication.sequence,
        revision: publication.revision,
        transactionToken: historyState.activeTransactionToken,
        before: publication.before,
        after: publication.state,
        operations: publication.applied,
        selectionBefore,
        selectionAfter: selectionAfterOverride
          ?? selection.selectionAfterForApplied(publication.applied)
          ?? selection.snapSelection(),
        metadata,
        operationsOwned: true,
      });
    }
    return publication.applied;
  };
  const executeDocumentPatch = (
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ): DetailedDocumentPatchResult => withinMutation(() => {
    const record = shouldRecordHistory(operations.length);
    const captureMetadata = shouldCaptureMetadata(record, metadata);
    const selectionBefore = captureMetadata ? selection.snapSelection() : undefined;
    const changeMetadata = selectionBefore === undefined
      ? undefined
      : buildChangeMetadata(
          historyState.activeHistoryMetadata,
          metadata,
          selectionBefore,
          selection.selectionEnabled,
        );
    const execution: JSONStatePatchExecution<z.output<S>> = rawOps.executePatch(
      operations,
      changeMetadata,
    );
    const applied = execution.publication === null
      ? []
      : queuePublication(execution.publication, record, selectionBefore, changeMetadata);
    return { result: execution.result, applied };
  });
  const applyDocumentPatch = (
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ): JSONResult => executeDocumentPatch(operations, metadata).result;

  const applyPreviewedDocumentPatch = (
    candidate: ApplyResult<z.ZodTypeAny>,
    operations: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ): PreviewedDocumentPatchResult => {
    if (!isPreparedJSONStateChange<z.output<S>>(candidate) || !candidate.result.ok) {
      const execution = executeDocumentPatch(operations, metadata);
      return { status: "applied", result: execution.result, applied: execution.applied };
    }
    return withinMutation(() => {
      const prepared = candidate;
      const record = shouldRecordHistory(operations.length);
      const captureMetadata = shouldCaptureMetadata(record, metadata);
      const selectionBefore = captureMetadata ? selection.snapSelection() : undefined;
      const changeMetadata = selectionBefore === undefined
        ? undefined
        : buildChangeMetadata(
            historyState.activeHistoryMetadata,
            metadata,
            selectionBefore,
            selection.selectionEnabled,
          );
      const publication = rawOps.publishPreparedPatch(prepared, changeMetadata);
      if (publication.status === "stale") return publication;
      const applied = queuePublication(publication, record, selectionBefore, changeMetadata);
      return { status: "applied", result: prepared.result, applied };
    });
  };

  const patch = (operations: JSONPatchInput, metadata?: JSONChangeMetadata): JSONResult => {
    return Array.isArray(operations)
      ? applyDocumentPatch(operations, metadata)
      : applyDocumentPatch([operations as JSONPatchOperation], metadata);
  };

  const commit = (
    operations: ReadonlyArray<JSONPatchOperation>,
    commitOptions?: JSONDocumentCommitOptions,
  ): JSONResult => {
    const metadata = commitOptions === undefined ? undefined : compactHistoryMetadata(commitOptions);
    if (commitOptions?.selectionAfter === undefined) return applyDocumentPatch(operations, metadata);
    const selectionTarget = commitOptions.selectionAfter;
    return withinMutation(() => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const selectionBefore = selection.snapSelection();
        const predicted = rawOps.previewOwnedPatch(operations);
        if (predicted.baseRevision !== rawOps.revision || predicted.before !== rawOps.state) continue;
        if (!predicted.result.ok) return patch(operations, metadata);
        const selectionAfter = restoreSelectionTarget(selectionTarget, selection.selectionMode, predicted.state);
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
        const record = shouldRecordHistory(operations.length);
        if (
          !publication.changed
          && record
          && selection.selectionEnabled
          && !sameSelectionSnap(selectionBefore, selectionAfter)
        ) {
          pendingHistory.push({
            sequence: publication.sequence,
            revision: publication.revision,
            transactionToken: historyState.activeTransactionToken,
            before: publication.before,
            after: publication.state,
            operations: [],
            selectionBefore,
            selectionAfter,
            metadata: changeMetadata,
            operationsOwned: true,
          });
        } else {
          queuePublication(
            publication,
            record,
            selectionBefore,
            changeMetadata,
            selectionAfter,
          );
        }
        return predicted.result;
      }
      throw new Error("state changed repeatedly while preparing commit");
    });
  };

  const duplicate = (
    source: Pointer,
    duplicateOptions?: JSONDocumentDuplicateOptions,
  ): JSONDocumentDuplicateResult<z.output<S>> => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const baseRevision = rawOps.revision;
      const planned = duplicateVerb(schema, rawOps.state, source, duplicateOptions, {
        previewPatch: rawOps.previewOwnedPatch,
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
            value: rawOps.snapshot,
            applied: publication.applied,
            target: planned.duplicatedTo,
            duplicatedTo: planned.duplicatedTo,
          }
        : r;
    }
    throw new Error("state changed repeatedly while preparing duplicate");
  };

  return {
    applyDocumentPatch,
    applyDocumentPatchDetailed: executeDocumentPatch,
    applyPreviewedDocumentPatch,
    patch,
    commit,
    duplicate,
    selectionAfterForApplied: (applied: ReadonlyArray<JSONPatchOperation>) =>
      selection.selectionAfterForApplied(applied),
  };
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
