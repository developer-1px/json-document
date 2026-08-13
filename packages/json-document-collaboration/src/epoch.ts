import type { JSONValue } from "@interactive-os/json-document";

import { canonicalStringify, fingerprintJSON } from "./digest.js";
import type {
  ChangeId,
  CollaborationChange,
  CollaborationEpoch,
  CollaborationEpochParent,
  CollaborationIngestResult,
  CollaborationMembership,
  CollaborationRuntimeOptions,
} from "./types.js";

export function createEpoch(
  initial: JSONValue,
  options: CollaborationRuntimeOptions,
  parent: CollaborationEpochParent | null = null,
): CollaborationEpoch {
  const membership = canonicalMembership(options.membership);
  return Object.freeze({
    protocolVersion: 3,
    epochId: options.epochId,
    ruleset: Object.freeze({
      id: options.ruleset.id,
      digest: options.ruleset.digest,
    }),
    acceptance: options.validate === undefined
      ? "none"
      : "custom",
    baseDigest: fingerprintJSON(initial),
    membershipDigest: fingerprintJSON(
      membership as unknown as JSONValue,
    ),
    parent: parent === null
      ? null
      : Object.freeze({
          epochId: parent.epochId,
          checkpointDigest: parent.checkpointDigest,
        }),
  });
}

export function canonicalMembership(
  input: CollaborationMembership | undefined,
): CollaborationMembership | null {
  if (input === undefined) return null;
  if (input.version !== 1 || !Array.isArray(input.members)) {
    throw new TypeError("membership must be a version 1 member list");
  }
  const members = input.members.map((member) => {
    if (
      typeof member !== "object"
      || member === null
      || !isNonEmptyString(member.actorId)
      || (
        member.credentialId !== undefined
        && !isNonEmptyString(member.credentialId)
      )
    ) {
      throw new TypeError(
        "membership entries require actorId and an optional credentialId",
      );
    }
    return Object.freeze({
      actorId: member.actorId,
      ...(member.credentialId === undefined
        ? {}
        : { credentialId: member.credentialId }),
    });
  }).sort((left, right) => (
    left.actorId < right.actorId ? -1 : left.actorId > right.actorId ? 1 : 0
  ));
  if (members.length === 0) {
    throw new TypeError("membership must admit at least one actor");
  }
  for (let index = 1; index < members.length; index += 1) {
    if (members[index - 1]?.actorId === members[index]?.actorId) {
      throw new TypeError("membership actorId values must be unique");
    }
  }
  return Object.freeze({
    version: 1,
    members: Object.freeze(members),
  });
}

export function membershipAllows(
  membership: CollaborationMembership | null,
  actorId: string,
): boolean {
  return (
    membership === null
    || membership.members.some((member) => member.actorId === actorId)
  );
}

export function validateOptions(options: CollaborationRuntimeOptions): void {
  if (
    typeof options !== "object"
    || options === null
    || typeof options.actorId !== "string"
    || options.actorId.length === 0
  ) {
    throw new TypeError("actorId must be a non-empty string");
  }
  if (typeof options.epochId !== "string" || options.epochId.length === 0) {
    throw new TypeError("epochId must be a non-empty string");
  }
  if (
    typeof options.ruleset !== "object"
    || options.ruleset === null
    || typeof options.ruleset.id !== "string"
    || options.ruleset.id.length === 0
    || typeof options.ruleset.digest !== "string"
    || options.ruleset.digest.length === 0
  ) {
    throw new TypeError("ruleset id and digest must be non-empty strings");
  }
  canonicalMembership(options.membership);
}

export function checkEpoch(
  expected: CollaborationEpoch,
  actual: CollaborationEpoch,
): Extract<CollaborationIngestResult, { readonly ok: false }> | null {
  if (actual.epochId !== expected.epochId) {
    return {
      ok: false,
      code: "epoch_mismatch",
      reason: "bundle epochId does not match this document",
    };
  }
  if (
    actual.ruleset.id !== expected.ruleset.id
    || actual.ruleset.digest !== expected.ruleset.digest
  ) {
    return {
      ok: false,
      code: "ruleset_mismatch",
      reason: "bundle ruleset does not match this document epoch",
    };
  }
  if (actual.acceptance !== expected.acceptance) {
    return {
      ok: false,
      code: "ruleset_mismatch",
      reason: "bundle acceptance mode does not match this document epoch",
    };
  }
  if (actual.baseDigest !== expected.baseDigest) {
    return {
      ok: false,
      code: "checkpoint_mismatch",
      reason: "bundle checkpoint does not match this document epoch",
    };
  }
  if (actual.membershipDigest !== expected.membershipDigest) {
    return {
      ok: false,
      code: "membership_mismatch",
      reason: "bundle membership does not match this document epoch",
    };
  }
  if (
    canonicalStringify(actual.parent as unknown as JSONValue)
    !== canonicalStringify(expected.parent as unknown as JSONValue)
  ) {
    return {
      ok: false,
      code: "epoch_mismatch",
      reason: "bundle epoch parent does not match this document epoch",
    };
  }
  return null;
}

export function unauthorizedChange(
  changes: ReadonlyArray<CollaborationChange>,
  membership: CollaborationMembership | null,
): ChangeId | null {
  if (membership === null) return null;
  for (const change of changes) {
    if (!membershipAllows(membership, change.changeId.actorId)) {
      return change.changeId;
    }
    for (const dependency of change.deps) {
      if (!membershipAllows(membership, dependency.actorId)) {
        return change.changeId;
      }
    }
    for (const operation of change.ops) {
      const referenced = operation.kind === "undo-change"
        ? operation.target
        : operation.kind === "redo-change"
          ? operation.undo
          : null;
      if (
        referenced !== null
        && !membershipAllows(membership, referenced.actorId)
      ) {
        return change.changeId;
      }
    }
  }
  return null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
