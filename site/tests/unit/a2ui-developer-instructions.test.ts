import { describe, expect, test } from "vitest";
import { A2UI_DEVELOPER_INSTRUCTIONS } from "../../config/a2ui-developer-instructions";
import { A2UI_BASIC_CATALOG_ID, A2UI_BASIC_COMPONENT_NAMES } from "../../src/app/a2ui-streaming-document";

describe("A2UI Codex developer instructions", () => {
  test("derives its catalog identity and supported names from the canonical catalog", () => {
    expect(A2UI_DEVELOPER_INSTRUCTIONS).toContain(A2UI_BASIC_CATALOG_ID);
    for (const name of A2UI_BASIC_COMPONENT_NAMES) expect(A2UI_DEVELOPER_INSTRUCTIONS).toContain(name);
  });

  test("states the exact property boundary and common incompatible shapes", () => {
    expect(A2UI_DEVELOPER_INSTRUCTIONS).toContain("id is the literal string root");
    expect(A2UI_DEVELOPER_INSTRUCTIONS).toContain("root is an id, not an envelope property");
    expect(A2UI_DEVELOPER_INSTRUCTIONS).toContain("every component may have accessibility and weight");
    expect(A2UI_DEVELOPER_INSTRUCTIONS).toContain("Column and Row have children, justify, and align");
    expect(A2UI_DEVELOPER_INSTRUCTIONS).toContain("Divider has axis");
    for (const incompatible of ["explicitList", "weightedChildren", "nested component objects"]) {
      expect(A2UI_DEVELOPER_INSTRUCTIONS).toContain(incompatible);
    }
    expect(A2UI_DEVELOPER_INSTRUCTIONS).toContain("key literally named operation");
    expect(A2UI_DEVELOPER_INSTRUCTIONS).toContain("fence label must be exactly a2ui");
  });
});
