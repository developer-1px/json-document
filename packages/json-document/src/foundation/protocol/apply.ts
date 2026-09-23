import {
  cloneJsonSerializable,
  cloneTrustedPlainJson,
} from "../json/index.js";
import type { JSONPatchOperation as AppliedPatchOperation } from "../patch/contract.js";
import { applyTrustedPatch } from "../patch/trusted.js";
import { parseArrayIndex } from "../pointer/array-index.js";
import { parentPointer, parsePointer, readAt } from "../pointer/core.js";
import { getSharedArrayOverlay } from "../json/shared-array.js";
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
    return freezeFailure(result.result);
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
    return freezeFailure(prepared.result);
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
    ? applyTrustedPatch(value, applied as ReadonlyArray<AppliedPatchOperation>, { valuesTrusted: true })
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
  const containers = new Set<object>();
  const parent = parentPointer(operations.find((operation) => operation.op !== "test")?.path ?? "");
  const sameParent = operations.every((operation) => operation.op === "test" || parentPointer(operation.path) === parent);
  for (const operation of operations) {
    if (operation.op === "test") continue;
    if (
      operation.path === ""
      || (operation.op !== "add" && operation.op !== "replace" && operation.op !== "remove")
    ) {
      return false;
    }
    let segments: string[];
    try {
      segments = parsePointer(operation.path);
    } catch {
      return false;
    }
    // Array insertion/removal may shift another operation's final address.
    // Sibling-only writes are safe: every inserted/replaced payload is owned.
    if (operation.op !== "replace" && !sameParent) {
      const target = readAt(value, segments.slice(0, -1));
      if (target.ok && Array.isArray(target.value)) return false;
    }
    if (!freezeAlongPath(value, segments, containers)) return false;
  }
  if (value !== null && typeof value === "object") containers.add(value);
  // Freeze each shared ancestor once, after all paths succeed. A fallback must
  // never mistake a partially frozen ancestor for a fully frozen subtree.
  for (const container of containers) {
    freezeInspections += 1;
    if (!getSharedArrayOverlay(container) && !Object.isFrozen(container)) Object.freeze(container);
  }
  return true;
}

function freezeAlongPath(root: JSONValue, segments: ReadonlyArray<string>, containers: Set<object>): boolean {
  let current: JSONValue = root;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return false;
    containers.add(current);
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
  return true;
}

function freezeJSON<T extends JSONValue>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  freezeInspections += 1;
  const overlay = getSharedArrayOverlay(value);
  if (overlay !== undefined) {
    freezeJSON(overlay.base as JSONValue);
    for (const child of overlay.replacements.values()) freezeJSON(child as JSONValue);
    return value;
  }
  if (Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeJSON(child as JSONValue);
  Object.freeze(value);
  return value;
}

function freezeFailure(failure: JSONPatchFailure): JSONPatchFailure {
  return Object.freeze(failure);
}
