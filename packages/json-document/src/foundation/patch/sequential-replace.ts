import { jsonSerializableError } from "../json/serializable.js";
import { replaceArrayIndex } from "../json/shared-array.js";
import { parseArrayIndex } from "../pointer/array-index.js";
import { validateOperationShape } from "./apply.js";
import { parseSafe } from "./container.js";
import type { FastPatchResult, JSONPatchOperation } from "./contract.js";
import { objectHasOwn } from "./object.js";

type ReplaceOperation = Extract<JSONPatchOperation, { op: "replace" }>;

/**
 * Applies a multi-operation, non-root replace batch through one private COW
 * draft. Unsupported or invalid batches decline so the reference executor
 * remains the owner of observable error details.
 */
export function applySequentialReplacePatch(
  state: unknown,
  operations: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted = false,
): FastPatchResult {
  if (operations.length < 2) return { handled: false };

  const applied = new Array<ReplaceOperation>(operations.length);
  const draftContainers = new WeakSet<object>();
  let draft = state;
  for (let index = 0; index < operations.length; index += 1) {
    if (!(index in operations)) return { handled: false };
    const operation = operations[index]!;
    if (
      validateOperationShape(operation) !== null
      || operation.op !== "replace"
      || operation.path[0] !== "/"
    ) {
      return { handled: false };
    }
    if (!valuesTrusted && jsonSerializableError(operation.value) !== null) return { handled: false };
    const parsed = parseSafe(operation.path);
    if (!("ok" in parsed)) return { handled: false };
    const replaced = replaceDraftValue(
      draft,
      parsed.segs,
      operation,
      draftContainers,
    );
    if (replaced === null) return { handled: false };
    draft = replaced;
    applied[index] = operation;
  }

  return { handled: true, state: draft, applied };
}

function replaceDraftValue(
  state: unknown,
  segments: ReadonlyArray<string>,
  operation: ReplaceOperation,
  draftContainers: WeakSet<object>,
): unknown | null {
  const parents: Array<{ container: DraftContainer; key: number | string; value: unknown }> = [];
  let current = state;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return null;
    const container = current as DraftContainer;
    const child = readDraftChild(container, segment);
    if (!child.ok) return null;
    parents.push({ container, key: child.key, value: child.value });
    current = child.value;
  }

  let next = operation.value;
  for (let index = parents.length - 1; index >= 0; index -= 1) {
    const { container, key, value } = parents[index]!;
    if (value === next) {
      next = container;
    } else if (Array.isArray(container)) {
      next = replaceArrayIndex(container, key as number, next);
    } else {
      const draft = draftContainers.has(container) ? container : { ...container };
      draftContainers.add(draft);
      Object.defineProperty(draft, key, {
        value: next,
        enumerable: true,
        configurable: true,
        writable: true,
      });
      next = draft;
    }
  }
  return next;
}

type DraftContainer = unknown[] | Record<string, unknown>;

function readDraftChild(
  container: DraftContainer,
  segment: string,
): { ok: true; key: number | string; value: unknown } | { ok: false } {
  if (Array.isArray(container)) {
    const index = parseArrayIndex(segment);
    return index === null || index >= container.length
      ? { ok: false }
      : { ok: true, key: index, value: container[index] };
  }
  if (!objectHasOwn.call(container, segment)) return { ok: false };
  return { ok: true, key: segment, value: container[segment] };
}
