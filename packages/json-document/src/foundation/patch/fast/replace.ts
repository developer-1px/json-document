import { jsonSerializableError } from "../../json/serializable.js";
import type { Pointer } from "../../pointer/index.js";
import { getValueAt, parseSafe } from "../container.js";
import { objectHasOwn } from "../object.js";
import {
  arrayRemoveLocation,
  arrayFieldText,
  indexDirection,
  numericSegment,
  parseArrayFieldPath,
  parseFirstArrayNestedPath,
  parseKnownArrayNestedIndex,
  parseKnownArrayFieldIndex,
} from "../path.js";
import { replaceValueAtSegments } from "../replaceValue.js";
import { validateOperationShape } from "../apply.js";
import type { FastPatchResult, JSONPatchOperation } from "../contract.js";
import type { ArrayFieldPath, ArrayFieldText } from "../path.js";

interface ReplaceTree {
  value?: unknown;
  children: Map<string, ReplaceTree>;
}

export function applySameArrayFieldReplacePatch(
  state: unknown,
  ops: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted = false,
): FastPatchResult {
  if (ops.length < 2) return { handled: false };

  let arrayPath: Pointer | null = null;
  let arraySegments: string[] | null = null;
  let field: string | null = null;
  let fieldText: ArrayFieldText | null = null;
  let arrayValue: unknown[] | null = null;
  const updateIndexes = new Array<number>(ops.length);
  const updateValues = new Array<unknown>(ops.length);
  const applied = new Array<JSONPatchOperation>(ops.length);
  let previousUpdateIndex: number | null = null;
  let monotonicDirection: -1 | 0 | 1 = 0;
  let hasRepeatedOrNonMonotonicIndex = false;

  for (let opIndex = 0; opIndex < ops.length; opIndex += 1) {
    if (!(opIndex in ops)) return { handled: false };
    const op = ops[opIndex]!;
    if (validateOperationShape(op) !== null || op.op !== "replace" || op.path === "") return { handled: false };
    const knownIndex = fieldText === null ? null : parseKnownArrayFieldIndex(op.path, fieldText);
    let location: ArrayFieldPath | null;
    if (knownIndex === null) {
      location = parseArrayFieldPath(op.path);
    } else {
      if (arrayPath === null || field === null) return { handled: false };
      location = { arrayPath, index: knownIndex, key: field };
    }
    if (location === null) return { handled: false };
    if (field === null) {
      field = location.key;
      fieldText = arrayFieldText(op.path);
    } else if (field !== location.key) return { handled: false };

    if (arrayValue === null) {
      arrayPath = location.arrayPath;
      const parsedArray = parseSafe(arrayPath);
      if (!("ok" in parsedArray)) return { handled: false };
      arraySegments = parsedArray.segs;
      const current = getValueAt(state, arraySegments);
      if (!current.ok || !Array.isArray(current.value)) return { handled: false };
      arrayValue = current.value;
    } else if (arrayPath !== location.arrayPath) {
      return { handled: false };
    }

    if (!valuesTrusted && jsonSerializableError(op.value) !== null) return { handled: false };

    if (arrayValue === null || location.index < 0 || location.index >= arrayValue.length) return { handled: false };
    const row = arrayValue[location.index];
    if (row === null || typeof row !== "object" || Array.isArray(row)) return { handled: false };
    if (!objectHasOwn.call(row, location.key)) return { handled: false };
    if (previousUpdateIndex !== null) {
      const direction = indexDirection(previousUpdateIndex, location.index);
      if (direction === 0) {
        hasRepeatedOrNonMonotonicIndex = true;
      } else if (monotonicDirection === 0) {
        monotonicDirection = direction;
      } else if (direction !== monotonicDirection) {
        hasRepeatedOrNonMonotonicIndex = true;
      }
    }
    previousUpdateIndex = location.index;
    updateIndexes[opIndex] = location.index;
    updateValues[opIndex] = op.value;
    applied[opIndex] = op;
  }

  if (arraySegments === null || field === null || arrayValue === null) return { handled: false };
  const next = arrayValue.slice();
  if (hasRepeatedOrNonMonotonicIndex) {
    const replacedRows = new Set<number>();
    for (let index = ops.length - 1; index >= 0; index -= 1) {
      const rowIndex = updateIndexes[index]!;
      if (replacedRows.has(rowIndex)) continue;
      replacedRows.add(rowIndex);
      replaceRowField(next, arrayValue, rowIndex, field, updateValues[index]);
    }
    const stateWithArray = replaceValueAtSegments(state, arraySegments, 0, next);
    return stateWithArray === null
      ? { handled: false }
      : { handled: true, state: stateWithArray, applied };
  }
  for (let index = 0; index < ops.length; index += 1) {
    replaceRowField(next, arrayValue, updateIndexes[index]!, field, updateValues[index]);
  }

  const stateWithArray = replaceValueAtSegments(state, arraySegments, 0, next);
  return stateWithArray === null
    ? { handled: false }
    : { handled: true, state: stateWithArray, applied };
}

function replaceRowField(
  next: unknown[],
  source: unknown[],
  rowIndex: number,
  field: string,
  value: unknown,
): void {
  const row = source[rowIndex] as Record<string, unknown>;
  const replaced = { ...row };
  if (field === "__proto__") {
    Object.defineProperty(replaced, field, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else {
    replaced[field] = value;
  }
  next[rowIndex] = replaced;
}

export function applySameArrayNestedReplacePatch(
  state: unknown,
  ops: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted = false,
): FastPatchResult {
  if (ops.length < 2) return { handled: false };

  let arrayPath: Pointer | null = null;
  let arraySegments: string[] | null = null;
  let prefixText: string | null = null;
  let suffixText: string | null = null;
  let suffixSegments: string[] | null = null;
  let arrayValue: unknown[] | null = null;
  const updateIndexes = new Array<number>(ops.length);
  const updateValues = new Array<unknown>(ops.length);
  const applied = new Array<JSONPatchOperation>(ops.length);

  for (let opIndex = 0; opIndex < ops.length; opIndex += 1) {
    if (!(opIndex in ops)) return { handled: false };
    const op = ops[opIndex]!;
    if (validateOperationShape(op) !== null || op.op !== "replace" || op.path === "") return { handled: false };
    if (!valuesTrusted && jsonSerializableError(op.value) !== null) return { handled: false };

    let rowIndex: number;
    if (arrayPath === null) {
      const location = parseFirstArrayNestedPath(state, op.path);
      if (location === null) return { handled: false };
      arrayPath = location.arrayPath;
      arraySegments = location.arraySegments;
      prefixText = location.prefixText;
      suffixText = location.suffixText;
      suffixSegments = location.suffixSegments;
      const current = getValueAt(state, location.arraySegments);
      if (!current.ok || !Array.isArray(current.value)) return { handled: false };
      arrayValue = current.value;
      rowIndex = location.index;
    } else {
      if (suffixSegments === null || prefixText === null || suffixText === null) return { handled: false };
      const parsedIndex = parseKnownArrayNestedIndex(
        op.path,
        arrayPath,
        suffixSegments,
        prefixText,
        suffixText,
      );
      if (parsedIndex === null) return { handled: false };
      rowIndex = parsedIndex;
    }

    if (arrayValue === null || rowIndex < 0 || rowIndex >= arrayValue.length) return { handled: false };
    updateIndexes[opIndex] = rowIndex;
    updateValues[opIndex] = op.value;
    applied[opIndex] = op;
  }

  if (arraySegments === null || suffixSegments === null || arrayValue === null) return { handled: false };
  const next = arrayValue.slice();
  for (let index = 0; index < ops.length; index += 1) {
    const rowIndex = updateIndexes[index]!;
    const value = updateValues[index];
    const replaced = replaceValueAtSegments(arrayValue[rowIndex], suffixSegments, 0, value);
    if (replaced === null) return { handled: false };
    next[rowIndex] = replaced;
  }

  const stateWithArray = replaceValueAtSegments(state, arraySegments, 0, next);
  return stateWithArray === null
    ? { handled: false }
    : { handled: true, state: stateWithArray, applied };
}

export function applySameArrayElementReplacePatch(
  state: unknown,
  ops: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted = false,
): FastPatchResult {
  if (ops.length < 2) return { handled: false };

  let parent: Pointer | null = null;
  let parentSegments: string[] | null = null;
  let next: unknown[] | null = null;
  const applied = new Array<JSONPatchOperation>(ops.length);

  for (let index = 0; index < ops.length; index += 1) {
    if (!(index in ops)) return { handled: false };
    const op = ops[index]!;
    if (validateOperationShape(op) !== null || op.op !== "replace" || op.path === "") return { handled: false };
    const location = arrayRemoveLocation(op.path);
    if (location === null) return { handled: false };
    if (parent === null) {
      parent = location.parent;
      const parsedParent = parseSafe(parent);
      if (!("ok" in parsedParent)) return { handled: false };
      parentSegments = parsedParent.segs;
      const current = getValueAt(state, parentSegments);
      if (!current.ok || !Array.isArray(current.value)) return { handled: false };
      next = current.value.slice();
    } else if (parent !== location.parent) {
      return { handled: false };
    }

    if (!valuesTrusted && jsonSerializableError(op.value) !== null) return { handled: false };
    if (next === null || location.index < 0 || location.index >= next.length) return { handled: false };
    next[location.index] = op.value;
    applied[index] = op;
  }

  if (parentSegments === null || next === null) return { handled: false };
  const stateWithArray = replaceValueAtSegments(state, parentSegments, 0, next);
  return stateWithArray === null
    ? { handled: false }
    : { handled: true, state: stateWithArray, applied };
}

export function applyIndependentReplacePatch(
  state: unknown,
  ops: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted = false,
): FastPatchResult {
  if (ops.length < 2) return { handled: false };

  const items: Array<{ op: JSONPatchOperation; path: Pointer; segments: string[]; value: unknown }> = [];
  for (let index = 0; index < ops.length; index++) {
    if (!(index in ops)) return { handled: false };
    const op = ops[index]!;
    if (validateOperationShape(op) !== null || op.op !== "replace" || op.path === "") return { handled: false };
    const parsed = parseSafe(op.path);
    if (!("ok" in parsed)) return { handled: false };
    if (!getValueAt(state, parsed.segs).ok) return { handled: false };
    if (!valuesTrusted && jsonSerializableError(op.value) !== null) return { handled: false };
    items.push({ op, path: op.path, segments: parsed.segs, value: op.value });
  }

  if (!hasIndependentPaths(items)) return { handled: false };
  return { handled: true, state: applyReplaceTree(state, buildReplaceTree(items)), applied: items.map((item) => item.op) };
}

interface SequentialReplaceOperation {
  op: Extract<JSONPatchOperation, { op: "replace" }>;
  segments: string[];
}

/**
 * Applies an overlapping replace batch through a private copy-on-write draft.
 *
 * Earlier replace strategies cover uniform and independent paths. This fallback
 * preserves RFC 6902 operation order for ancestor/descendant and repeated paths
 * while cloning each container at most once for the lifetime of the batch.
 * The draft is never published on failure, so the caller's state and values stay
 * immutable.
 */
export function applySequentialReplacePatch(
  state: unknown,
  ops: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted = false,
): FastPatchResult {
  if (ops.length < 2) return { handled: false };

  const prepared = new Array<SequentialReplaceOperation>(ops.length);
  for (let index = 0; index < ops.length; index += 1) {
    if (!(index in ops)) return { handled: false };
    const op = ops[index]!;
    if (validateOperationShape(op) !== null || op.op !== "replace" || op.path === "") {
      return { handled: false };
    }
    if (!valuesTrusted && jsonSerializableError(op.value) !== null) return { handled: false };
    const parsed = parseSafe(op.path);
    if (!("ok" in parsed)) return { handled: false };
    prepared[index] = { op, segments: parsed.segs };
  }

  const draftContainers = new WeakSet<object>();
  let draft = state;
  for (const operation of prepared) {
    const replaced = replaceDraftValue(draft, operation.segments, operation.op.value, draftContainers);
    if (replaced === null) return { handled: false };
    draft = replaced;
  }

  return {
    handled: true,
    state: draft,
    applied: prepared.map((operation) => operation.op),
  };
}

function replaceDraftValue(
  state: unknown,
  segments: ReadonlyArray<string>,
  value: unknown,
  draftContainers: WeakSet<object>,
): unknown | null {
  if (segments.length === 0) return null;
  const root = ensureDraftContainer(state, draftContainers);
  if (root === null) return null;

  let current = root;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]!;
    const child = readDraftChild(current, segment);
    if (!child.ok) return null;
    const childDraft = ensureDraftContainer(child.value, draftContainers);
    if (childDraft === null) return null;
    if (childDraft !== child.value) writeDraftChild(current, child.key, childDraft);
    current = childDraft;
  }

  const target = readDraftChild(current, segments[segments.length - 1]!);
  if (!target.ok) return null;
  writeDraftChild(current, target.key, value);
  return root;
}

type DraftContainer = unknown[] | Record<string, unknown>;

function ensureDraftContainer(
  value: unknown,
  draftContainers: WeakSet<object>,
): DraftContainer | null {
  if (value === null || typeof value !== "object") return null;
  if (draftContainers.has(value)) return value as DraftContainer;
  const draft: DraftContainer = Array.isArray(value)
    ? value.slice()
    : { ...(value as Record<string, unknown>) };
  draftContainers.add(draft);
  return draft;
}

function readDraftChild(
  container: DraftContainer,
  segment: string,
): { ok: true; key: number | string; value: unknown } | { ok: false } {
  if (Array.isArray(container)) {
    const index = numericSegment(segment);
    return index === null || index >= container.length
      ? { ok: false }
      : { ok: true, key: index, value: container[index] };
  }
  if (!objectHasOwn.call(container, segment)) return { ok: false };
  return { ok: true, key: segment, value: container[segment] };
}

function writeDraftChild(
  container: DraftContainer,
  key: number | string,
  value: unknown,
): void {
  if (Array.isArray(container)) {
    container[key as number] = value;
    return;
  }
  const property = key as string;
  if (property === "__proto__") {
    Object.defineProperty(container, property, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    return;
  }
  container[property] = value;
}

function buildReplaceTree(items: ReadonlyArray<{ segments: string[]; value: unknown }>): ReplaceTree {
  const root: ReplaceTree = { children: new Map() };
  for (const item of items) {
    let node = root;
    for (const segment of item.segments) {
      let child = node.children.get(segment);
      if (!child) {
        child = { children: new Map() };
        node.children.set(segment, child);
      }
      node = child;
    }
    node.value = item.value;
  }
  return root;
}

function applyReplaceTree(value: unknown, tree: ReplaceTree): unknown {
  if (tree.children.size === 0) return tree.value;
  if (Array.isArray(value)) {
    const next = value.slice();
    for (const [segment, child] of tree.children) {
      next[Number(segment)] = applyReplaceTree(next[Number(segment)], child);
    }
    return next;
  }
  const next = { ...(value as Record<string, unknown>) };
  for (const [segment, child] of tree.children) {
    next[segment] = applyReplaceTree(next[segment], child);
  }
  return next;
}

function hasIndependentPaths(paths: ReadonlyArray<{ path: string }>): boolean {
  const sorted = paths.map((item) => item.path).sort();
  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1]!;
    const current = sorted[index]!;
    if (current === previous || current.startsWith(`${previous}/`)) return false;
  }
  return true;
}
