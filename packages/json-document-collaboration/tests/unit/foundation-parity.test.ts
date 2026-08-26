import { jsonEqual, parseArrayIndex, type JSONValue } from "@interactive-os/json-document";
import { describe, expect, test } from "vitest";

import rawVectors from "../../../../standards/json-document-v3/conformance/vectors/foundation.json" with { type: "json" };

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

describe("collaboration canonical durability primitives", () => {
  test("consumes Core array index semantics", () => {
    for (const vector of vectors.arrayIndexes) {
      expect(parseArrayIndex(vector.segment), vector.segment)
        .toBe(vector.value);
    }
  });

  test("consumes Core equality semantics", () => {
    for (const vector of vectors.equalities) {
      expect(jsonEqual(vector.left, vector.right))
        .toBe(vector.equal);
    }
  });
});
