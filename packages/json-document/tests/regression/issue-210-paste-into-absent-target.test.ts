// #210 — into mode 의 부재 target 은 path_not_found 여야 한다 (invalid_pointer 아님).

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createJSONDocument } from "@interactive-os/json-document";

const Schema = z.object({
  items: z.array(z.object({ id: z.string() })),
  meta: z.object({ title: z.string() }),
});

const doc = createJSONDocument(Schema, { items: [{ id: "a" }], meta: { title: "t" } });

describe("#210 paste/insert into target error codes", () => {
  it("absent (but syntactically valid) into target → path_not_found", () => {
    expect(doc.canInsert({ into: "/missing" }, { id: "x" })).toMatchObject({
      ok: false,
      code: "path_not_found",
    });
  });

  it("existing non-array into target → invalid_target (type mismatch, #219)", () => {
    expect(doc.canInsert({ into: "/meta" }, { id: "x" })).toMatchObject({
      ok: false,
      code: "invalid_target",
    });
  });

  it("syntactically invalid into target → invalid_pointer", () => {
    expect(doc.canInsert({ into: "items" }, { id: "x" })).toMatchObject({
      ok: false,
      code: "invalid_pointer",
    });
  });

  it("valid array into target → ok", () => {
    expect(doc.canInsert({ into: "/items" }, { id: "x" })).toEqual({ ok: true });
  });
});
