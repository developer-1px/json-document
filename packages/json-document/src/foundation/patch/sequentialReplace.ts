import { jsonSerializableError } from "../json/serializable.js";
import { applyOpRaw, validateOperationShape } from "./apply.js";
import { parseSafe } from "./container.js";
import type { FastPatchResult, JSONPatchOperation } from "./contract.js";
import { objectHasOwn } from "./object.js";
import { numericSegment } from "./path.js";

type ReplaceOperation = Extract<JSONPatchOperation, { op: "replace" }>;

interface PreparedSequentialReplace {
  operation: ReplaceOperation;
  segments: string[];
}

interface SequentialReplaceRun {
  state: unknown;
  applied: ReplaceOperation[] | null;
  inverses: JSONPatchOperation[] | null;
}

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
  const run = runSequentialReplaceBatch(state, operations, valuesTrusted, false);
  return run === null || run.applied === null
    ? { handled: false }
    : { handled: true, state: run.state, applied: run.applied };
}

/**
 * Captures the value immediately before each sequential write and returns
 * inverse operations in undo order. A null result delegates to the generic
 * inverse path, preserving its existing success and failure semantics.
 */
export function computeSequentialReplaceInverses(
  state: unknown,
  operations: ReadonlyArray<JSONPatchOperation>,
): JSONPatchOperation[] | null {
  let firstReplace = 0;
  while (
    firstReplace < operations.length
    && firstReplace in operations
    && operations[firstReplace]!.op === "test"
  ) {
    const asserted = applyOpRaw(state, operations[firstReplace]!);
    if ("error" in asserted) return null;
    state = asserted.state;
    firstReplace += 1;
  }
  if (firstReplace === operations.length) return null;

  const replaceOperations = firstReplace === 0
    ? operations
    : operations.slice(firstReplace);
  const run = runSequentialReplaceBatch(state, replaceOperations, false, true);
  return run?.inverses ?? null;
}

function runSequentialReplaceBatch(
  state: unknown,
  operations: ReadonlyArray<JSONPatchOperation>,
  valuesTrusted: boolean,
  captureInverses: boolean,
): SequentialReplaceRun | null {
  if (operations.length < 2) return null;

  const prepared = new Array<PreparedSequentialReplace>(operations.length);
  const applied = captureInverses
    ? null
    : new Array<ReplaceOperation>(operations.length);
  for (let index = 0; index < operations.length; index += 1) {
    if (!(index in operations)) return null;
    const operation = operations[index]!;
    if (
      validateOperationShape(operation) !== null
      || operation.op !== "replace"
      || operation.path === ""
    ) {
      return null;
    }
    if (!valuesTrusted && jsonSerializableError(operation.value) !== null) return null;
    const parsed = parseSafe(operation.path);
    if (!("ok" in parsed)) return null;
    prepared[index] = { operation, segments: parsed.segs };
    if (applied !== null) applied[index] = operation;
  }

  const inverses = captureInverses
    ? new Array<JSONPatchOperation>(operations.length)
    : null;
  const draftContainers = new WeakSet<object>();
  let draft = state;
  for (let index = 0; index < prepared.length; index += 1) {
    const item = prepared[index]!;
    const replaced = replaceDraftValue(
      draft,
      item.segments,
      item.operation,
      draftContainers,
      inverses,
      operations.length - index - 1,
    );
    if (replaced === null) return null;
    draft = replaced;
  }

  return { state: draft, applied, inverses };
}

function replaceDraftValue(
  state: unknown,
  segments: ReadonlyArray<string>,
  operation: ReplaceOperation,
  draftContainers: WeakSet<object>,
  inverses: JSONPatchOperation[] | null,
  inverseIndex: number,
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
  if (inverses !== null) {
    inverses[inverseIndex] = {
      op: "replace",
      path: operation.path,
      value: target.value,
    };
  }
  writeDraftChild(current, target.key, operation.value);
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
