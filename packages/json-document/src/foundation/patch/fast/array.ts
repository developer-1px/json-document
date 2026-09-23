import { jsonSerializableError } from "../../json/serializable.js";
import { cloneTrustedPlainJson } from "../../json/trusted-clone.js";
import { appendSegment } from "../../pointer/core.js";
import { getValueAt, parseSafe } from "../container.js";
import { arrayLocation } from "../path.js";
import { replaceValueAtSegments } from "../replace-value.js";
import { validateOperationShape } from "../apply.js";
import type { FastPatchResult, JSONPatchOperation } from "../contract.js";

type ArrayItem =
  | { op: "add"; index: number; value: unknown }
  | { op: "remove"; index: number }
  | { op: "copy" | "move"; fromIndex: number; index: number };

/** Prepare addresses and canonical operations once, then copy the array once. */
export function applySameArrayStructuralPatch(
  state: unknown,
  operations: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted = false,
): FastPatchResult {
  const first = operations[0];
  if (first === undefined || validateOperationShape(first) !== null) return { handled: false };
  const location = arrayLocation(first.path);
  if (location === null) return { handled: false };
  const parent = location.parent;
  const parsed = parseSafe(parent);
  if (!("ok" in parsed)) return { handled: false };
  const current = getValueAt(state, parsed.segs);
  if (!current.ok || !Array.isArray(current.value)) return { handled: false };

  const items: ArrayItem[] = [];
  const applied: JSONPatchOperation[] = [];
  let length = current.value.length;
  for (let opIndex = 0; opIndex < operations.length; opIndex += 1) {
    if (!(opIndex in operations)) return { handled: false };
    const operation = operations[opIndex]!;
    if (
      validateOperationShape(operation) !== null
      || (operation.op !== "add" && operation.op !== "remove" && operation.op !== "copy" && operation.op !== "move")
    ) return { handled: false };
    const target = operation.path === first.path ? location : arrayLocation(operation.path);
    if (target === null || target.parent !== parent) return { handled: false };
    if (operation.op === "remove" && target.index === "-") return { handled: false };
    const lastIndex = length - (operation.op === "remove" || operation.op === "move" ? 1 : 0);
    const index = target.index === "-" ? lastIndex : target.index;
    if (index < 0 || index > lastIndex) return { handled: false };

    if (operation.op === "add") {
      if (!valuesTrusted && jsonSerializableError(operation.value) !== null) return { handled: false };
      items.push({ op: "add", index, value: operation.value });
      length += 1;
    } else if (operation.op === "remove") {
      items.push({ op: "remove", index });
      length -= 1;
    } else {
      const from = arrayLocation(operation.from);
      if (from === null || from.parent !== parent || from.index === "-" || from.index >= length) return { handled: false };
      items.push({ op: operation.op, index, fromIndex: from.index });
      if (operation.op === "copy") length += 1;
    }
    applied.push(target.index === "-" ? { ...operation, path: appendSegment(parent, index) } : operation);
  }

  const next = applyContiguousArrayAdd(current.value, items)
    ?? applyNonIncreasingArrayInsert(current.value, items)
    ?? applyAppendThenArrayRemove(current.value, items)
    ?? applySequentialArrayItems(current.value, items);
  const stateWithArray = replaceValueAtSegments(state, parsed.segs, 0, next);
  return stateWithArray === null
    ? { handled: false }
    : { handled: true, state: stateWithArray, applied };
}

function applyContiguousArrayAdd(
  current: unknown[],
  items: ReadonlyArray<ArrayItem>,
): unknown[] | null {
  const start = items[0]!.index;
  const values: unknown[] = [];
  for (const item of items) {
    if (item.op !== "add" || item.index !== start + values.length) return null;
    values.push(item.value);
  }
  if (start === 0) return values.concat(current);
  return start === current.length
    ? current.concat(values)
    : current.slice(0, start).concat(values, current.slice(start));
}

function applyNonIncreasingArrayInsert(
  current: unknown[],
  items: ReadonlyArray<ArrayItem>,
): unknown[] | null {
  let previousIndex = Number.POSITIVE_INFINITY;
  const values: unknown[] = [];
  for (const item of items) {
    if ((item.op !== "add" && item.op !== "copy") || item.index > previousIndex) return null;
    // A copy can use the original array only while preceding insertions have
    // not shifted its source. Otherwise the sequential executor resolves it.
    if (item.op === "copy" && (item.fromIndex >= previousIndex || item.fromIndex >= current.length)) return null;
    values.push(item.op === "add" ? item.value : cloneTrustedPlainJson(current[item.fromIndex]));
    previousIndex = item.index;
  }

  const next = new Array<unknown>(current.length + items.length);
  let read = 0;
  let write = 0;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    while (read < items[index]!.index) next[write++] = current[read++];
    next[write++] = values[index];
  }
  while (read < current.length) next[write++] = current[read++];
  return next;
}

function applyAppendThenArrayRemove(
  current: unknown[],
  items: ReadonlyArray<ArrayItem>,
): unknown[] | null {
  const values: unknown[] = [];
  const removedIndexes: number[] = [];
  let previousIndex = -1;
  let descending = false;
  for (const item of items) {
    if (item.op === "add" && removedIndexes.length === 0 && item.index === current.length + values.length) {
      values.push(item.value);
      continue;
    }
    if (item.op !== "remove") return null;
    if (removedIndexes.length === 1) descending = item.index < previousIndex;
    if (removedIndexes.length > 0 && (descending ? item.index >= previousIndex : item.index < previousIndex)) return null;
    const sourceIndex = item.index + (descending ? 0 : removedIndexes.length);
    if (sourceIndex >= current.length) return null;
    removedIndexes.push(sourceIndex);
    previousIndex = item.index;
  }
  if (descending) removedIndexes.reverse();

  const keepCount = current.length - removedIndexes.length;
  if (removedIndexes[0] === keepCount) {
    const prefix = current.slice(0, keepCount);
    return values.length === 0 ? prefix : prefix.concat(values);
  }
  const next = new Array<unknown>(keepCount + values.length);
  let removeIndex = 0;
  let write = 0;
  for (let index = 0; index < current.length; index += 1) {
    if (index === removedIndexes[removeIndex]) removeIndex += 1;
    else next[write++] = current[index];
  }
  for (const value of values) next[write++] = value;
  return next;
}

function applySequentialArrayItems(
  current: unknown[],
  items: ReadonlyArray<ArrayItem>,
): unknown[] {
  const next = current.slice();
  for (const item of items) {
    if (item.op === "remove") {
      next.splice(item.index, 1);
    } else if (item.op === "move") {
      if (item.fromIndex === item.index) continue;
      if (Math.abs(item.fromIndex - item.index) === 1) {
        const value = next[item.fromIndex];
        next[item.fromIndex] = next[item.index];
        next[item.index] = value;
      } else {
        const [value] = next.splice(item.fromIndex, 1);
        next.splice(item.index, 0, value);
      }
    } else {
      const value = item.op === "add" ? item.value : cloneTrustedPlainJson(next[item.fromIndex]);
      next.splice(item.index, 0, value);
    }
  }
  return next;
}
