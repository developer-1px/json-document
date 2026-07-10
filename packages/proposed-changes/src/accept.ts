import type {
  JSONChangeMetadata,
  JSONDocument,
  JSONPatchOperation,
  JSONResult,
} from "@interactive-os/json-document";

import {
  cloneJson,
  copyChange,
  copyOperations,
} from "./copy.js";
import {
  capabilityError,
  notFound,
  notOpen,
  patchError,
  proposedChangeError,
} from "./errors.js";
import type {
  ProposedChange,
  ProposedChangeError,
  ProposedChangeResult,
} from "./types.js";

type GuardedPatchResult =
  | { ok: true; result: Extract<JSONResult, { ok: true }> }
  | ProposedChangeError;

export function canAcceptChange<TDocument>(
  doc: JSONDocument<TDocument>,
  changes: ReadonlyMap<string, ProposedChange>,
  id: string,
): ProposedChangeResult {
  const change = changes.get(id);
  if (change === undefined) return notFound(id);
  if (change.status !== "open") return notOpen(id, change.status);

  const stale = staleGuard(doc, change);
  if (stale !== null) return stale;

  const capability = doc.canPatch(change.operations);
  const staleAfterCapability = staleGuard(doc, change);
  if (staleAfterCapability !== null) return staleAfterCapability;
  if (!capability.ok) return capabilityError(id, capability);

  return { ok: true, change: copyChange(change) };
}

export function canCloseChange(
  changes: ReadonlyMap<string, ProposedChange>,
  id: string,
): ProposedChangeResult {
  const change = changes.get(id);
  if (change === undefined) return notFound(id);
  if (change.status !== "open") return notOpen(id, change.status, "reject");
  return { ok: true, change: copyChange(change) };
}

export function applyGuardedChange<TDocument>(
  doc: JSONDocument<TDocument>,
  change: ProposedChange,
  metadata?: JSONChangeMetadata,
): GuardedPatchResult {
  const operations: JSONPatchOperation[] = change.guards.map((guard) => ({
    op: "test",
    path: guard.path,
    value: cloneJson(guard.value),
  }));
  operations.push(...copyOperations(change.operations));

  const result = doc.patch(operations, metadata);
  if (result.ok) return { ok: true, result };
  return failedGuard(change, result) ?? patchError(change.id, result);
}

function failedGuard(
  change: ProposedChange,
  result: Extract<JSONResult, { ok: false }>,
): ProposedChangeError | null {
  if (
    (result.code !== "test_failed" && result.code !== "path_not_found")
    || result.pointer === undefined
  ) {
    return null;
  }
  const guard = change.guards.find(({ path }) => path === result.pointer);
  if (guard === undefined) return null;

  const missing = result.code === "path_not_found";
  return proposedChangeError(
    "stale_change",
    missing
      ? `proposed change guard path no longer exists: ${guard.path}`
      : `proposed change guard changed: ${guard.path}`,
    { id: change.id, pointer: guard.path },
  );
}

function staleGuard<TDocument>(
  doc: JSONDocument<TDocument>,
  change: ProposedChange,
): ProposedChangeError | null {
  for (const guard of change.guards) {
    const read = doc.at(guard.path);
    if (!read.ok) {
      return proposedChangeError("stale_change", `proposed change guard path no longer exists: ${guard.path}`, {
        id: change.id,
        pointer: guard.path,
      });
    }
    if (!jsonEqual(read.value, guard.value)) {
      return proposedChangeError("stale_change", `proposed change guard changed: ${guard.path}`, {
        id: change.id,
        pointer: guard.path,
      });
    }
  }
  return null;
}

function jsonEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (
    left === null
    || right === null
    || typeof left !== "object"
    || typeof right !== "object"
    || Array.isArray(left) !== Array.isArray(right)
  ) {
    return false;
  }
  if (Array.isArray(left)) {
    if (left.length !== (right as unknown[]).length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (!jsonEqual(left[index], (right as unknown[])[index])) return false;
    }
    return true;
  }

  const leftObject = left as Record<string, unknown>;
  const rightObject = right as Record<string, unknown>;
  const keys = Object.keys(leftObject);
  if (keys.length !== Object.keys(rightObject).length) return false;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(rightObject, key)) return false;
    if (!jsonEqual(leftObject[key], rightObject[key])) return false;
  }
  return true;
}
