import type {
  JSONPatchOperation,
  SelectionPoint,
} from "@interactive-os/json-document";
import type {
  CausalAuthoredIntent,
  CausalPositionalIntent,
  CausalStableIdReplaceIntent,
} from "./types.js";

import {
  compareIds,
} from "./ready.js";

interface StoredEnvelopeFields {
  readonly id: string;
  readonly dependsOn: ReadonlyArray<string>;
}

export interface StoredPatchEnvelope extends StoredEnvelopeFields {
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly intent?: never;
}

export interface StoredIntentEnvelope<TDocument> extends StoredEnvelopeFields {
  readonly intent: CausalAuthoredIntent<TDocument>;
  readonly operations?: never;
}

export type StoredEnvelope<TDocument = unknown> =
  | StoredPatchEnvelope
  | StoredIntentEnvelope<TDocument>;

export type PreparedEnvelope<TDocument = unknown> =
  | { readonly ok: true; readonly envelope: StoredEnvelope<TDocument> }
  | { readonly ok: false; readonly reason: string; readonly id?: string };

const ENVELOPE_FIELDS = new Set(["id", "dependsOn", "operations", "intent"]);
const POSITIONAL_INTENT_FIELDS = new Set([
  "kind",
  "base",
  "baseRevision",
  "operations",
  "selectionAfter",
]);
const STABLE_ID_INTENT_FIELDS = new Set([
  "kind",
  "target",
  "relativePath",
  "expected",
  "value",
  "relativeSelectionAfter",
]);
const STABLE_ID_TARGET_FIELDS = new Set(["scope", "id"]);
const SELECTION_POINT_FIELDS = new Set([
  "path",
  "offset",
  "edge",
  "affinity",
]);

export function prepareEnvelope<TDocument = unknown>(
  input: unknown,
): PreparedEnvelope<TDocument> {
  const fields = readEnvelopeFields(input);
  if (!fields.ok) return fields;

  const { id } = fields;
  if (typeof id !== "string" || id.trim().length === 0) {
    return { ok: false, reason: "causal envelope id must be a non-empty string" };
  }

  let dependsOn: unknown;
  let payload: unknown;
  try {
    dependsOn = copyJson(fields.dependsOn);
    payload = copyJson(fields.payload);
  } catch {
    return {
      ok: false,
      reason: `causal envelope must contain plain JSON data: ${id}`,
      id,
    };
  }

  if (!Array.isArray(dependsOn)) {
    return {
      ok: false,
      reason: `causal envelope dependencies must be an array: ${id}`,
      id,
    };
  }
  const dependencies = new Set<string>();
  for (const dependency of dependsOn) {
    if (typeof dependency !== "string" || dependency.trim().length === 0) {
      return {
        ok: false,
        reason: `causal dependency id must be a non-empty string: ${id}`,
        id,
      };
    }
    if (dependency === id) {
      return {
        ok: false,
        reason: `causal envelope cannot depend on itself: ${id}`,
        id,
      };
    }
    if (dependencies.has(dependency)) {
      return {
        ok: false,
        reason: `causal envelope dependency is duplicated: ${dependency}`,
        id,
      };
    }
    dependencies.add(dependency);
  }
  const envelopeFields = {
    id,
    dependsOn: [...dependencies].sort(compareIds),
  };
  if (fields.kind === "operations") {
    if (!Array.isArray(payload)) {
      return {
        ok: false,
        reason: `causal envelope operations must be an array: ${id}`,
        id,
      };
    }
    return {
      ok: true,
      envelope: {
        ...envelopeFields,
        operations: payload as ReadonlyArray<JSONPatchOperation>,
      },
    };
  }

  const intent = prepareIntent<TDocument>(payload, id);
  return intent.ok
    ? {
        ok: true,
        envelope: {
          ...envelopeFields,
          intent: intent.intent,
        },
      }
    : intent;
}

export function envelopesEqual<TDocument>(
  left: StoredEnvelope<TDocument>,
  right: StoredEnvelope<TDocument>,
): boolean {
  if (!jsonEqual(left.dependsOn, right.dependsOn)) return false;
  if ("operations" in left) {
    return "operations" in right
      && jsonEqual(left.operations, right.operations);
  }
  return "intent" in right && jsonEqual(left.intent, right.intent);
}

type PreparedIntent<TDocument> =
  | { readonly ok: true; readonly intent: CausalAuthoredIntent<TDocument> }
  | { readonly ok: false; readonly reason: string; readonly id: string };

function prepareIntent<TDocument>(
  input: unknown,
  id: string,
): PreparedIntent<TDocument> {
  if (!isPlainRecord(input)) {
    return {
      ok: false,
      reason: `causal envelope intent must be an object: ${id}`,
      id,
    };
  }
  const kind = input.kind;
  if (kind === "positional") return preparePositionalIntent(input, id);
  if (kind === "stable-id-replace") return prepareStableIdIntent(input, id);
  return {
    ok: false,
    reason: `causal envelope intent kind is unsupported: ${id}`,
    id,
  };
}

function preparePositionalIntent<TDocument>(
  input: Readonly<Record<string, unknown>>,
  id: string,
): PreparedIntent<TDocument> {
  if (
    !hasOnlyFields(input, POSITIONAL_INTENT_FIELDS)
    || !hasOwn(input, "base")
    || !Array.isArray(input.operations)
    || (
      hasOwn(input, "baseRevision")
      && (
        !Number.isSafeInteger(input.baseRevision)
        || (input.baseRevision as number) < 0
      )
    )
    || (
      hasOwn(input, "selectionAfter")
      && !isSelectionPointData(input.selectionAfter)
    )
  ) {
    return {
      ok: false,
      reason: `causal positional intent is invalid: ${id}`,
      id,
    };
  }
  const intent: CausalPositionalIntent<TDocument> = {
    kind: "positional",
    base: input.base as TDocument,
    ...(typeof input.baseRevision === "number"
      ? { baseRevision: input.baseRevision }
      : {}),
    operations: input.operations as ReadonlyArray<JSONPatchOperation>,
    ...(isSelectionPointData(input.selectionAfter)
      ? { selectionAfter: input.selectionAfter }
      : {}),
  };
  return { ok: true, intent };
}

function prepareStableIdIntent<TDocument>(
  input: Readonly<Record<string, unknown>>,
  id: string,
): PreparedIntent<TDocument> {
  const target = input.target;
  if (
    !hasOnlyFields(input, STABLE_ID_INTENT_FIELDS)
    || !hasOwn(input, "expected")
    || !hasOwn(input, "value")
    || typeof input.relativePath !== "string"
    || (
      hasOwn(input, "relativeSelectionAfter")
      && !isSelectionPointData(input.relativeSelectionAfter)
    )
    || !isPlainRecord(target)
    || !hasOnlyFields(target, STABLE_ID_TARGET_FIELDS)
    || typeof target.scope !== "string"
    || target.scope.trim().length === 0
    || typeof target.id !== "string"
    || target.id.trim().length === 0
  ) {
    return {
      ok: false,
      reason: `causal stable-id intent is invalid: ${id}`,
      id,
    };
  }
  const intent: CausalStableIdReplaceIntent = {
    kind: "stable-id-replace",
    target: { scope: target.scope, id: target.id },
    relativePath: input.relativePath,
    expected: input.expected,
    value: input.value,
    ...(isSelectionPointData(input.relativeSelectionAfter)
      ? { relativeSelectionAfter: input.relativeSelectionAfter }
      : {}),
  };
  return { ok: true, intent };
}

export function copyJson<T>(value: T): T {
  return cloneJsonValue(value, new Set<object>()) as T;
}

type EnvelopeFields =
  | {
      readonly ok: true;
      readonly id: unknown;
      readonly dependsOn: unknown;
      readonly kind: "operations" | "intent";
      readonly payload: unknown;
    }
  | { readonly ok: false; readonly reason: string };

function readEnvelopeFields(input: unknown): EnvelopeFields {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, reason: "causal envelope must be an object" };
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return { ok: false, reason: "causal envelope must be a plain object" };
  }

  const descriptors = new Map<string, PropertyDescriptor>();
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !ENVELOPE_FIELDS.has(key)) {
      return { ok: false, reason: "causal envelope has an unsupported field" };
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (
      descriptor === undefined
      || !descriptor.enumerable
      || !("value" in descriptor)
    ) {
      return { ok: false, reason: `causal envelope field must be plain data: ${key}` };
    }
    descriptors.set(key, descriptor);
  }

  const id = descriptors.get("id");
  const dependsOn = descriptors.get("dependsOn");
  const operations = descriptors.get("operations");
  const intent = descriptors.get("intent");
  if (
    id === undefined
    || dependsOn === undefined
    || (operations === undefined) === (intent === undefined)
  ) {
    return {
      ok: false,
      reason: "causal envelope requires id, dependsOn, and exactly one of operations or intent",
    };
  }
  return {
    ok: true,
    id: id.value,
    dependsOn: dependsOn.value,
    kind: operations === undefined ? "intent" : "operations",
    payload: (operations ?? intent)!.value,
  };
}

function isPlainRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyFields(
  value: Readonly<Record<string, unknown>>,
  supported: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => supported.has(key));
}

function hasOwn(
  value: Readonly<Record<string, unknown>>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isSelectionPointData(value: unknown): value is SelectionPoint {
  if (typeof value === "string") return true;
  if (!isPlainRecord(value) || !hasOnlyFields(value, SELECTION_POINT_FIELDS)) {
    return false;
  }
  if (typeof value.path !== "string") return false;
  if (
    hasOwn(value, "offset")
    && (!Number.isSafeInteger(value.offset) || (value.offset as number) < 0)
  ) {
    return false;
  }
  if (
    hasOwn(value, "edge")
    && value.edge !== "before"
    && value.edge !== "after"
  ) {
    return false;
  }
  return !hasOwn(value, "affinity")
    || value.affinity === "forward"
    || value.affinity === "backward";
}

function cloneJsonValue(value: unknown, ancestors: Set<object>): unknown {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("JSON number must be finite");
    return value;
  }
  if (typeof value !== "object") throw new TypeError("value is not JSON");
  if (ancestors.has(value)) throw new TypeError("JSON value must be acyclic");

  ancestors.add(value);
  try {
    return Array.isArray(value)
      ? cloneJsonArray(value, ancestors)
      : cloneJsonObject(value, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

function cloneJsonArray(
  value: ReadonlyArray<unknown>,
  ancestors: Set<object>,
): unknown[] {
  for (const key of Reflect.ownKeys(value)) {
    if (key === "length") continue;
    if (typeof key !== "string" || !isArrayIndex(key, value.length)) {
      throw new TypeError("JSON arrays cannot have custom properties");
    }
  }

  const copy: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined
      || !descriptor.enumerable
      || !("value" in descriptor)
    ) {
      throw new TypeError("JSON array entries must be plain data");
    }
    copy.push(cloneJsonValue(descriptor.value, ancestors));
  }
  return copy;
}

function cloneJsonObject(
  value: object,
  ancestors: Set<object>,
): Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("JSON objects must be plain objects");
  }

  const copy: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw new TypeError("JSON objects cannot have symbol keys");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined
      || !descriptor.enumerable
      || !("value" in descriptor)
    ) {
      throw new TypeError("JSON object fields must be plain data");
    }
    Object.defineProperty(copy, key, {
      value: cloneJsonValue(descriptor.value, ancestors),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return copy;
}

function isArrayIndex(key: string, length: number): boolean {
  if (!/^(?:0|[1-9]\d*)$/.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index) && index >= 0 && index < length;
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
    if (left.length !== (right as ReadonlyArray<unknown>).length) return false;
    return left.every((item, index) => {
      return jsonEqual(item, (right as ReadonlyArray<unknown>)[index]);
    });
  }

  const leftObject = left as Readonly<Record<string, unknown>>;
  const rightObject = right as Readonly<Record<string, unknown>>;
  const keys = Object.keys(leftObject);
  if (keys.length !== Object.keys(rightObject).length) return false;
  return keys.every((key) => {
    return Object.prototype.hasOwnProperty.call(rightObject, key)
      && jsonEqual(leftObject[key], rightObject[key]);
  });
}
