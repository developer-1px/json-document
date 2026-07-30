import { describe, expect, test } from "vitest";

import {
  createJSONDocument,
  type JSONCapabilityResult,
  type JSONPatchValidationResult,
} from "@interactive-os/json-document";

describe("deprecated naming compatibility", () => {
  test("validatePatch and canPatch preserve equivalent extracted methods", () => {
    const document = createJSONDocument({ value: 1 });
    const operations = [
      { op: "replace" as const, path: "/value", value: 2 },
    ];

    const validatePatch = document.validatePatch;
    const canPatch = document.canPatch;

    expect(validatePatch(operations)).toEqual({ ok: true });
    expect(canPatch(operations)).toEqual({ ok: true });
  });

  test("validation result compatibility is structural", () => {
    const validation = { ok: true } as JSONPatchValidationResult;
    validation satisfies JSONCapabilityResult;
  });
});
