import {
  applyPatch,
  type JSONDocument,
  type JSONDocumentCommitOptions,
  type JSONDocumentCommitResult,
  type JSONPatchOperation,
  type JSONPatchValidationResult,
  type JSONValue,
} from "@interactive-os/json-document";

import {
  authorDependencies,
  changeIdKey,
  freezeLocalChange,
  prepareGraph,
  type PreparedGraph,
} from "./change.js";
import { jsonEqual } from "@interactive-os/json-document";
import { materializeChanges, type MaterializedDocument } from "./materialize.js";
import {
  ACCEPTANCE_REENTRANCY_FAILURE,
  assignCausalState,
  failure,
  OK,
  type RuntimeState,
} from "./runtime-state.js";
import { compilePatchOperations } from "./translate.js";
import type { CollaborationChange } from "./types.js";

interface PreparedLocalChange {
  readonly patchValue: JSONValue;
  readonly change: CollaborationChange | null;
  readonly known: ReadonlyMap<string, CollaborationChange>;
  readonly graph: PreparedGraph;
  readonly materialized: MaterializedDocument;
}

type PreparedLocalResult =
  | { readonly ok: true; readonly value: PreparedLocalChange }
  | Extract<JSONDocumentCommitResult, { readonly ok: false }>;

export function createDocumentRuntime(state: RuntimeState): JSONDocument {
  const prepareLocal = (
    operations: ReadonlyArray<JSONPatchOperation>,
  ): PreparedLocalResult => {
    if (state.evaluatingValidation) return ACCEPTANCE_REENTRANCY_FAILURE;
    const patched = applyPatch(state.documentStore.value, operations);
    if (!patched.ok) return patched;

    const validation = state.evaluateValidation(patched.value);
    if (!validation.ok) return validation;

    if (jsonEqual(state.documentStore.value, patched.value)) {
      return {
        ok: true,
        value: {
          patchValue: patched.value,
          change: null,
          known: state.known,
          graph: state.graph,
          materialized: state.materialized,
        },
      };
    }

    if (state.graph.pending.some((row) => (
      row.changeId.actorId === state.actorId
    ))) {
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
    const changeId = Object.freeze({
      actorId: state.actorId,
      counter: state.localCounter + 1,
    });
    const compiled = compilePatchOperations(
      state.materialized.tree,
      patched.change.applied,
      changeId,
      state.graph.ordered.length,
      state.profile === "text" ? { collaborativeText: true } : undefined,
    );
    if (!compiled.ok) {
      return failure(
        "collaboration_unsupported",
        compiled.reason,
      );
    }
    const change = freezeLocalChange(
      changeId,
      authorDependencies(state.graph, state.actorId, state.localCounter),
      compiled.value.ops,
    );
    const nextKnown = new Map(state.known);
    nextKnown.set(changeIdKey(change.changeId), change);
    const nextGraph = prepareGraph(nextKnown);
    const nextMaterialized = materializeChanges(
      state.initialTree,
      nextGraph.ordered,
      state.materializeValidation,
    );
    if (!jsonEqual(nextMaterialized.value, patched.value)) {
      return failure(
        "collaboration_translation_mismatch",
        "semantic collaboration operations did not preserve the JSON Patch result",
      );
    }

    return {
      ok: true,
      value: {
        patchValue: patched.value,
        change,
        known: nextKnown,
        graph: nextGraph,
        materialized: nextMaterialized,
      },
    };
  };

  return Object.freeze({
    get value(): JSONValue {
      return state.documentStore.value;
    },
    at(pointer: string) {
      return state.documentStore.at(pointer);
    },
    query(jsonPath: string) {
      return state.documentStore.query(jsonPath);
    },
    validatePatch(
      operations: ReadonlyArray<JSONPatchOperation>,
    ): JSONPatchValidationResult {
      const prepared = prepareLocal(operations);
      return prepared.ok ? OK : prepared;
    },
    commit(
      operations: ReadonlyArray<JSONPatchOperation>,
      commitOptions?: JSONDocumentCommitOptions,
    ): JSONDocumentCommitResult {
      const prepared = prepareLocal(operations);
      if (!prepared.ok) return prepared;

      const committed = state.documentStore.commit(operations, commitOptions);
      if (!committed.ok) return committed;

      if (prepared.value.change !== null) {
        assignCausalState(state, {
          known: prepared.value.known,
          graph: prepared.value.graph,
          materialized: prepared.value.materialized,
          localCounter: prepared.value.change.changeId.counter,
        });
      }

      if (committed.change.applied.length > 0) {
        state.notify({
          documentChange: committed.change,
          replicaStatus: state.replicaStatus(),
        });
      }
      return committed;
    },
    subscribe(listener: Parameters<JSONDocument["subscribe"]>[0]) {
      return state.subscribeDocument(listener);
    },
  });
}
