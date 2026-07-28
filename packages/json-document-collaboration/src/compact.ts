import type {
  JSONCapabilityResult,
  JSONValue,
} from "@interactive-os/json-document";

import {
  canonicalMembership,
  changeIdKey,
  changesEqual,
  createEpoch,
  findActorDependencyFork,
  findActorFork,
  graphCycle,
  prepareGraph,
} from "./change.js";
import {
  createCheckpoint,
  prepareCheckpoint,
} from "./checkpoint.js";
import {
  acceptCandidate,
  materializeChanges,
} from "./materialize.js";
import {
  createInitialTree,
  projectTree,
} from "./tree.js";
import type {
  CollaborationChange,
  CollaborationCheckpoint,
  CollaborationCompactionOptions,
  CollaborationCompactionResult,
  CollaborationMembership,
  ChangeId,
} from "./types.js";

export function compactCollaborationCheckpoint(
  input: unknown,
  options: CollaborationCompactionOptions,
): CollaborationCompactionResult {
  const prepared = prepareCheckpoint(input);
  if (!prepared.ok) {
    return failure("invalid_checkpoint", prepared.reason);
  }
  const checkpoint = prepared.checkpoint;
  if (typeof options !== "object" || options === null) {
    return failure("invalid_options", "compaction options must be an object");
  }
  if (
    checkpoint.payload.epoch.acceptance === "custom"
    && options.accepts === undefined
  ) {
    return failure(
      "acceptance_required",
      "this checkpoint requires the acceptance resolver bound to its ruleset",
    );
  }
  if (
    checkpoint.payload.epoch.acceptance === "none"
    && options.accepts !== undefined
  ) {
    return failure(
      "ruleset_mismatch",
      "this checkpoint epoch does not bind a custom acceptance resolver",
    );
  }
  const invalidOptions = validateOptions(checkpoint, options);
  if (invalidOptions !== null) return invalidOptions;

  const verification = verifyCheckpoint(checkpoint, options);
  if (verification !== null) return verification;

  const changes = new Map<string, CollaborationChange>();
  for (const change of checkpoint.payload.changes) {
    const unauthorized = unauthorizedReference(
      change,
      checkpoint.payload.membership,
    );
    if (unauthorized !== null) {
      return failure(
        "membership_violation",
        "checkpoint references an actor outside its epoch membership",
      );
    }
    const key = changeIdKey(change.changeId);
    const existing = changes.get(key);
    if (existing !== undefined && !changesEqual(existing, change)) {
      return failure(
        "duplicate_mismatch",
        "a checkpoint changeId has conflicting payloads",
      );
    }
    if (existing === undefined) changes.set(key, change);
  }
  const cycle = graphCycle(changes);
  if (cycle !== null) {
    return failure(
      "dependency_cycle",
      "checkpoint causal dependencies contain a cycle",
    );
  }
  const dependencyFork = findActorDependencyFork(changes);
  if (dependencyFork !== null) {
    return failure(
      "actor_fork",
      "checkpoint actor history is not one contiguous causal chain",
    );
  }
  const graph = prepareGraph(changes);
  if (graph.pending.length > 0) {
    return failure(
      "pending_changes",
      "new-epoch compaction requires a checkpoint with no pending Changes",
    );
  }
  const actorFork = findActorFork(graph.ordered);
  if (actorFork !== null) {
    return failure(
      "actor_fork",
      "checkpoint actor history is not one contiguous causal chain",
    );
  }

  const initialTree = createInitialTree(
    checkpoint.payload.base,
    checkpoint.payload.epoch.baseDigest,
  );
  const initialProjection = projectTree(initialTree, () => false);
  if (!initialProjection.ok) {
    return failure(
      "invalid_checkpoint",
      initialProjection.reason ?? "checkpoint base is not materializable",
    );
  }
  const initialAcceptance = safeAccept(
    options.accepts,
    initialProjection.value,
  );
  if (!initialAcceptance.ok) {
    return failure(
      initialAcceptance.code,
      initialAcceptance.reason
        ?? "checkpoint base was rejected by the source ruleset",
    );
  }

  let materialized;
  try {
    materialized = materializeChanges(
      initialTree,
      graph.ordered,
      (candidate) => safeAccept(options.accepts, candidate),
    );
  } catch (error) {
    return failure(
      "checkpoint_materialization_failed",
      error instanceof Error
        ? error.message
        : "checkpoint materialization failed",
    );
  }
  const nextAccepts = effectiveNextAcceptance(checkpoint, options);
  const nextAcceptance = safeAccept(
    nextAccepts,
    materialized.value,
  );
  if (!nextAcceptance.ok) {
    return failure(
      nextAcceptance.code,
      nextAcceptance.reason
        ?? "compacted base was rejected by the next ruleset",
    );
  }

  let nextMembership: CollaborationMembership | null;
  try {
    nextMembership = options.nextMembership === undefined
      ? checkpoint.payload.membership
      : options.nextMembership === null
        ? null
        : canonicalMembership(options.nextMembership);
  } catch (error) {
    return failure(
      "invalid_membership",
      error instanceof Error ? error.message : "next membership is invalid",
    );
  }

  const nextEpoch = createEpoch(
    materialized.value,
    {
      actorId: "__checkpoint_compactor__",
      epochId: options.nextEpochId,
      ruleset: options.nextRuleset,
      ...(nextMembership === null ? {} : { membership: nextMembership }),
      ...(nextAccepts === undefined
        ? {}
        : { accepts: nextAccepts }),
    },
    {
      epochId: checkpoint.payload.epoch.epochId,
      checkpointDigest: checkpoint.integrity.digest,
    },
  );
  const compacted = createCheckpoint(
    materialized.value,
    nextMembership,
    nextEpoch,
    [],
  );
  const discardedHistoryControls = checkpoint.payload.changes.filter(
    (change) => change.ops.some((operation) => (
      operation.kind === "undo-change" || operation.kind === "redo-change"
    )),
  ).length;

  return Object.freeze({
    ok: true,
    checkpoint: compacted,
    report: Object.freeze({
      discardedChanges: checkpoint.payload.changes.length,
      discardedConflicts: materialized.conflicts.length,
      discardedSuppressed: materialized.suppressed.length,
      discardedHistoryControls,
    }),
  });
}

function validateOptions(
  checkpoint: CollaborationCheckpoint,
  options: CollaborationCompactionOptions,
): Extract<CollaborationCompactionResult, { readonly ok: false }> | null {
  if (typeof options !== "object" || options === null) {
    return failure("invalid_options", "compaction options must be an object");
  }
  if (options.mode !== "new-epoch") {
    return failure(
      "invalid_compaction_mode",
      "causal history can only be compacted into a new epoch",
    );
  }
  if (
    typeof options.nextEpochId !== "string"
    || options.nextEpochId.length === 0
  ) {
    return failure(
      "invalid_epoch",
      "nextEpochId must be a non-empty string",
    );
  }
  if (options.nextEpochId === checkpoint.payload.epoch.epochId) {
    return failure(
      "epoch_reuse",
      "new-epoch compaction must use a different epochId",
    );
  }
  if (options.nextEpochId === checkpoint.payload.epoch.parent?.epochId) {
    return failure(
      "epoch_reuse",
      "new-epoch compaction cannot reuse the immediate parent epochId",
    );
  }
  if (
    typeof options.nextRuleset !== "object"
    || options.nextRuleset === null
    || typeof options.nextRuleset.id !== "string"
    || options.nextRuleset.id.length === 0
    || typeof options.nextRuleset.digest !== "string"
    || options.nextRuleset.digest.length === 0
  ) {
    return failure(
      "invalid_ruleset",
      "nextRuleset id and digest must be non-empty strings",
    );
  }
  const sameRuleset = (
    options.nextRuleset.id === checkpoint.payload.epoch.ruleset.id
    && options.nextRuleset.digest === checkpoint.payload.epoch.ruleset.digest
  );
  const nextAcceptance = effectiveNextAcceptance(
    checkpoint,
    options,
  ) === undefined
    ? "none"
    : "custom";
  if (
    sameRuleset
    && nextAcceptance !== checkpoint.payload.epoch.acceptance
  ) {
    return failure(
      "ruleset_mismatch",
      "the same ruleset identity cannot change acceptance mode",
    );
  }
  return null;
}

function effectiveNextAcceptance(
  checkpoint: CollaborationCheckpoint,
  options: CollaborationCompactionOptions,
): CollaborationCompactionOptions["nextAccepts"] {
  if (options.nextAccepts !== undefined) return options.nextAccepts;
  return (
    options.nextRuleset.id === checkpoint.payload.epoch.ruleset.id
    && options.nextRuleset.digest === checkpoint.payload.epoch.ruleset.digest
  )
    ? options.accepts
    : undefined;
}

function verifyCheckpoint(
  checkpoint: CollaborationCheckpoint,
  options: CollaborationCompactionOptions,
): Extract<CollaborationCompactionResult, { readonly ok: false }> | null {
  if (options.verify === undefined) return null;
  try {
    const result = options.verify(checkpoint);
    if (result?.ok === true) return null;
    if (result?.ok === false && typeof result.code === "string") {
      return failure(
        result.code,
        result.reason ?? "checkpoint proof verification failed",
      );
    }
    return failure(
      "checkpoint_verification_failed",
      "checkpoint verifier must return a capability result",
    );
  } catch (error) {
    return failure(
      "checkpoint_verification_failed",
      error instanceof Error
        ? error.message
        : "checkpoint proof verification failed",
    );
  }
}

function safeAccept(
  accepts: ((candidate: JSONValue) => JSONCapabilityResult) | undefined,
  candidate: JSONValue,
): JSONCapabilityResult {
  return acceptCandidate(accepts, candidate);
}

function unauthorizedReference(
  change: CollaborationChange,
  membership: CollaborationMembership | null,
): ChangeId | null {
  if (membership === null) return null;
  const allowed = (actorId: string): boolean => (
    membership.members.some((member) => member.actorId === actorId)
  );
  if (!allowed(change.changeId.actorId)) return change.changeId;
  for (const dependency of change.deps) {
    if (!allowed(dependency.actorId)) return dependency;
  }
  for (const operation of change.ops) {
    const referenced = operation.kind === "undo-change"
      ? operation.target
      : operation.kind === "redo-change"
        ? operation.undo
        : null;
    if (referenced !== null && !allowed(referenced.actorId)) return referenced;
  }
  return null;
}

function failure(
  code: string,
  reason: string,
): Extract<CollaborationCompactionResult, { readonly ok: false }> {
  return Object.freeze({ ok: false, code, reason });
}
