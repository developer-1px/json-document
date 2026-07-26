import { describe, expect, test } from "vitest";

import rawVectors from "./pointer-vectors.json" with { type: "json" };
import type { JSONPatchOperation, JSONValue } from "./protocol-suite.js";

export interface PointerHarness {
  parsePointer(pointer: string): string[];
  tryParsePointer(pointer: string): string[] | null;
  buildPointer(
    segments: ReadonlyArray<string | number>,
    options?: { readonly uriFragment?: boolean },
  ): string;
  appendSegment(pointer: string, segment: string | number): string;
  parentPointer(pointer: string): string | null;
  trackPointer(
    pointer: string,
    applied: ReadonlyArray<JSONPatchOperation>,
  ): string | null;
}

interface PointerManifest {
  readonly parse: ReadonlyArray<{
    readonly id: string;
    readonly pointer: string;
    readonly segments: ReadonlyArray<string>;
  }>;
  readonly invalid: ReadonlyArray<{
    readonly id: string;
    readonly pointer: string;
  }>;
  readonly build: ReadonlyArray<{
    readonly id: string;
    readonly segments: ReadonlyArray<string | number>;
    readonly pointer: string;
    readonly fragment: string;
  }>;
  readonly append: ReadonlyArray<{
    readonly id: string;
    readonly pointer: string;
    readonly segment: string | number;
    readonly expect: string;
  }>;
  readonly parent: ReadonlyArray<{
    readonly id: string;
    readonly pointer: string;
    readonly expect: string | null;
  }>;
  readonly track: ReadonlyArray<{
    readonly id: string;
    readonly pointer: string;
    readonly applied: ReadonlyArray<JSONPatchOperation>;
    readonly expect: string | null;
  }>;
}

const manifest = rawVectors as unknown as PointerManifest;

export function runPointerConformance(harness: PointerHarness): void {
  describe("json-document v2 Pointer black-box conformance", () => {
    for (const vector of manifest.parse) {
      test(`[${vector.id}]`, () => {
        expect(harness.parsePointer(vector.pointer)).toEqual(vector.segments);
        expect(harness.tryParsePointer(vector.pointer)).toEqual(vector.segments);
      });
    }

    for (const vector of manifest.invalid) {
      test(`[${vector.id}]`, () => {
        expect(() => harness.parsePointer(vector.pointer)).toThrow();
        expect(harness.tryParsePointer(vector.pointer)).toBeNull();
      });
    }

    for (const vector of manifest.build) {
      test(`[${vector.id}]`, () => {
        expect(harness.buildPointer(vector.segments)).toBe(vector.pointer);
        expect(harness.buildPointer(vector.segments, {
          uriFragment: true,
        })).toBe(vector.fragment);
      });
    }

    for (const vector of manifest.append) {
      test(`[${vector.id}]`, () => {
        expect(harness.appendSegment(vector.pointer, vector.segment)).toBe(
          vector.expect,
        );
      });
    }

    for (const vector of manifest.parent) {
      test(`[${vector.id}]`, () => {
        expect(harness.parentPointer(vector.pointer)).toBe(vector.expect);
      });
    }

    for (const vector of manifest.track) {
      test(`[${vector.id}]`, () => {
        expect(harness.trackPointer(
          vector.pointer,
          cloneJSON(vector.applied),
        )).toBe(vector.expect);
      });
    }
  });
}

function cloneJSON<T extends JSONValue | ReadonlyArray<JSONPatchOperation>>(
  value: T,
): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
