import type {
  JSONChangeMetadata,
  JSONDocument,
} from "@interactive-os/json-document/session";

import {
  applyGuardedChange,
  canAcceptChange,
  canCloseChange,
} from "./accept.js";
import {
  copyChange,
} from "./copy.js";
import {
  proposedChangeError,
} from "./errors.js";
import {
  canProposeChange,
  createChange,
} from "./plan.js";
import {
  emit,
  initialChanges,
  nextChangeId,
  snapshot,
  snapshotSignature,
} from "./store.js";
import type {
  ProposedChangeListener,
  ProposedChanges,
  ProposedChangesOptions,
  ProposedChangeState,
} from "./types.js";

export function createProposedChanges<TDocument>(
  doc: JSONDocument<TDocument>,
  options: ProposedChangesOptions = {},
): ProposedChanges<TDocument> {
  const initial = initialChanges(options.initial ?? []);
  const state: ProposedChangeState = {
    nextId: initial.nextId,
    changes: initial.changes,
  };
  const listeners = new Set<ProposedChangeListener>();
  const acceptingIds = new Set<string>();

  const emitIfChanged = (before: string): void => {
    const after = snapshotSignature(state.changes);
    if (before === after) return;
    emit(listeners, snapshot(state.changes));
  };

  return {
    current: (filter = {}) => snapshot(state.changes, filter),
    byId(id) {
      const change = state.changes.get(id);
      return change === undefined ? null : copyChange(change);
    },
    canPropose: (input) => canProposeChange(doc, state.changes, input),
    propose(input) {
      const plan = canProposeChange(doc, state.changes, input);
      if (!plan.ok) return plan;

      const before = snapshotSignature(state.changes);
      const id = input.id ?? nextChangeId(state);
      const change = createChange(id, input, plan);
      state.changes.set(id, change);
      emitIfChanged(before);
      return { ok: true, change: copyChange(change) };
    },
    canAccept: (id) => acceptingIds.has(id)
      ? acceptanceInProgress(id, "accept")
      : canAcceptChange(doc, state.changes, id),
    accept(id, metadata?: JSONChangeMetadata) {
      if (acceptingIds.has(id)) return acceptanceInProgress(id, "accept");
      acceptingIds.add(id);
      try {
        const capability = canAcceptChange(doc, state.changes, id);
        if (!capability.ok) return capability;

        const guarded = applyGuardedChange(doc, capability.change, metadata);
        if (!guarded.ok) return guarded;

        const before = snapshotSignature(state.changes);
        const change = state.changes.get(id)!;
        change.status = "accepted";
        acceptingIds.delete(id);
        emitIfChanged(before);
        return { ok: true, change: copyChange(change), result: guarded.result };
      } finally {
        acceptingIds.delete(id);
      }
    },
    canReject: (id) => acceptingIds.has(id)
      ? acceptanceInProgress(id, "reject")
      : canCloseChange(state.changes, id),
    reject(id) {
      if (acceptingIds.has(id)) return acceptanceInProgress(id, "reject");
      const capability = canCloseChange(state.changes, id);
      if (!capability.ok) return capability;

      const before = snapshotSignature(state.changes);
      const change = state.changes.get(id)!;
      change.status = "rejected";
      emitIfChanged(before);
      return { ok: true, change: copyChange(change) };
    },
    load(next) {
      const before = snapshotSignature(state.changes);
      const accepting = [...acceptingIds]
        .map((id) => state.changes.get(id))
        .filter((change): change is NonNullable<typeof change> => change !== undefined);
      const initial = initialChanges([...next, ...accepting]);
      state.changes = initial.changes;
      state.nextId = initial.nextId;
      emitIfChanged(before);
    },
    remove(id) {
      if (acceptingIds.has(id)) return false;
      const before = snapshotSignature(state.changes);
      const removed = state.changes.delete(id);
      if (removed) emitIfChanged(before);
      return removed;
    },
    clear() {
      const before = snapshotSignature(state.changes);
      if (acceptingIds.size === 0) {
        state.changes.clear();
      } else {
        for (const id of state.changes.keys()) {
          if (!acceptingIds.has(id)) state.changes.delete(id);
        }
      }
      emitIfChanged(before);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function acceptanceInProgress(id: string, action: "accept" | "reject") {
  return proposedChangeError("not_open", `cannot ${action} change while acceptance is in progress: ${id}`, { id });
}
