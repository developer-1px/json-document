import {
  JSONDocumentError,
  type JSONDocument,
  type JSONPatchOperation,
  type Pointer,
} from "@interactive-os/json-document";
import {
  rebaseChange,
  type RebaseDiagnostic,
} from "@interactive-os/json-document-patch-rebase";
import {
  rebaseStableChange,
  type StableIdRebaseDiagnostic,
} from "@interactive-os/json-document-stable-id-rebase";

import type {
  CausalMaterializationDiagnostic,
  CausalPatchInbox,
  CausalPatchFailure,
  CausalPatchInboxOptions,
  CausalPatchInboxSnapshot,
  CausalPatchIngestResult,
  FailedCausalMaterialization,
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

interface PendingEnvelope<TDocument> {
  readonly envelope: StoredEnvelope<TDocument>;
  readonly missing: Set<string>;
}

interface AppliedEnvelope {
  readonly id: string;
  readonly operations: ReadonlyArray<JSONPatchOperation>;
}

type ReadyMaterialization =
  | {
      readonly ok: true;
      readonly operations: ReadonlyArray<JSONPatchOperation>;
      readonly selectionAfter?: Pointer;
      readonly diagnostics: ReadonlyArray<CausalMaterializationDiagnostic>;
    }
  | {
      readonly ok: false;
      readonly failure: FailedCausalMaterialization;
    };

let nextInboxInstance = 0;

export function createCausalPatchInbox<TDocument>(
  doc: JSONDocument<TDocument>,
  options: CausalPatchInboxOptions<TDocument> = {},
): CausalPatchInbox<TDocument> {
  const positionalSchema = options.positionalSchema;
  const stableIdScopes = options.stableIdScopes === undefined
    ? undefined
    : options.stableIdScopes.map((scope) => ({ ...scope }));
  const known = new Map<string, StoredEnvelope<TDocument>>();
  const queued = new Map<string, PendingEnvelope<TDocument>>();
  const dependents = new Map<string, Set<string>>();
  const readyIds = new ReadyIdHeap();
  const applied = new Set<string>();
  const appliedEnvelopes: AppliedEnvelope[] = [];
  const frontier = new Set<string>();
  const origin = `causal-patch-inbox:${nextInboxInstance += 1}`;
  let failure: CausalPatchFailure | undefined;
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
    input: Parameters<CausalPatchInbox<TDocument>["ingest"]>[0],
  ): CausalPatchIngestResult => {
    const envelopes: StoredEnvelope<TDocument>[] = [];
    for (const candidate of Array.isArray(input) ? input : [input]) {
      const prepared = prepareEnvelope<TDocument>(candidate);
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

    for (const envelope of envelopes) {
      if (!("intent" in envelope)) continue;
      const policy = envelope.intent.kind;
      const configured = policy === "positional"
        ? positionalSchema !== undefined
        : stableIdScopes !== undefined;
      if (!configured) {
        return {
          ok: false,
          code: "policy_not_configured",
          reason: `causal materialization policy is not configured: ${policy}`,
          id: envelope.id,
          policy,
          applied: [],
        };
      }
    }

    const duplicates = new Set<string>();
    const additions = new Map<string, StoredEnvelope<TDocument>>();
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
    const diagnostics: CausalMaterializationDiagnostic[] = [];
    while (true) {
      const readyId = readyIds.pop();
      if (readyId === undefined) break;
      const pending = queued.get(readyId);
      if (pending === undefined) continue;
      const ready = pending.envelope;

      const beforeMaterialization = doc.value;
      let materialized: ReadyMaterialization;
      try {
        materialized = materializeReadyEnvelope(
          ready,
          doc,
          positionalSchema,
          stableIdScopes,
          known,
          appliedEnvelopes,
        );
      } catch (error) {
        if (doc.value !== beforeMaterialization) diverged = true;
        if (!diverged) {
          fault = {
            id: ready.id,
            reason: error instanceof Error
              ? error.message
              : "causal materialization threw an unknown value",
            phase: "materialization",
          };
        }
        throw error;
      }
      if (doc.value !== beforeMaterialization) diverged = true;
      if (disposed) {
        return {
          ok: false,
          code: "disposed",
          reason: "causal inbox was disposed while materializing an envelope",
          ...ingestProgress(integrated, diagnostics),
        };
      }
      if (diverged) {
        return {
          ok: false,
          code: "projection_diverged",
          reason: "document projection changed while materializing a causal envelope",
          ...ingestProgress(integrated, diagnostics),
        };
      }
      if (!materialized.ok) {
        const failedMaterialization = copyMaterializationFailure(
          materialized.failure,
        );
        failure = failedMaterialization;
        return {
          ok: false,
          code: "materialization_failed",
          reason: materialized.failure.materialization.reason,
          ...failedMaterialization,
          ...ingestProgress(integrated, diagnostics),
        };
      }

      const beforeProjection = doc.value;
      let result: ReturnType<typeof doc.commit>;
      publicationCount = 0;
      applyingId = ready.id;
      try {
        result = doc.commit(materialized.operations, {
          origin,
          mergeKey: ready.id,
          ...(materialized.selectionAfter === undefined
            ? {}
            : { selectionAfter: materialized.selectionAfter }),
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
            ...ingestProgress(integrated, diagnostics),
          };
        }
        if (diverged) {
          return {
            ok: false,
            code: "projection_diverged",
            reason: "document projection changed while applying a causal envelope",
            ...ingestProgress(integrated, diagnostics),
          };
        }
        failure = { id: ready.id, result: copyJson(result) };
        return {
          ok: false,
          code: "patch_failed",
          reason: result.reason ?? `causal patch failed: ${ready.id}`,
          id: ready.id,
          result: copyJson(result),
          ...ingestProgress(integrated, diagnostics),
        };
      }

      if (positionalSchema !== undefined) {
        appliedEnvelopes.push({
          id: ready.id,
          operations: copyJson(doc.lastPatch),
        });
      }
      diagnostics.push(...materialized.diagnostics);
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
          ...ingestProgress(integrated, diagnostics),
        };
      }
      if (diverged) {
        return {
          ok: false,
          code: "projection_diverged",
          reason: "document projection changed while applying a causal envelope",
          ...ingestProgress(integrated, diagnostics),
        };
      }
    }

    const inputIds = new Set(envelopes.map(({ id }) => id));
    return {
      ok: true,
      ...ingestProgress(integrated, diagnostics),
      pending: [...inputIds].filter((id) => queued.has(id)).sort(compareIds),
      duplicates: [...duplicates],
    };
  };

  const ingest: CausalPatchInbox<TDocument>["ingest"] = (input) => {
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
      if ("materialization" in failure) {
        const failedMaterialization = copyMaterializationFailure(failure);
        return {
          ok: false,
          code: "blocked",
          reason: `causal inbox is blocked by failed materialization: ${failure.id}`,
          ...failedMaterialization,
          applied: [],
        };
      }
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
        ...(fault.phase === undefined ? {} : { phase: fault.phase }),
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

function materializeReadyEnvelope<TDocument>(
  ready: StoredEnvelope<TDocument>,
  doc: JSONDocument<TDocument>,
  positionalSchema: CausalPatchInboxOptions<TDocument>["positionalSchema"],
  stableIdScopes: CausalPatchInboxOptions<TDocument>["stableIdScopes"],
  known: ReadonlyMap<string, StoredEnvelope<TDocument>>,
  appliedEnvelopes: ReadonlyArray<AppliedEnvelope>,
): ReadyMaterialization {
  if ("operations" in ready) {
    return {
      ok: true,
      operations: ready.operations,
      diagnostics: [],
    };
  }

  if (ready.intent.kind === "positional") {
    if (positionalSchema === undefined) {
      throw new Error("positional materialization policy was not configured");
    }
    const causalPast = collectCausalPast(ready.dependsOn, known);
    const planned = rebaseChange(positionalSchema, {
      base: ready.intent.base,
      concurrentBatches: appliedEnvelopes
        .filter(({ id }) => !causalPast.has(id))
        .map(({ operations }) => operations),
      operations: ready.intent.operations,
      ...(ready.intent.selectionAfter === undefined
        ? {}
        : { selectionAfter: ready.intent.selectionAfter }),
    });
    if (!planned.ok) {
      return {
        ok: false,
        failure: {
          id: ready.id,
          policy: "positional",
          materialization: copyJson(planned),
        },
      };
    }
    return {
      ok: true,
      operations: planned.operations,
      ...(planned.selectionAfter === undefined
        ? {}
        : { selectionAfter: planned.selectionAfter }),
      diagnostics: planned.diagnostics.map((diagnostic) => {
        return positionalDiagnostic(ready.id, diagnostic);
      }),
    };
  }

  if (stableIdScopes === undefined) {
    throw new Error("stable-id materialization policy was not configured");
  }
  const planned = rebaseStableChange(doc, {
    scopes: stableIdScopes,
    target: ready.intent.target,
    relativePath: ready.intent.relativePath,
    expected: ready.intent.expected,
    value: ready.intent.value,
    ...(ready.intent.relativeSelectionAfter === undefined
      ? {}
      : { relativeSelectionAfter: ready.intent.relativeSelectionAfter }),
  });
  if (!planned.ok) {
    return {
      ok: false,
      failure: {
        id: ready.id,
        policy: "stable-id-replace",
        materialization: copyJson(planned),
      },
    };
  }
  return {
    ok: true,
    operations: planned.operations,
    ...(planned.selectionAfter === undefined
      ? {}
      : { selectionAfter: planned.selectionAfter }),
    diagnostics: planned.diagnostics.map((diagnostic) => {
      return stableIdDiagnostic(ready.id, diagnostic);
    }),
  };
}

function collectCausalPast<TDocument>(
  dependencies: ReadonlyArray<string>,
  known: ReadonlyMap<string, StoredEnvelope<TDocument>>,
): Set<string> {
  const past = new Set<string>();
  const pending = [...dependencies];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (past.has(id)) continue;
    past.add(id);
    const dependency = known.get(id);
    if (dependency !== undefined) pending.push(...dependency.dependsOn);
  }
  return past;
}

function positionalDiagnostic(
  id: string,
  diagnostic: RebaseDiagnostic,
): CausalMaterializationDiagnostic {
  return { id, policy: "positional", ...copyJson(diagnostic) };
}

function stableIdDiagnostic(
  id: string,
  diagnostic: StableIdRebaseDiagnostic,
): CausalMaterializationDiagnostic {
  return { id, policy: "stable-id-replace", ...copyJson(diagnostic) };
}

function ingestProgress(
  applied: ReadonlyArray<string>,
  diagnostics: ReadonlyArray<CausalMaterializationDiagnostic>,
): {
  readonly applied: ReadonlyArray<string>;
  readonly diagnostics?: ReadonlyArray<CausalMaterializationDiagnostic>;
} {
  return diagnostics.length === 0
    ? { applied }
    : { applied, diagnostics };
}

function copyFailure(failure: CausalPatchFailure): CausalPatchFailure {
  if ("materialization" in failure) {
    return copyMaterializationFailure(failure);
  }
  return {
    id: failure.id,
    result: copyJson(failure.result),
  };
}

function copyMaterializationFailure(
  failure: FailedCausalMaterialization,
): FailedCausalMaterialization {
  if (failure.policy === "positional") {
    return {
      id: failure.id,
      policy: "positional",
      materialization: copyJson(failure.materialization),
    };
  }
  return {
    id: failure.id,
    policy: "stable-id-replace",
    materialization: copyJson(failure.materialization),
  };
}
