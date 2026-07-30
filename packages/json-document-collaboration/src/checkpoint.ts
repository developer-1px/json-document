import {
  applyPatch,
  type JSONPatchValidationResult,
  type JSONValue,
} from "@interactive-os/json-document";

import {
  canonicalMembership,
  canonicalStringify,
  compareChanges,
  fingerprintJSON,
  prepareBundle,
} from "./change.js";
import type {
  CollaborationCheckpoint,
  CollaborationChange,
  CollaborationEpoch,
  CollaborationMembership,
} from "./types.js";

type PreparedCheckpoint =
  | { readonly ok: true; readonly checkpoint: CollaborationCheckpoint }
  | { readonly ok: false; readonly reason: string };

type CheckpointVerifier = (
  checkpoint: CollaborationCheckpoint,
) => JSONPatchValidationResult;

type CheckpointVerificationFailure = {
  readonly ok: false;
  readonly code: string;
  readonly reason: string;
};

export function createCheckpoint(
  base: JSONValue,
  membership: CollaborationMembership | null,
  epoch: CollaborationEpoch,
  changes: ReadonlyArray<CollaborationChange>,
): CollaborationCheckpoint {
  const payload = Object.freeze({
    kind: "json-document-collaboration/checkpoint" as const,
    version: 1 as const,
    epoch,
    base,
    membership,
    changes: Object.freeze([...changes]),
  });
  return Object.freeze({
    payload,
    integrity: Object.freeze({
      algorithm: "sha-256" as const,
      digest: fingerprintJSON(payload as unknown as JSONValue),
    }),
  });
}

export function prepareCheckpoint(input: unknown): PreparedCheckpoint {
  if (!isRecord(input) || !isRecord(input.payload)) {
    return invalid("checkpoint and payload must be objects");
  }
  if (!hasOnlyKeys(input, ["payload", "integrity"])) {
    return invalid("checkpoint contains unknown fields");
  }
  const rawPayload = applyPatch(input.payload, []);
  if (!rawPayload.ok) {
    return invalid(
      rawPayload.reason ?? "checkpoint payload must contain only JSON values",
    );
  }
  if (
    input.payload.kind !== "json-document-collaboration/checkpoint"
    || input.payload.version !== 1
  ) {
    return invalid("checkpoint payload kind or version is unsupported");
  }

  const base = applyPatch(input.payload.base, []);
  if (!base.ok) {
    return invalid(base.reason ?? "checkpoint base must be JSON");
  }
  const membership = prepareMembership(input.payload.membership);
  if (!membership.ok) return membership;
  const bundle = prepareBundle({
    epoch: input.payload.epoch,
    changes: input.payload.changes,
  });
  if (!bundle.ok) return bundle;
  for (let index = 1; index < bundle.bundle.changes.length; index += 1) {
    const previous = bundle.bundle.changes[index - 1];
    const current = bundle.bundle.changes[index];
    if (
      previous === undefined
      || current === undefined
      || compareChanges(previous, current) >= 0
    ) {
      return invalid(
        "checkpoint changes must be strictly sorted with unique changeIds",
      );
    }
  }
  if (bundle.bundle.epoch.baseDigest !== fingerprintJSON(base.value)) {
    return invalid("checkpoint base does not match epoch baseDigest");
  }
  if (
    bundle.bundle.epoch.membershipDigest
    !== fingerprintJSON(membership.membership as unknown as JSONValue)
  ) {
    return invalid(
      "checkpoint membership does not match epoch membershipDigest",
    );
  }

  const payload = Object.freeze({
    kind: "json-document-collaboration/checkpoint" as const,
    version: 1 as const,
    epoch: bundle.bundle.epoch,
    base: base.value,
    membership: membership.membership,
    changes: bundle.bundle.changes,
  });
  if (
    canonicalStringify(rawPayload.value)
    !== canonicalStringify(payload as unknown as JSONValue)
  ) {
    return invalid("checkpoint payload must use the canonical wire shape");
  }
  if (!isRecord(input.integrity) || input.integrity.algorithm !== "sha-256") {
    return invalid("checkpoint integrity algorithm must be sha-256");
  }
  if (
    !hasOnlyKeys(input.integrity, [
      "algorithm",
      "digest",
      "proof",
      "keyId",
    ])
  ) {
    return invalid("checkpoint integrity contains unknown fields");
  }
  const expectedDigest = fingerprintJSON(payload as unknown as JSONValue);
  if (input.integrity.digest !== expectedDigest) {
    return invalid("checkpoint integrity digest mismatch");
  }
  if (
    input.integrity.proof !== undefined
    && typeof input.integrity.proof !== "string"
  ) {
    return invalid("checkpoint integrity proof must be a string");
  }
  if (
    input.integrity.keyId !== undefined
    && typeof input.integrity.keyId !== "string"
  ) {
    return invalid("checkpoint integrity keyId must be a string");
  }

  return {
    ok: true,
    checkpoint: Object.freeze({
      payload,
      integrity: Object.freeze({
        algorithm: "sha-256",
        digest: expectedDigest,
        ...(input.integrity.proof === undefined
          ? {}
          : { proof: input.integrity.proof }),
        ...(input.integrity.keyId === undefined
          ? {}
          : { keyId: input.integrity.keyId }),
      }),
    }),
  };
}

export function verifyCheckpointProof(
  checkpoint: CollaborationCheckpoint,
  verify: CheckpointVerifier | undefined,
): CheckpointVerificationFailure | null {
  if (verify === undefined) return null;
  try {
    const result = verify(checkpoint);
    if (result?.ok === true) return null;
    if (result?.ok === false && typeof result.code === "string") {
      return verificationFailure(
        result.code,
        result.reason ?? "checkpoint proof verification failed",
      );
    }
    return verificationFailure(
      "checkpoint_verification_failed",
      "checkpoint verifier must return a validation result",
    );
  } catch (error) {
    return verificationFailure(
      "checkpoint_verification_failed",
      error instanceof Error
        ? error.message
        : "checkpoint proof verification failed",
    );
  }
}

function prepareMembership(
  input: unknown,
):
  | {
      readonly ok: true;
      readonly membership: CollaborationMembership | null;
    }
  | { readonly ok: false; readonly reason: string } {
  if (input === null) return { ok: true, membership: null };
  const validated = applyPatch(input, []);
  if (!validated.ok) {
    return invalid(
      validated.reason ?? "checkpoint membership must contain only JSON values",
    );
  }
  if (
    !isRecord(validated.value)
    || validated.value.version !== 1
    || !Array.isArray(validated.value.members)
  ) {
    return invalid("checkpoint membership must be null or a version 1 list");
  }
  try {
    const membership = canonicalMembership(
      validated.value as unknown as CollaborationMembership,
    );
    if (
      canonicalStringify(validated.value)
      !== canonicalStringify(membership as unknown as JSONValue)
    ) {
      return invalid("checkpoint membership must be canonical");
    }
    return { ok: true, membership };
  } catch (error) {
    return invalid(
      error instanceof Error ? error.message : "checkpoint membership is invalid",
    );
  }
}

function invalid(reason: string): { readonly ok: false; readonly reason: string } {
  return { ok: false, reason };
}

function verificationFailure(
  code: string,
  reason: string,
): CheckpointVerificationFailure {
  return Object.freeze({ ok: false, code, reason });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: ReadonlyArray<string>,
): boolean {
  const keys = new Set(allowed);
  return Object.keys(value).every((key) => keys.has(key));
}
