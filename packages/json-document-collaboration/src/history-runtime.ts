import type { JSONPatchValidationResult } from "@interactive-os/json-document";

import {
  authorDependencies,
  changeIdKey,
  freezeChangeId,
  freezeLocalChange,
  prepareGraph,
  type PreparedGraph,
} from "./change.js";
import { jsonEqual } from "./json-equal.js";
import {
  historyOperationFor,
  isUndoableChange,
  materializeChanges,
  type MaterializedDocument,
} from "./materialize.js";
import {
  assignCausalState,
  failure,
  OK,
  type RuntimeState,
} from "./runtime-state.js";
import type {
  ChangeId,
  CollaborationChange,
  History,
  HistoryResult,
  HistoryStatus,
} from "./types.js";

interface PreparedHistoryChange {
  readonly change: CollaborationChange;
  readonly target: ChangeId;
  readonly known: ReadonlyMap<string, CollaborationChange>;
  readonly graph: PreparedGraph;
  readonly materialized: MaterializedDocument;
  readonly didChangeDocument: boolean;
}

type PreparedHistoryResult =
  | { readonly ok: true; readonly value: PreparedHistoryChange }
  | Extract<HistoryResult, { readonly ok: false }>;

interface ResolvedHistoryState {
  readonly status: HistoryStatus;
  readonly effectiveUndo: ChangeId | null;
}

export function createHistory(state: RuntimeState): History {
  function resolveHistoryState(): ResolvedHistoryState {
    let undoTarget: ChangeId | null = null;
    let undoDepth = 0;
    let latestOwnDataIndex = -1;
    for (let index = state.graph.ordered.length - 1; index >= 0; index -= 1) {
      const change = state.graph.ordered[index];
      if (
        change !== undefined
        && change.changeId.actorId === state.actorId
        && isUndoableChange(change)
      ) {
        if (latestOwnDataIndex === -1) latestOwnDataIndex = index;
        const key = changeIdKey(change.changeId);
        if (
          state.materialized.history.appliedKeys.has(key)
          && !state.materialized.history.disabledByTarget.has(key)
        ) {
          undoDepth += 1;
          undoTarget ??= freezeChangeId(change.changeId);
        }
      }
    }

    let redoTarget: ChangeId | null = null;
    let redoDepth = 0;
    let effectiveUndo: ChangeId | null = null;
    for (let index = state.graph.ordered.length - 1; index >= 0; index -= 1) {
      if (index <= latestOwnDataIndex) break;
      const change = state.graph.ordered[index];
      if (
        change === undefined
        || change.changeId.actorId !== state.actorId
        || !state.materialized.history.appliedHistoryKeys.has(
          changeIdKey(change.changeId),
        )
      ) {
        continue;
      }
      const operation = historyOperationFor(change);
      if (operation?.kind !== "undo-change") continue;
      const targetKey = changeIdKey(operation.target);
      const activeUndo = state.materialized.history.disabledByTarget.get(targetKey);
      if (
        activeUndo !== undefined
        && changeIdKey(activeUndo) === changeIdKey(change.changeId)
      ) {
        redoDepth += 1;
        if (redoTarget === null) {
          redoTarget = freezeChangeId(operation.target);
          effectiveUndo = freezeChangeId(change.changeId);
        }
      }
    }

    return {
      status: Object.freeze({
        undoTarget,
        redoTarget,
        undoDepth,
        redoDepth,
        revision: state.graphRevision,
      }),
      effectiveUndo,
    };
  }

  function prepareHistoryChange(
    direction: "undo" | "redo",
  ): PreparedHistoryResult {
    if (state.evaluatingValidation) {
      return failure(
        "acceptance_reentrancy",
        "validation callback cannot author history changes",
      );
    }
    if (state.graph.pending.some((row) => row.changeId.actorId === state.actorId)) {
      return failure(
        "actor_history_pending",
        "cannot author while this actor has pending causal history",
      );
    }
    if (state.localCounter >= Number.MAX_SAFE_INTEGER) {
      return failure(
        "actor_counter_exhausted",
        "actor change counter reached the maximum safe integer",
      );
    }

    const resolved = resolveHistoryState();
    const target = direction === "undo"
      ? resolved.status.undoTarget
      : resolved.status.redoTarget;
    if (target === null) {
      return failure(
        direction === "undo" ? "nothing_to_undo" : "nothing_to_redo",
        direction === "undo"
          ? "this actor has no active accepted Change to undo"
          : "this actor has no effective undo Change to redo",
      );
    }
    if (direction === "redo" && resolved.effectiveUndo === null) {
      return failure(
        "nothing_to_redo",
        "this actor has no effective undo Change to redo",
      );
    }

    const changeId = Object.freeze({
      actorId: state.actorId,
      counter: state.localCounter + 1,
    });
    const operation = direction === "undo"
      ? { kind: "undo-change" as const, target }
      : {
          kind: "redo-change" as const,
          undo: resolved.effectiveUndo as ChangeId,
        };
    const change = freezeLocalChange(
      changeId,
      authorDependencies(state.graph, state.actorId, state.localCounter),
      [operation],
    );
    const nextKnown = new Map(state.known);
    nextKnown.set(changeIdKey(changeId), change);
    const nextGraph = prepareGraph(nextKnown);
    const nextMaterialized = materializeChanges(
      state.initialTree,
      nextGraph.ordered,
      state.materializeValidation,
    );
    const controlKey = changeIdKey(changeId);
    if (!nextMaterialized.history.appliedHistoryKeys.has(controlKey)) {
      const suppressed = nextMaterialized.suppressed.find((entry) => (
        changeIdKey(entry.changeId) === controlKey
      ));
      return failure(
        suppressed?.code ?? `${direction}_suppressed`,
        suppressed?.reason ?? `${direction} could not preserve accepted changes`,
      );
    }

    return {
      ok: true,
      value: {
        change,
        target,
        known: nextKnown,
        graph: nextGraph,
        materialized: nextMaterialized,
        didChangeDocument: !jsonEqual(
          state.documentStore.value,
          nextMaterialized.value,
        ),
      },
    };
  }

  function commitHistoryChange(
    direction: "undo" | "redo",
  ): HistoryResult {
    const prepared = prepareHistoryChange(direction);
    if (!prepared.ok) return prepared;

    assignCausalState(state, {
      known: prepared.value.known,
      graph: prepared.value.graph,
      materialized: prepared.value.materialized,
      localCounter: prepared.value.change.changeId.counter,
    });

    let documentChange = undefined;
    if (prepared.value.didChangeDocument) {
      const documentCommit = state.documentStore.commit([{
        op: "replace",
        path: "",
        value: state.materialized.value,
      }]);
      if (!documentCommit.ok) {
        throw new Error(
          `history document commit failed: ${documentCommit.reason ?? documentCommit.code}`,
        );
      }
      documentChange = documentCommit.change;
    }
    state.notify({
      ...(documentChange === undefined ? {} : { documentChange }),
      replicaStatus: state.replicaStatus(),
    });

    return Object.freeze({
      ok: true,
      changeId: freezeChangeId(prepared.value.change.changeId),
      target: freezeChangeId(prepared.value.target),
      didChangeDocument: prepared.value.didChangeDocument,
    });
  }

  return Object.freeze({
    status(): HistoryStatus {
      return resolveHistoryState().status;
    },
    canUndo(): JSONPatchValidationResult {
      const prepared = prepareHistoryChange("undo");
      return prepared.ok ? OK : prepared;
    },
    undo(): HistoryResult {
      return commitHistoryChange("undo");
    },
    canRedo(): JSONPatchValidationResult {
      const prepared = prepareHistoryChange("redo");
      return prepared.ok ? OK : prepared;
    },
    redo(): HistoryResult {
      return commitHistoryChange("redo");
    },
  });
}
