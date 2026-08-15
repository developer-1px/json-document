import {
  cloneJsonSerializable,
  cloneTrustedPlainJson,
} from "../json/index.js";
import type { JSONPatchOperation as AppliedPatchOperation } from "../patch/contract.js";
import {
  applyValidatedPatch,
  applyTrustedPatch,
} from "../patch/trusted.js";
import { parseArrayIndex } from "../pointer/array-index.js";
import { parsePointer } from "../pointer/core.js";
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

  const ownedValue = operations.length === 0
    ? freezeJSON(result.state as JSONValue)
    : ownJSON(result.state);
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
  const replayRequired = applied.some((operation) => (
    (operation.op === "add" || operation.op === "replace")
    && operation.value !== null
    && typeof operation.value === "object"
  ));
  const validated = replayRequired
    ? applyValidatedPatch(value, applied as ReadonlyArray<AppliedPatchOperation>)
    : prepared;
  const ownedValue = validated.result.ok
    ? freezeOwnedState(validated.state as JSONValue, applied)
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

let freezeInspections = 0;

// Locality tests import these from src. They are not on the public package surface.
export function resetOwnedPatchFreezeInspections(): void {
  freezeInspections = 0;
}

export function ownedPatchFreezeInspections(): number {
  return freezeInspections;
}

function freezeOwnedState(
  value: JSONValue,
  operations: ReadonlyArray<JSONPatchOperation>,
): JSONValue {
  if (freezeAlongOperations(value, operations)) return value;
  return freezeJSON(value);
}

function freezeAlongOperations(
  value: JSONValue,
  operations: ReadonlyArray<JSONPatchOperation>,
): boolean {
  const paths: string[][] = [];
  for (const operation of operations) {
    if (operation.op === "test") continue;
    if (
      operation.path === ""
      || (operation.op !== "add" && operation.op !== "replace" && operation.op !== "remove")
    ) {
      return false;
    }
    try {
      paths.push(parsePointer(operation.path));
    } catch {
      return false;
    }
  }
  for (const segments of paths) {
    if (!freezeAlongPath(value, segments)) return false;
  }
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    freezeInspections += 1;
    Object.freeze(value);
  }
  return true;
}

function freezeAlongPath(root: JSONValue, segments: ReadonlyArray<string>): boolean {
  const stack: object[] = [];
  let current: JSONValue = root;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return false;
    freezeInspections += 1;
    stack.push(current);
    if (Array.isArray(current)) {
      const index = parseArrayIndex(segment);
      if (index === null || index >= current.length) return false;
      current = current[index] as JSONValue;
    } else if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return false;
    } else {
      const next = (current as Record<string, JSONValue>)[segment];
      if (next === undefined) return false;
      current = next;
    }
  }
  freezeJSON(current);
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const container = stack[index]!;
    if (!Object.isFrozen(container)) Object.freeze(container);
  }
  return true;
}

function freezeJSON<T extends JSONValue>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  freezeInspections += 1;
  if (Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeJSON(child as JSONValue);
  Object.freeze(value);
  return value;
}

function freezeFailure(failure: JSONPatchFailure): JSONPatchFailure {
  return Object.freeze(failure);
}
