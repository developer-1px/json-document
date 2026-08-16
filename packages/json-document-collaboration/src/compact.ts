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
  verifyCheckpointProof,
} from "./checkpoint.js";
import {
  validateCandidate,
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
  const validate = options.validate;
  if (
    checkpoint.payload.epoch.acceptance === "custom"
    && validate === undefined
  ) {
    return failure(
      "acceptance_required",
      "this checkpoint requires the acceptance resolver bound to its ruleset",
    );
  }
  if (
    checkpoint.payload.epoch.acceptance === "none"
    && validate !== undefined
  ) {
    return failure(
      "ruleset_mismatch",
      "this checkpoint epoch does not bind a custom acceptance resolver",
    );
  }
  const invalidOptions = validateOptions(checkpoint, options);
  if (invalidOptions !== null) return invalidOptions;

  const verification = verifyCheckpointProof(checkpoint, options.verify);
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
  const initialDocument = projectTree(initialTree, () => false);
  if (!initialDocument.ok) {
    return failure(
      "invalid_checkpoint",
      initialDocument.reason ?? "checkpoint base is not materializable",
    );
  }
  const initialValidation = validateCandidate(validate, initialDocument.value);
  if (!initialValidation.ok) {
    return failure(
      initialValidation.code,
      initialValidation.reason
        ?? "checkpoint base was rejected by the source ruleset",
    );
  }

  let materialized;
  try {
    materialized = materializeChanges(
      initialTree,
      graph.ordered,
      validate === undefined
        ? undefined
        : (candidate) => validateCandidate(validate, candidate),
    );
  } catch (error) {
    return failure(
      "checkpoint_materialization_failed",
      error instanceof Error
        ? error.message
        : "checkpoint materialization failed",
    );
  }
  const nextValidate = effectiveNextValidation(checkpoint, options);
  const nextValidation = validateCandidate(nextValidate, materialized.value);
  if (!nextValidation.ok) {
    return failure(
      nextValidation.code,
      nextValidation.reason
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
      ...(nextValidate === undefined
        ? {}
        : { validate: nextValidate }),
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
  const discardedHistoryChanges = checkpoint.payload.changes.filter(
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
      discardedHistoryChanges,
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
  const nextValidation = effectiveNextValidation(
    checkpoint,
    options,
  ) === undefined
    ? "none"
    : "custom";
  if (
    sameRuleset
    && nextValidation !== checkpoint.payload.epoch.acceptance
  ) {
    return failure(
      "ruleset_mismatch",
      "the same ruleset identity cannot change acceptance mode",
    );
  }
  return null;
}

function effectiveNextValidation(
  checkpoint: CollaborationCheckpoint,
  options: CollaborationCompactionOptions,
): CollaborationCompactionOptions["nextValidate"] {
  if (options.nextValidate !== undefined) return options.nextValidate;
  return (
    options.nextRuleset.id === checkpoint.payload.epoch.ruleset.id
    && options.nextRuleset.digest === checkpoint.payload.epoch.ruleset.digest
  )
    ? options.validate
    : undefined;
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
