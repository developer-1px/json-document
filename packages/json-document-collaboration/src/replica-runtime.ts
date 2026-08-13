import { createCheckpoint } from "./checkpoint.js";
import {
  checkEpoch,
  changeIdKey,
  changesEqual,
  compareChangeIds,
  compareChanges,
  findActorDependencyFork,
  findActorFork,
  freezeChangeId,
  graphCycle,
  prepareBundle,
  prepareGraph,
  unauthorizedChange,
} from "./change.js";
import { jsonEqual } from "./json-equal.js";
import { materializeChanges } from "./materialize.js";
import type { RuntimeState } from "./runtime-state.js";
import type {
  ChangeId,
  CollaborationBundle,
  CollaborationIngestResult,
  CollaborationReplica,
} from "./types.js";

export function createReplicaRuntime(state: RuntimeState): CollaborationReplica {
  return Object.freeze({
    epoch: state.epoch,
    status: () => state.replicaStatus(),
    exportBundle(): CollaborationBundle {
      return Object.freeze({
        epoch: state.epoch,
        changes: Object.freeze([...state.known.values()].sort(compareChanges)),
      });
    },
    exportCheckpoint() {
      return createCheckpoint(
        state.initialValue,
        state.membership,
        state.epoch,
        [...state.known.values()].sort(compareChanges),
      );
    },
    ingest(input: unknown): CollaborationIngestResult {
      if (state.evaluatingValidation) {
        return {
          ok: false,
          code: "acceptance_reentrancy",
          reason: "validation callback cannot ingest collaboration changes",
        };
      }
      const prepared = prepareBundle(input);
      if (!prepared.ok) {
        return {
          ok: false,
          code: "invalid_bundle",
          reason: prepared.reason,
        };
      }
      const compatibility = checkEpoch(state.epoch, prepared.bundle.epoch);
      if (compatibility !== null) return compatibility;
      const unauthorized = unauthorizedChange(
        prepared.bundle.changes,
        state.membership,
      );
      if (unauthorized !== null) {
        return {
          ok: false,
          code: "membership_violation",
          reason: "bundle references an actor outside this epoch membership",
          changeId: freezeChangeId(unauthorized),
        };
      }

      const nextKnown = new Map(state.known);
      const duplicates: ChangeId[] = [];
      let additions = 0;
      for (const change of prepared.bundle.changes) {
        const key = changeIdKey(change.changeId);
        const existing = nextKnown.get(key);
        if (existing !== undefined) {
          if (!changesEqual(existing, change)) {
            return {
              ok: false,
              code: "duplicate_mismatch",
              reason: "a known changeId has a different payload",
              changeId: freezeChangeId(change.changeId),
            };
          }
          duplicates.push(freezeChangeId(change.changeId));
          continue;
        }
        nextKnown.set(key, change);
        additions += 1;
      }

      const cycle = graphCycle(nextKnown);
      if (cycle !== null) {
        return {
          ok: false,
          code: "dependency_cycle",
          reason: "causal change dependencies contain a cycle",
          changeId: freezeChangeId(cycle),
        };
      }
      const dependencyFork = findActorDependencyFork(nextKnown);
      if (dependencyFork !== null) {
        return {
          ok: false,
          code: "actor_fork",
          reason: "one actorId must form one contiguous causal change chain",
          changeId: freezeChangeId(dependencyFork),
        };
      }
      if (additions === 0) {
        return {
          ok: true,
          integrated: Object.freeze([]),
          pending: Object.freeze(state.graph.pending.map((row) => row.changeId)),
          duplicates: Object.freeze(duplicates.sort(compareChangeIds)),
        };
      }

      const nextGraph = prepareGraph(nextKnown);
      const actorFork = findActorFork(nextGraph.ordered);
      if (actorFork !== null) {
        return {
          ok: false,
          code: "actor_fork",
          reason: "one actorId must form one contiguous causal change chain",
          changeId: freezeChangeId(actorFork),
        };
      }
      const previousReady = state.graph.readyKeys;
      const integrated = nextGraph.ordered
        .filter((change) => !previousReady.has(changeIdKey(change.changeId)))
        .map((change) => freezeChangeId(change.changeId))
        .sort(compareChangeIds);
      const nextMaterialized = materializeChanges(
        state.initialTree,
        nextGraph.ordered,
        (candidate) => state.evaluateValidation(candidate),
      );
      const changed = !jsonEqual(state.documentStore.value, nextMaterialized.value);

      state.known = nextKnown;
      state.graph = nextGraph;
      state.materialized = nextMaterialized;
      state.graphRevision += 1;
      for (const change of prepared.bundle.changes) {
        if (
          change.changeId.actorId === state.actorId
          && change.changeId.counter > state.localCounter
        ) {
          state.localCounter = change.changeId.counter;
        }
      }

      let documentChange = undefined;
      if (changed) {
        const documentCommit = state.documentStore.commit([{
          op: "replace",
          path: "",
          value: state.materialized.value,
        }]);
        if (!documentCommit.ok) {
          throw new Error(
            `collaboration document commit failed: ${documentCommit.reason ?? documentCommit.code}`,
          );
        }
        documentChange = documentCommit.change;
      }
      state.notify({
        ...(documentChange === undefined ? {} : { documentChange }),
        replicaStatus: state.replicaStatus(),
      });

      return {
        ok: true,
        integrated: Object.freeze(integrated),
        pending: Object.freeze(
          nextGraph.pending
            .map((row) => row.changeId)
            .sort(compareChangeIds),
        ),
        duplicates: Object.freeze(duplicates.sort(compareChangeIds)),
      };
    },
    subscribe(listener: Parameters<CollaborationReplica["subscribe"]>[0]) {
      return state.subscribeReplica(listener);
    },
  });
}
