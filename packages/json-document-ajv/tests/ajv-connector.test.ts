import { createJSONDocument } from "@interactive-os/json-document";
import { Ajv } from "ajv";
import { describe, expect, test } from "vitest";

import { createAjvValidator } from "../src/index.js";

describe("Ajv connector", () => {
  test("translates the first nested error instancePath into a JSON Pointer", () => {
    const ajv = new Ajv();
    const validate = createAjvValidator(ajv.compile({
      type: "object",
      properties: {
        profile: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 3 },
          },
          required: ["title"],
        },
      },
      required: ["profile"],
    }), { code: "profile_invalid" });

    expect(validate({ profile: { title: "x" } })).toEqual({
      ok: false,
      code: "profile_invalid",
      reason: "must NOT have fewer than 3 characters",
      pointer: "/profile/title",
    });
  });

  test("maps a root error to the root JSON Pointer", () => {
    const ajv = new Ajv();
    const validate = createAjvValidator(ajv.compile({ type: "object" }));

    expect(validate(1)).toMatchObject({
      ok: false,
      code: "schema_violation",
      pointer: "",
    });
  });

  test("rejects invalid commits and preserves the previous canonical JSON", () => {
    const ajv = new Ajv();
    const validate = createAjvValidator(ajv.compile({
      type: "object",
      properties: {
        profile: {
          type: "object",
          properties: { title: { type: "string", minLength: 3 } },
          required: ["title"],
        },
      },
      required: ["profile"],
    }));
    const document = createJSONDocument(
      { profile: { title: "Draft" } },
      { validate },
    );

    const result = document.commit([
      { op: "replace", path: "/profile/title", value: "x" },
    ]);

    expect(result).toMatchObject({
      ok: false,
      code: "schema_violation",
      pointer: "/profile/title",
    });
    expect(document.value).toEqual({ profile: { title: "Draft" } });
  });

  test("validates a mutable clone without adopting Ajv transformations", () => {
    const ajv = new Ajv({
      coerceTypes: true,
      removeAdditional: "all",
      useDefaults: true,
    });
    const validate = createAjvValidator(ajv.compile({
      type: "object",
      properties: {
        count: { type: "number" },
        enabled: { type: "boolean", default: true },
      },
      required: ["count"],
      additionalProperties: false,
    }));
    const document = createJSONDocument(
      { count: 1, clientNote: "keep" },
      { validate },
    );

    const result = document.commit([
      { op: "replace", path: "/count", value: "2" },
    ]);

    expect(result).toMatchObject({
      ok: true,
      change: {
        applied: [{ op: "replace", path: "/count", value: "2" }],
      },
    });
    expect(document.value).toEqual({ count: "2", clientNote: "keep" });
  });

  test("rejects compiled async validators at the Connector boundary", () => {
    const ajv = new Ajv();
    const asyncValidator = ajv.compile({ $async: true, type: "object" });

    expect(() => createAjvValidator(asyncValidator)).toThrow(
      "Ajv Connector requires a synchronous validator.",
    );
  });
});
