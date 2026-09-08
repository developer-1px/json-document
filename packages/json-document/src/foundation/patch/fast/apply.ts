import { jsonSerializableError } from "../../json/serializable.js";
import { copyRootObject, objectHasOwn } from "../object.js";
import { validateOperationShape } from "../apply.js";
import { applySequentialReplacePatch } from "../sequential-replace.js";
import { applySameArrayStructuralPatch } from "./array.js";
import type { FastPatchResult, JSONPatchOperation } from "../contract.js";

type FastPatchSuccess = Extract<FastPatchResult, { handled: true }>;

type FastPatchStrategy = (
  state: unknown,
  ops: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted: boolean,
) => FastPatchResult;

const strategies: readonly FastPatchStrategy[] = [
  applyRootObjectPatch,
  applySequentialReplacePatch,
  applySameArrayStructuralPatch,
];

export function applyFastPatchStrategies(
  state: unknown,
  ops: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted: boolean,
): FastPatchSuccess | null {
  for (const strategy of strategies) {
    const candidate = strategy(state, ops, valuesTrusted);
    if (candidate.handled) return candidate;
  }
  return null;
}

function applyRootObjectPatch(
  state: unknown,
  ops: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted: boolean,
): FastPatchResult {
  const first = ops[0];
  if (
    ops.length < 2
    || state === null
    || typeof state !== "object"
    || Array.isArray(state)
    || (first?.op !== "add" && first?.op !== "remove")
  ) return { handled: false };
  const firstKey = flatRootObjectKey(first);
  if (firstKey === null) return { handled: false };

  const source = state as Record<string, unknown>;
  const next = first.op === "add" ? copyRootObject(source) : null;
  const keys = next === null ? Object.keys(source) : [];
  let matchesKeyOrder = ops.length === keys.length;
  let matchesReverseSuffix = ops.length <= keys.length;
  let removedKeys: Set<string> | null = null;
  for (let index = 0; index < ops.length; index += 1) {
    if (!(index in ops)) return { handled: false };
    const op = ops[index]!;
    const key = index === 0 ? firstKey : flatRootObjectKey(op);
    if (key === null || op.op !== first.op) return { handled: false };

    if (op.op === "add" && next !== null) {
      if (!valuesTrusted && jsonSerializableError(op.value) !== null) return { handled: false };
      if (key === "__proto__") {
        Object.defineProperty(next, key, { value: op.value, enumerable: true, configurable: true, writable: true });
      } else {
        next[key] = op.value;
      }
    } else {
      matchesKeyOrder &&= key === keys[index];
      matchesReverseSuffix &&= key === keys[keys.length - index - 1];
      // Ordered removals need neither membership checks nor a deletion set.
      if (matchesKeyOrder || matchesReverseSuffix) continue;
      removedKeys ??= new Set(ops.slice(0, index).map((seen) => seen.path.slice(1)));
      if (!objectHasOwn.call(source, key) || removedKeys.has(key)) return { handled: false };
      removedKeys.add(key);
    }
  }

  const applied = ops.slice();
  if (next !== null) return { handled: true, state: next, applied };

  const keepCount = keys.length - ops.length;
  if (removedKeys === null || keys.slice(keepCount).every((key) => removedKeys.has(key))) {
    return { handled: true, state: copyRootObject(source, keys.slice(0, keepCount)), applied };
  }
  if (ops.length * 2 < keys.length) {
    const retained = copyRootObject(source, keys);
    for (const key of removedKeys) delete retained[key];
    return { handled: true, state: retained, applied };
  }
  return {
    handled: true,
    state: copyRootObject(source, keys.filter((key) => !removedKeys.has(key))),
    applied,
  };
}

function flatRootObjectKey(op: JSONPatchOperation): string | null {
  if (
    validateOperationShape(op) !== null
    || op.path[0] !== "/"
    || op.path.includes("~")
    || op.path.indexOf("/", 1) !== -1
  ) return null;
  return op.path.slice(1);
}
