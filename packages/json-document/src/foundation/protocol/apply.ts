import {
  cloneJsonSerializable,
  cloneTrustedPlainJson,
} from "../json/index.js";
import type { JSONPatchOperation as AppliedPatchOperation } from "../patch/contract.js";
import {
  applyValidatedPatch,
  applyTrustedPatch,
} from "../patch/trusted.js";
import type {
  JSONAppliedChange,
  JSONPatchFailure,
  JSONPatchOperation,
  JSONPatchResult,
  JSONValue,
} from "./contract.js";

export function applyProtocolPatch(
  value: unknown,
  operations: ReadonlyArray<JSONPatchOperation>,
): JSONPatchResult {
  const initial = cloneJsonSerializable(value);
  if (!initial.ok) {
    return freezeFailure({
      ok: false,
      code: "not_serializable",
      reason: initial.reason,
    });
  }

  // Do not pre-validate or clone the operation array. Applying it in order
  // preserves RFC 6902 failure precedence when a later operation is malformed.
  const result = applyTrustedPatch(
    initial.value as JSONValue,
    operations as ReadonlyArray<AppliedPatchOperation>,
  );
  if (!result.result.ok) {
    return freezeFailure({
      ok: false,
      code: result.result.code,
      ...(result.result.reason === undefined
        ? {}
        : { reason: result.result.reason }),
      ...(result.result.pointer === undefined
        ? {}
        : { pointer: result.result.pointer }),
    });
  }

  const ownedValue = ownJSON(result.state);
  const applied = result.applied.map(ownAppliedOperation);
  Object.freeze(applied);
  const change: JSONAppliedChange = Object.freeze({ applied });
  return Object.freeze({
    ok: true,
    value: ownedValue,
    change,
  });
}

export function applyOwnedProtocolPatch(
  value: JSONValue,
  operations: ReadonlyArray<JSONPatchOperation>,
): JSONPatchResult {
  // The first pass is authoritative and applies caller operations in RFC 6902
  // order, so an earlier patch failure still wins over malformed data in a
  // later operation.
  const prepared = applyTrustedPatch(
    value,
    operations as ReadonlyArray<AppliedPatchOperation>,
  );
  if (!prepared.result.ok) {
    return freezeFailure({
      ok: false,
      code: prepared.result.code,
      ...(prepared.result.reason === undefined
        ? {}
        : { reason: prepared.result.reason }),
      ...(prepared.result.pointer === undefined
        ? {}
        : { pointer: prepared.result.pointer }),
    });
  }

  // Canonical operations own their payloads. Replaying only these validated
  // operations prevents caller-owned values from entering JSON Document state.
  const applied = prepared.applied.map(ownAppliedOperation);
  Object.freeze(applied);
  const validated = applyValidatedPatch(
    value,
    applied as ReadonlyArray<AppliedPatchOperation>,
  );
  const ownedValue = validated.result.ok
    ? freezeJSON(validated.state as JSONValue)
    // The validated replay should be equivalent by construction. Keep a safe
    // isolation fallback if an internal optimization ever disagrees.
    : ownJSON(prepared.state as JSONValue);
  const change: JSONAppliedChange = Object.freeze({ applied });
  return Object.freeze({
    ok: true,
    value: ownedValue,
    change,
  });
}

function ownAppliedOperation(
  operation: AppliedPatchOperation,
): JSONPatchOperation {
  switch (operation.op) {
    case "add":
    case "replace":
    case "test":
      return Object.freeze({
        op: operation.op,
        path: operation.path,
        value: ownJSON(operation.value as JSONValue),
      });
    case "remove":
      return Object.freeze({
        op: "remove",
        path: operation.path,
      });
    case "move":
    case "copy":
      return Object.freeze({
        op: operation.op,
        from: operation.from,
        path: operation.path,
      });
  }
}

function ownJSON<T extends JSONValue>(value: T): T {
  return freezeJSON(cloneTrustedPlainJson(value));
}

function freezeJSON<T extends JSONValue>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freezeJSON(child);
  Object.freeze(value);
  return value;
}

function freezeFailure(failure: JSONPatchFailure): JSONPatchFailure {
  return Object.freeze(failure);
}
