// #206 — schema introspection 은 optional/nullable/default 등 wrapper 를
// 통과해 안쪽 slot 을 찾아야 한다. (path traversal through wrappers)

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createJSONDocument } from "@interactive-os/json-document/session";

const Schema = z.object({
  user: z.object({ name: z.string() }).optional(),
  items: z.array(z.string()).optional(),
  nested: z.object({ inner: z.object({ v: z.number() }) }).nullable(),
  cfg: z.object({ flag: z.boolean() }).default({ flag: true }),
  req: z.object({ v: z.number() }),
});

const doc = createJSONDocument(Schema, {
  user: { name: "a" },
  items: ["x"],
  nested: { inner: { v: 1 } },
  cfg: { flag: false },
  req: { v: 2 },
});

describe("#206 schema introspection through wrappers", () => {
  it("at() traverses into an optional object", () => {
    expect(doc.schema.at("/user/name").ok).toBe(true);
  });

  it("at() traverses into an optional array element", () => {
    expect(doc.schema.at("/items/0").ok).toBe(true);
  });

  it("at() traverses into a nullable nested object", () => {
    expect(doc.schema.at("/nested/inner/v").ok).toBe(true);
  });

  it("at() traverses into a defaulted object", () => {
    expect(doc.schema.at("/cfg/flag").ok).toBe(true);
  });

  it("accepts() validates through an optional object", () => {
    expect(doc.schema.accepts("/user/name", "b").ok).toBe(true);
    const bad = doc.schema.accepts("/user/name", 123);
    expect(bad.ok).toBe(false);
  });

  it("accepts() validates through an optional array", () => {
    expect(doc.schema.accepts("/items/0", "y").ok).toBe(true);
  });

  it("kind() resolves the unwrapped element kind", () => {
    const k = doc.schema.at("/items/0");
    expect(k.ok && k.kind).toBe("string");
  });

  it("still resolves required paths (control)", () => {
    expect(doc.schema.at("/req/v").ok).toBe(true);
  });

  it("still returns path_not_found for a genuinely absent key", () => {
    expect(doc.schema.at("/user/missing").ok).toBe(false);
  });
});
