import { describe, expect, test } from "vitest";
import {
  INITIAL_RICH_TEXT_SUGGESTION_STATE,
  activateRichTextSuggestion,
  dismissRichTextSuggestions,
  findRichTextSuggestionTrigger,
  reconcileRichTextSuggestionState,
  reopenRichTextSuggestions,
  resolveRichTextSuggestions,
} from "../src/index.js";
import type { RichTextDocument, RichTextSelection } from "@interactive-os/json-document-rich-text";

const document: RichTextDocument = {
  profile: "urn:test:rich-text",
  id: "doc",
  type: "doc" as const,
  content: [{ id: "paragraph", type: "paragraph", content: [{ id: "text", type: "text", text: "Hello @al", marks: [] }] }],
};
const selection: RichTextSelection = { kind: "range", ranges: [{ anchor: { kind: "text", nodeId: "text", offset: 9, affinity: "forward" }, focus: { kind: "text", nodeId: "text", offset: 9, affinity: "forward" } }], primaryIndex: 0 };
const candidates = [{ id: "alpha", label: "Alpha" }, { id: "beta", label: "Beta" }, { id: "disabled", label: "Alpine", disabled: true }];

describe("Rich Text suggestion contract", () => {
  test("finds a registered trigger and resolves matching candidates", () => {
    const trigger = findRichTextSuggestionTrigger(document, selection, ["@", "/"]);
    expect(trigger).toEqual({ trigger: "@", query: "al", range: { nodeId: "text", from: 6, to: 9 } });
    expect(resolveRichTextSuggestions(trigger, candidates).map((item) => item.id)).toEqual(["alpha", "disabled"]);
  });

  test("keeps dismissal scoped to one trigger context and falls back to an enabled active item", () => {
    const trigger = findRichTextSuggestionTrigger(document, selection, ["@"]);
    const initial = reconcileRichTextSuggestionState(INITIAL_RICH_TEXT_SUGGESTION_STATE, trigger, candidates);
    expect(initial).toMatchObject({ open: true, activeId: "alpha" });
    const active = activateRichTextSuggestion(initial, trigger, "disabled");
    expect(reconcileRichTextSuggestionState(active, trigger, candidates).activeId).toBe("alpha");
    const dismissed = dismissRichTextSuggestions(active, trigger);
    expect(reconcileRichTextSuggestionState(dismissed, trigger, candidates).open).toBe(false);
    const reopened = reopenRichTextSuggestions(dismissed, trigger);
    expect(reconcileRichTextSuggestionState(reopened, trigger, candidates).open).toBe(true);
  });
});
