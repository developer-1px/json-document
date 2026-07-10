import {
  JSONDocumentError,
  type JSONDocument,
} from "@interactive-os/json-document";

import type {
  CausalPatchInbox,
  CausalPatchInboxSnapshot,
  CausalPatchIngestResult,
  FailedCausalPatch,
  FaultedCausalPatch,
} from "./types.js";
import {
  copyJson,
  envelopesEqual,
  prepareEnvelope,
  type StoredEnvelope,
} from "./envelope.js";
import {
  findIntroducedDependencyCycle,
} from "./graph.js";
import {
  ReadyIdHeap,
  compareIds,
} from "./ready.js";

interface PendingEnvelope {
  readonly envelope: StoredEnvelope;
  readonly missing: Set<string>;
}

let nextInboxInstance = 0;

export function createCausalPatchInbox<TDocument>(
  doc: JSONDocument<TDocument>,
): CausalPatchInbox {
  const known = new Map<string, StoredEnvelope>();
  const queued = new Map<string, PendingEnvelope>();
  const dependents = new Map<string, Set<string>>();
  const readyIds = new ReadyIdHeap();
  const applied = new Set<string>();
  const frontier = new Set<string>();
  const origin = `causal-patch-inbox:${nextInboxInstance += 1}`;
  let failure: FailedCausalPatch | undefined;
  let fault: FaultedCausalPatch | undefined;
  let diverged = false;
  let disposed = false;
  let busy = false;
  let applyingId: string | undefined;
  let publicationCount = 0;
  let observing = true;
  const unsubscribeDocument = doc.subscribe((_applied, metadata) => {
    publicationCount += 1;
    if (
      publicationCount > 1
      || !busy
      || applyingId === undefined
      || metadata?.origin !== origin
      || metadata.mergeKey !== applyingId
    ) {
      diverged = true;
    }
  });
  const stopObserving = (): void => {
    if (!observing) return;
    observing = false;
    unsubscribeDocument();
  };

  const current = (): CausalPatchInboxSnapshot => ({
    status: disposed
      ? "disposed"
      : diverged
        ? "diverged"
        : fault !== undefined
          ? "faulted"
          : failure === undefined
            ? "active"
            : "blocked",
    frontier: [...frontier].sort(compareIds),
    queued: [...queued.values()]
      .sort((left, right) => compareIds(left.envelope.id, right.envelope.id))
      .map((pending) => ({
        id: pending.envelope.id,
        missing: [...pending.missing].sort(compareIds),
      })),
    ...(failure === undefined
      ? {}
      : { failure: copyFailure(failure) }),
    ...(fault === undefined
      ? {}
      : { fault: { ...fault } }),
  });

  const ingestWhileBusy = (
    input: Parameters<CausalPatchInbox["ingest"]>[0],
  ): CausalPatchIngestResult => {
    const envelopes: StoredEnvelope[] = [];
    for (const candidate of Array.isArray(input) ? input : [input]) {
      const prepared = prepareEnvelope(candidate);
      if (!prepared.ok) {
        return {
          ok: false,
          code: "invalid_envelope",
          reason: prepared.reason,
          ...(prepared.id === undefined ? {} : { id: prepared.id }),
          applied: [],
        };
      }
      envelopes.push(prepared.envelope);
    }
    if (disposed) {
      return {
        ok: false,
        code: "disposed",
        reason: "causal inbox was disposed while reading envelopes",
        applied: [],
      };
    }
    if (diverged) {
      return {
        ok: false,
        code: "projection_diverged",
        reason: "document projection changed while reading causal envelopes",
        applied: [],
      };
    }

    const duplicates = new Set<string>();
    const additions = new Map<string, StoredEnvelope>();
    for (const envelope of envelopes) {
      const existing = known.get(envelope.id) ?? additions.get(envelope.id);
      if (existing !== undefined) {
        if (!envelopesEqual(existing, envelope)) {
          return {
            ok: false,
            code: "duplicate_mismatch",
            reason: `causal envelope id has a different payload: ${envelope.id}`,
            id: envelope.id,
            applied: [],
          };
        }
        duplicates.add(envelope.id);
        continue;
      }
      additions.set(envelope.id, envelope);
    }

    const cycle = findIntroducedDependencyCycle(
      additions,
      (id) => queued.get(id)?.envelope,
      (id) => dependents.has(id),
    );
    if (cycle !== null) {
      return {
        ok: false,
        code: "dependency_cycle",
        reason: `causal dependency cycle: ${cycle.cycle.join(" -> ")}`,
        id: cycle.id,
        cycle: cycle.cycle,
        applied: [],
      };
    }

    for (const envelope of additions.values()) {
      known.set(envelope.id, envelope);
      const missing = new Set(
        envelope.dependsOn.filter((dependency) => !applied.has(dependency)),
      );
      queued.set(envelope.id, { envelope, missing });
      if (missing.size === 0) {
        readyIds.push(envelope.id);
        continue;
      }
      for (const dependency of missing) {
        const waiting = dependents.get(dependency) ?? new Set<string>();
        waiting.add(envelope.id);
        dependents.set(dependency, waiting);
      }
    }

    const integrated: string[] = [];
    while (true) {
      const readyId = readyIds.pop();
      if (readyId === undefined) break;
      const pending = queued.get(readyId);
      if (pending === undefined) continue;
      const ready = pending.envelope;

      const beforeProjection = doc.value;
      let result: ReturnType<typeof doc.patch>;
      publicationCount = 0;
      applyingId = ready.id;
      try {
        result = doc.patch(ready.operations, {
          origin,
          mergeKey: ready.id,
        });
      } catch (error) {
        if (doc.value !== beforeProjection) diverged = true;
        if (!diverged && error instanceof JSONDocumentError) {
          failure = {
            id: ready.id,
            result: copyJson(error.result),
          };
        } else if (!diverged) {
          fault = {
            id: ready.id,
            reason: error instanceof Error
              ? error.message
              : "document patch threw an unknown value",
          };
        }
        throw error;
      } finally {
        applyingId = undefined;
      }

      if (!result.ok) {
        if (doc.value !== beforeProjection) diverged = true;
        if (disposed) {
          return {
            ok: false,
            code: "disposed",
            reason: "causal inbox was disposed while applying an envelope",
            applied: integrated,
          };
        }
        if (diverged) {
          return {
            ok: false,
            code: "projection_diverged",
            reason: "document projection changed while applying a causal envelope",
            applied: integrated,
          };
        }
        failure = { id: ready.id, result: copyJson(result) };
        return {
          ok: false,
          code: "patch_failed",
          reason: result.reason ?? `causal patch failed: ${ready.id}`,
          id: ready.id,
          result: copyJson(result),
          applied: integrated,
        };
      }

      queued.delete(ready.id);
      applied.add(ready.id);
      for (const dependency of ready.dependsOn) frontier.delete(dependency);
      frontier.add(ready.id);
      integrated.push(ready.id);
      const waiting = dependents.get(ready.id);
      if (waiting !== undefined) {
        for (const dependentId of waiting) {
          const dependent = queued.get(dependentId);
          if (dependent === undefined) continue;
          dependent.missing.delete(ready.id);
          if (dependent.missing.size === 0) readyIds.push(dependentId);
        }
        dependents.delete(ready.id);
      }
      if (disposed) {
        return {
          ok: false,
          code: "disposed",
          reason: "causal inbox was disposed while applying an envelope",
          applied: integrated,
        };
      }
      if (diverged) {
        return {
          ok: false,
          code: "projection_diverged",
          reason: "document projection changed while applying a causal envelope",
          applied: integrated,
        };
      }
    }

    const inputIds = new Set(envelopes.map(({ id }) => id));
    return {
      ok: true,
      applied: integrated,
      pending: [...inputIds].filter((id) => queued.has(id)).sort(compareIds),
      duplicates: [...duplicates],
    };
  };

  const ingest: CausalPatchInbox["ingest"] = (input) => {
    if (disposed) {
      return {
        ok: false,
        code: "disposed",
        reason: "causal inbox is disposed",
        applied: [],
      };
    }
    if (busy) {
      return {
        ok: false,
        code: "busy",
        reason: "causal inbox is processing another ingestion",
        applied: [],
      };
    }
    if (diverged) {
      return {
        ok: false,
        code: "projection_diverged",
        reason: "document projection changed outside the causal inbox",
        applied: [],
      };
    }
    if (failure !== undefined) {
      return {
        ok: false,
        code: "blocked",
        reason: `causal inbox is blocked by failed envelope: ${failure.id}`,
        id: failure.id,
        result: copyJson(failure.result),
        applied: [],
      };
    }
    if (fault !== undefined) {
      return {
        ok: false,
        code: "faulted",
        reason: `causal inbox faulted while applying envelope: ${fault.id}`,
        id: fault.id,
        applied: [],
      };
    }

    busy = true;
    try {
      return ingestWhileBusy(input);
    } finally {
      busy = false;
      if (disposed) stopObserving();
    }
  };

  return {
    ingest,
    current,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (!busy) stopObserving();
    },
  };
}

function copyFailure(failure: FailedCausalPatch): FailedCausalPatch {
  return {
    id: failure.id,
    result: copyJson(failure.result),
  };
}
