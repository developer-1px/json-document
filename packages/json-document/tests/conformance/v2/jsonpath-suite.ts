import { describe, expect, test } from "vitest";

import cts from "../../public/jsonpath/conformance/jsonpath-cts.json" with { type: "json" };
import type { JSONValue } from "./protocol-suite.js";
import type {
  ProjectionQueryResult,
  ProjectionReadResult,
} from "./projection-suite.js";

interface JSONPathCase {
  readonly name: string;
  readonly selector: string;
  readonly document?: JSONValue;
  readonly result?: ReadonlyArray<JSONValue>;
  readonly results?: ReadonlyArray<ReadonlyArray<JSONValue>>;
  readonly invalid_selector?: boolean;
  readonly tags?: ReadonlyArray<string>;
}

interface JSONPathFailure {
  readonly name: string;
  readonly selector: string;
  readonly reason: string;
  readonly tags?: ReadonlyArray<string>;
}

interface JSONPathProjection {
  at(pointer: string): ProjectionReadResult;
  query(jsonPath: string): ProjectionQueryResult;
}

export interface JSONPathHarness {
  create(initial: JSONValue): JSONPathProjection;
}

const EXPECTED_TOTAL = 703;
const EXPECTED_INVALID_SELECTORS = 247;
const suite = cts as unknown as { readonly tests: ReadonlyArray<JSONPathCase> };
const pointerCases = [
  {
    name: "root query normalizes to the root Pointer",
    selector: "$",
    document: { value: "same" },
    pointers: [""],
  },
  {
    name: "equal values retain distinct array addresses",
    selector: "$.items[*].value",
    document: {
      items: [{ value: "same" }, { value: "same" }],
    },
    pointers: ["/items/0/value", "/items/1/value"],
  },
  {
    name: "object member names use RFC 6901 escaping",
    selector: "$['a/b~c']",
    document: { "a/b~c": "same" },
    pointers: ["/a~1b~0c"],
  },
] as const satisfies ReadonlyArray<{
  readonly name: string;
  readonly selector: string;
  readonly document: JSONValue;
  readonly pointers: ReadonlyArray<string>;
}>;

export function runJSONPathConformance(harness: JSONPathHarness): void {
  describe("json-document v2 RFC 9535 JSONPath CTS black-box conformance", () => {
    test("full conformance does not regress", () => {
      const failures: JSONPathFailure[] = [];
      let invalidSelectors = 0;
      let passed = 0;

      for (const testCase of suite.tests) {
        const projection = harness.create(
          "document" in testCase ? testCase.document ?? null : null,
        );
        const queried = projection.query(testCase.selector);
        if (testCase.invalid_selector) {
          invalidSelectors += 1;
          if (!queried.ok) {
            passed += 1;
          } else {
            failures.push(failure(testCase, "expected invalid selector"));
          }
          continue;
        }

        if (!queried.ok) {
          failures.push(failure(
            testCase,
            queried.reason ?? "invalid query",
          ));
          continue;
        }

        const result = queried.pointers.map((pointer) => {
          const read = projection.at(pointer);
          if (!read.ok) {
            throw new Error(`query returned unreadable pointer: ${pointer}`);
          }
          return read.value;
        });
        if (matchesAllowedResult(result, testCase)) {
          passed += 1;
        } else {
          failures.push(failure(testCase, "result mismatch"));
        }
      }

      expect(suite.tests).toHaveLength(EXPECTED_TOTAL);
      expect(invalidSelectors).toBe(EXPECTED_INVALID_SELECTORS);
      expect(
        passed,
        JSON.stringify(failures.slice(0, 20), null, 2),
      ).toBe(EXPECTED_TOTAL);
    });

    for (const pointerCase of pointerCases) {
      test(pointerCase.name, () => {
        const queried = harness.create(pointerCase.document).query(
          pointerCase.selector,
        );
        expect(queried.ok).toBe(true);
        if (!queried.ok) return;
        expect(queried.pointers).toEqual(pointerCase.pointers);
      });
    }
  });
}

function matchesAllowedResult(
  actual: ReadonlyArray<JSONValue>,
  testCase: JSONPathCase,
): boolean {
  const allowed = "result" in testCase
    ? [testCase.result ?? []]
    : testCase.results ?? [];
  return allowed.some((expected) => sameJSON(actual, expected));
}

function failure(
  testCase: JSONPathCase,
  reason: string,
): JSONPathFailure {
  return {
    name: testCase.name,
    selector: testCase.selector,
    reason,
    ...(testCase.tags === undefined ? {} : { tags: testCase.tags }),
  };
}

function sameJSON(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function canonical(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  const object = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(object).sort()) {
    normalized[key] = canonical(object[key]);
  }
  return normalized;
}
