import type {
  JSONPatchOperation,
} from "@interactive-os/json-document";

import {
  compareIds,
} from "./ready.js";

export interface StoredEnvelope {
  readonly id: string;
  readonly dependsOn: ReadonlyArray<string>;
  readonly operations: ReadonlyArray<JSONPatchOperation>;
}

export type PreparedEnvelope =
  | { readonly ok: true; readonly envelope: StoredEnvelope }
  | { readonly ok: false; readonly reason: string; readonly id?: string };

const ENVELOPE_FIELDS = new Set(["id", "dependsOn", "operations"]);

export function prepareEnvelope(input: unknown): PreparedEnvelope {
  const fields = readEnvelopeFields(input);
  if (!fields.ok) return fields;

  const { id } = fields;
  if (typeof id !== "string" || id.trim().length === 0) {
    return { ok: false, reason: "causal envelope id must be a non-empty string" };
  }

  let dependsOn: unknown;
  let operations: unknown;
  try {
    dependsOn = copyJson(fields.dependsOn);
    operations = copyJson(fields.operations);
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
  if (!Array.isArray(operations)) {
    return {
      ok: false,
      reason: `causal envelope operations must be an array: ${id}`,
      id,
    };
  }

  return {
    ok: true,
    envelope: {
      id,
      dependsOn: [...dependencies].sort(compareIds),
      operations: operations as ReadonlyArray<JSONPatchOperation>,
    },
  };
}

export function envelopesEqual(
  left: StoredEnvelope,
  right: StoredEnvelope,
): boolean {
  return jsonEqual(left.dependsOn, right.dependsOn)
    && jsonEqual(left.operations, right.operations);
}

export function copyJson<T>(value: T): T {
  return cloneJsonValue(value, new Set<object>()) as T;
}

type EnvelopeFields =
  | {
      readonly ok: true;
      readonly id: unknown;
      readonly dependsOn: unknown;
      readonly operations: unknown;
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
  if (id === undefined || dependsOn === undefined || operations === undefined) {
    return { ok: false, reason: "causal envelope requires id, dependsOn, and operations" };
  }
  return {
    ok: true,
    id: id.value,
    dependsOn: dependsOn.value,
    operations: operations.value,
  };
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
