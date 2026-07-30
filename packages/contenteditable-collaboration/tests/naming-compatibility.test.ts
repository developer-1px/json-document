import { describe, expect, test } from "vitest";

import {
  createCollaborationContentEditableAdapter,
  createContentEditableAdapter,
  plainTextCollaborationDOM,
  plainTextDOMAdapter,
  type CollaborationContentEditableAdapter,
  type CollaborationTextDOM,
  type ContentEditableAdapter,
  type TextDOMAdapter,
} from "../src/index.js";

describe("deprecated naming compatibility", () => {
  test("canonical and compatibility values share one implementation", () => {
    expect(createCollaborationContentEditableAdapter)
      .toBe(createContentEditableAdapter);
    expect(plainTextCollaborationDOM).toBe(plainTextDOMAdapter);
  });

  test("compatibility types are structural aliases", () => {
    const adapter = null as unknown as ContentEditableAdapter;
    adapter satisfies CollaborationContentEditableAdapter;

    const dom = null as unknown as TextDOMAdapter;
    dom satisfies CollaborationTextDOM;
  });
});
