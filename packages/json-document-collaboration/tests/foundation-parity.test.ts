import type { JSONValue } from "@interactive-os/json-document";
import { describe, expect, test } from "vitest";

import { parseArrayIndex } from "../src/array-index.js";
import { jsonEqual } from "../src/json-equal.js";
import rawVectors from "../../json-document/tests/conformance/v3/foundation-vectors.json" with { type: "json" };

interface FoundationVectors {
  readonly arrayIndexes: ReadonlyArray<{
    readonly segment: string;
    readonly value: number | null;
  }>;
  readonly equalities: ReadonlyArray<{
    readonly left: JSONValue;
    readonly right: JSONValue;
    readonly equal: boolean;
  }>;
}

const vectors = rawVectors as FoundationVectors;

describe("collaboration durability primitive parity", () => {
  test("package-local array indexes match the shared Core vectors", () => {
    for (const vector of vectors.arrayIndexes) {
      expect(parseArrayIndex(vector.segment), vector.segment)
        .toBe(vector.value);
    }
  });

  test("package-local equality matches the shared Core vectors", () => {
    for (const vector of vectors.equalities) {
      expect(jsonEqual(vector.left, vector.right))
        .toBe(vector.equal);
    }
  });
});
