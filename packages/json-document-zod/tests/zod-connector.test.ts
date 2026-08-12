import { createJSONDocument } from "@interactive-os/json-document";
import { describe, expect, test } from "vitest";
import * as z from "zod/v4";

import { createZodValidator } from "../src/index.js";

describe("Zod connector", () => {
  test("translates the first nested issue path into an escaped JSON Pointer", () => {
    const validate = createZodValidator(z.object({
      profile: z.object({
        "display/name~": z.string().min(3, "Display name is too short."),
      }),
    }), { code: "profile_invalid" });

    expect(validate({ profile: { "display/name~": "x" } })).toEqual({
      ok: false,
      code: "profile_invalid",
      reason: "Display name is too short.",
      pointer: "/profile/display~1name~0",
    });
  });

  test("maps a root issue to the root JSON Pointer", () => {
    const validate = createZodValidator(z.string());

    expect(validate(1)).toMatchObject({
      ok: false,
      code: "schema_violation",
      pointer: "",
    });
  });

  test("rejects invalid commits and preserves the previous canonical JSON", () => {
    const validate = createZodValidator(z.object({
      profile: z.object({ title: z.string().trim().min(3) }),
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

  test("validates transformed output without adopting it as canonical JSON", () => {
    const validate = createZodValidator(z.object({
      profile: z.object({ title: z.string().trim().min(3) }),
    }));
    const document = createJSONDocument(
      { profile: { title: "Draft" } },
      { validate },
    );

    expect(document.commit([
      { op: "replace", path: "/profile/title", value: "  Ready  " },
    ])).toMatchObject({ ok: true });
    expect(document.value).toEqual({ profile: { title: "  Ready  " } });
  });
});
