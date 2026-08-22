import { describe, expect, test } from "vitest";
import { docPages } from "../../src/routes/docs/doc-pages";
import { liveDemoPaths } from "../../src/routes/docs/live-demo-registry";

describe("Markdown live demos", () => {
  test("declares every registered standalone demo exactly once in the documentation SSOT", () => {
    const declared = Object.values(docPages).flatMap(({ source }) => (
      [...source.matchAll(/```live-demo\s+([^\s]+)\s+```/g)].map((match) => match[1]!)
    ));

    expect(new Set(declared).size).toBe(declared.length);
    expect(declared.sort()).toEqual([...liveDemoPaths].sort());
  });
});
