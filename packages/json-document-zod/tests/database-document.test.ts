import { describe, expect, test } from "vitest";
import * as z from "zod/v4";

import { databaseDocumentFromZod } from "../src/index.js";

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  owner: z.string(),
  points: z.number(),
  status: z.enum(["backlog", "progress", "done"]),
  shipped: z.boolean(),
});

const tasks = [
  { id: "t1", title: "Inbox", owner: "Ada", points: 1, status: "backlog", shipped: false },
  { id: "t2", title: "Ship Zod admin", owner: "Ada", points: 5, status: "progress", shipped: false },
];

describe("databaseDocumentFromZod", () => {
  test("translates object fields into a DatabaseDocument the editor can open", () => {
    const result = databaseDocumentFromZod(taskSchema, tasks);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.schema.properties.map((property) => [property.id, property.type])).toEqual([
      ["title", "title"],
      ["owner", "text"],
      ["points", "number"],
      ["status", "select"],
      ["shipped", "checkbox"],
    ]);
    expect(result.value.schema.properties.find((property) => property.id === "status")?.options).toEqual([
      { id: "backlog", name: "Backlog" },
      { id: "progress", name: "Progress" },
      { id: "done", name: "Done" },
    ]);
    expect(result.value.records.map((record) => record.id)).toEqual(["t1", "t2"]);
    expect(result.value.records[0]?.values).toEqual({
      title: "Inbox",
      owner: "Ada",
      points: 1,
      status: "backlog",
      shipped: false,
    });
    expect(result.value.views[0]?.projection.columns.map((column) => column.propertyId)).toEqual(["title", "owner", "points", "status", "shipped"]);
  });

  test("generates record ids when the schema has no id field", () => {
    const result = databaseDocumentFromZod(
      z.object({ name: z.string(), score: z.number() }),
      [{ name: "Ada", score: 3 }],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.records).toEqual([
      { id: "record-1", values: { name: "Ada", score: 3 } },
    ]);
  });

  test("rejects nested objects instead of inventing a property type", () => {
    expect(databaseDocumentFromZod(
      z.object({ profile: z.object({ title: z.string() }) }),
      [{ profile: { title: "Draft" } }],
    )).toEqual({
      ok: false,
      code: "unsupported_type",
      reason: 'Zod field "profile" (object) has no Database property mapping.',
      pointer: "/profile",
    });
  });

  test("returns a Zod issue pointer when a record fails the source schema", () => {
    expect(databaseDocumentFromZod(taskSchema, [
      { id: "t1", title: "Inbox", owner: "Ada", points: "3", status: "backlog", shipped: false },
    ])).toMatchObject({
      ok: false,
      code: "schema_violation",
      pointer: "/0/points",
    });
  });
});
