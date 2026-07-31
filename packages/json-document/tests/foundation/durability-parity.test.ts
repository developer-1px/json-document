import { describe, expect, test } from "vitest";

import { cloneJsonSerializable } from "../../src/foundation/json/clone.js";
import { jsonEqual } from "../../src/foundation/json/equal.js";
import { jsonSerializableError } from "../../src/foundation/json/serializable.js";
import { cloneTrustedPlainJson } from "../../src/foundation/json/trusted-clone.js";
import { parseArrayIndex } from "../../src/foundation/pointer/array-index.js";
import rawVectors from "../conformance/v3/foundation-vectors.json" with { type: "json" };

interface FoundationVectors {
  readonly arrayIndexes: ReadonlyArray<{
    readonly segment: string;
    readonly value: number | null;
  }>;
  readonly equalities: ReadonlyArray<{
    readonly left: unknown;
    readonly right: unknown;
    readonly equal: boolean;
  }>;
  readonly jsonValues: ReadonlyArray<unknown>;
}

const vectors = rawVectors as FoundationVectors;

describe("v3 durability primitive parity", () => {
  test("one Core parser owns canonical array-index classification", () => {
    for (const vector of vectors.arrayIndexes) {
      expect(parseArrayIndex(vector.segment), vector.segment)
        .toBe(vector.value);
    }
  });

  test("the canonical JSON equality primitive matches shared vectors", () => {
    for (const vector of vectors.equalities) {
      expect(jsonEqual(vector.left, vector.right))
        .toBe(vector.equal);
    }
  });

  test("validation and owning clone agree at the untrusted JSON boundary", () => {
    for (const value of validJsonValues()) {
      expect(jsonSerializableError(value)).toBeNull();
      const cloned = cloneJsonSerializable(value);
      expect(cloned.ok).toBe(true);
      if (!cloned.ok) continue;
      expect(jsonEqual(cloned.value, value)).toBe(true);
      if (value !== null && typeof value === "object") {
        expect(cloned.value).not.toBe(value);
      }
    }

    for (const createInvalid of invalidJsonValues) {
      const value = createInvalid();
      const validationReason = jsonSerializableError(value);
      const cloned = cloneJsonSerializable(value);
      expect(validationReason).not.toBeNull();
      expect(cloned).toMatchObject({
        ok: false,
        reason: validationReason,
      });
    }
  });

  test("trusted clone preserves ownership without repeating validation", () => {
    for (const value of validJsonValues()) {
      const cloned = cloneTrustedPlainJson(value);
      expect(jsonEqual(cloned, value)).toBe(true);
      if (value !== null && typeof value === "object") {
        expect(cloned).not.toBe(value);
      }
    }
  });
});

function validJsonValues(): ReadonlyArray<unknown> {
  return [
    ...vectors.jsonValues,
    JSON.parse('{"__proto__":{"owned":true}}') as unknown,
  ];
}

const invalidJsonValues: ReadonlyArray<() => unknown> = [
  () => undefined,
  () => Number.NaN,
  () => Number.POSITIVE_INFINITY,
  () => 1n,
  () => Symbol("invalid"),
  () => () => undefined,
  () => new Date(0),
  () => {
    const value: unknown[] = [];
    value.length = 1;
    return value;
  },
  () => {
    const value = [1] as unknown[] & { extra?: string };
    value.extra = "invalid";
    return value;
  },
  () => {
    const value: Record<string, unknown> = {};
    Object.defineProperty(value, "hidden", {
      value: true,
      enumerable: false,
    });
    return value;
  },
  () => {
    const value: Record<string, unknown> = {};
    Object.defineProperty(value, "computed", {
      get: () => true,
      enumerable: true,
    });
    return value;
  },
  () => {
    const value: Record<string, unknown> = {};
    value.self = value;
    return value;
  },
  () => {
    const value: Record<PropertyKey, unknown> = {};
    value[Symbol("invalid")] = true;
    return value;
  },
];
