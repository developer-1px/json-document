import {
  canonicalStringify,
} from "./change.js";
import {
  prepareCheckpoint,
  verifyCheckpointProof,
} from "./checkpoint.js";
import {
  createRestoredRuntime,
  createRestoredTextRuntime,
} from "./create.js";
import type { JSONValue } from "@interactive-os/json-document";
import type {
  CollaborationHistoryRestoreResult,
  CollaborationHistoryRuntime,
  CollaborationRestoreOptions,
  CollaborationRestoreResult,
  CollaborationRuntime,
  CollaborationTextRestoreResult,
  CollaborationTextRuntime,
} from "./types.js";

type RestoredProfileRuntime =
  | CollaborationHistoryRuntime
  | CollaborationTextRuntime;

type RestoredProfileResult =
  | { readonly ok: true; readonly runtime: RestoredProfileRuntime }
  | { readonly ok: false; readonly code: string; readonly reason: string };

export function restoreCollaborationRuntime(
  input: unknown,
  options: CollaborationRestoreOptions,
): CollaborationRestoreResult {
  const restored = restoreCollaborationHistoryRuntime(input, options);
  if (!restored.ok) return restored;
  const runtime: CollaborationRuntime = Object.freeze({
    document: restored.runtime.document,
    collaboration: restored.runtime.collaboration,
  });
  return Object.freeze({ ok: true, runtime });
}

export function restoreCollaborationHistoryRuntime(
  input: unknown,
  options: CollaborationRestoreOptions,
): CollaborationHistoryRestoreResult {
  const restored = restoreProfileRuntime(input, options, "history");
  if (!restored.ok) return restored;
  return Object.freeze({
    ok: true,
    runtime: restored.runtime as CollaborationHistoryRuntime,
  });
}

export function restoreCollaborationTextRuntime(
  input: unknown,
  options: CollaborationRestoreOptions,
): CollaborationTextRestoreResult {
  const restored = restoreProfileRuntime(input, options, "text");
  if (!restored.ok) return restored;
  return Object.freeze({
    ok: true,
    runtime: restored.runtime as CollaborationTextRuntime,
  });
}

function restoreProfileRuntime(
  input: unknown,
  options: CollaborationRestoreOptions,
  profile: "history" | "text",
): RestoredProfileResult {
  const prepared = prepareCheckpoint(input);
  if (!prepared.ok) {
    return failure("invalid_checkpoint", prepared.reason);
  }
  const checkpoint = prepared.checkpoint;
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
  if (
    canonicalStringify(
      checkpoint.payload.epoch.ruleset as unknown as JSONValue,
    )
    !== canonicalStringify(options.ruleset as unknown as JSONValue)
  ) {
    return failure(
      "ruleset_mismatch",
      "restore ruleset does not match the checkpoint epoch",
    );
  }
  const verification = verifyCheckpointProof(checkpoint, options.verify);
  if (verification !== null) return verification;

  try {
    const restoreOptions = {
      actorId: options.actorId,
      epochId: checkpoint.payload.epoch.epochId,
      ruleset: options.ruleset,
      ...(checkpoint.payload.membership === null
        ? {}
        : { membership: checkpoint.payload.membership }),
      ...(options.accepts === undefined
        ? {}
        : { accepts: options.accepts }),
    };
    const restored = profile === "text"
      ? createRestoredTextRuntime(
          checkpoint.payload.base,
          restoreOptions,
          checkpoint.payload.epoch,
        )
      : createRestoredRuntime(
      checkpoint.payload.base,
          restoreOptions,
          checkpoint.payload.epoch,
        );
    const ingested = restored.collaboration.ingest({
      epoch: checkpoint.payload.epoch,
      changes: checkpoint.payload.changes,
    });
    if (!ingested.ok) {
      return failure(ingested.code, ingested.reason);
    }
    const runtime: RestoredProfileRuntime = restored;
    return Object.freeze({ ok: true, runtime });
  } catch (error) {
    return failure(
      "checkpoint_restore_failed",
      error instanceof Error ? error.message : "checkpoint restore failed",
    );
  }
}

function failure(
  code: string,
  reason: string,
): Extract<CollaborationRestoreResult, { readonly ok: false }> {
  return Object.freeze({ ok: false, code, reason });
}
