import { expect, it } from "vitest";
import { createFakerSampleGenerator } from "../src/faker-samples.js";
import type { UIBuilderField } from "@interactive-os/json-document-editing";
it("generates deterministic schema-compatible values without shared random state", () => {
  const field: UIBuilderField = {id: "email", name: "이메일", type: "text", options: [], sample: "auto"};
  const a = createFakerSampleGenerator(42), b = createFakerSampleGenerator(42);
  expect(a(field)).toEqual(b(field)); expect(String(a(field))).toContain("@");
  expect(typeof a({...field, type: "number"})).toBe("number");
  expect(typeof a({...field, type: "checkbox"})).toBe("boolean");
  expect(a({...field, type: "select", options: [{id: "ready", name: "준비"}]})).toBe("ready");
  expect(a({...field, sample: "date"})).toMatch(/^2026-\d{2}-\d{2}$/);
});
