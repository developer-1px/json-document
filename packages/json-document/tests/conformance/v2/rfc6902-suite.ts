import { describe, expect, test } from "vitest";

import specTests from "../../public/json-patch/conformance/spec_tests.json" with { type: "json" };
import tests from "../../public/json-patch/conformance/tests.json" with { type: "json" };
import type {
  JSONPatchOperation,
  ProtocolPatchResult,
} from "./protocol-suite.js";

interface RFC6902Case {
  readonly comment?: string;
  readonly doc: unknown;
  readonly patch: ReadonlyArray<JSONPatchOperation>;
  readonly expected?: unknown;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
}

export interface RFC6902Harness {
  applyPatch(
    value: unknown,
    operations: ReadonlyArray<JSONPatchOperation>,
  ): ProtocolPatchResult;
}

const allCases = [
  ...(tests as unknown as ReadonlyArray<RFC6902Case>),
  ...(specTests as unknown as ReadonlyArray<RFC6902Case>),
];

export function runRFC6902Conformance(harness: RFC6902Harness): void {
  describe("json-document v2 RFC 6902 vendor black-box conformance", () => {
    const disabled = allCases.filter((testCase) => testCase.disabled).length;

    for (const [index, testCase] of allCases.entries()) {
      const label = `[${index}] ${testCase.comment ?? "(no comment)"}`;
      if (testCase.disabled) {
        test.skip(`${label} — ${testCase.disabledReason ?? "no reason recorded"}`, () => undefined);
        continue;
      }

      test(label, () => {
        const result = harness.applyPatch(testCase.doc, testCase.patch);
        if ("expected" in testCase) {
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(sameJSON(result.value, testCase.expected)).toBe(true);
          }
          return;
        }
        if (testCase.error !== undefined) {
          expect(result.ok).toBe(false);
          return;
        }
        expect(result.ok).toBe(true);
      });
    }

    test("vendored suite size is intentional", () => {
      expect(allCases).toHaveLength(112);
      expect(allCases.length - disabled).toBe(110);
      expect(disabled).toBe(2);
      expect(
        allCases
          .filter((testCase) => testCase.disabled)
          .every((testCase) => testCase.disabledReason !== undefined),
      ).toBe(true);
    });
  });
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
