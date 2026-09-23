import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { RichTextMentionAtom, RichTextMentionSuggestions } from "../src/index.js";

afterEach(cleanup);

describe("Rich Text mention React projection", () => {
  test("projects canonical mention data without product styling", () => {
    render(<RichTextMentionAtom node={{ id: "mention", type: "os.interactive/mention", attrs: { entityId: "alpha", label: "Alpha" } }} className="product-mention" />);
    const mention = screen.getByText("Alpha").closest<HTMLElement>("[data-rich-text-mention]")!;
    expect(mention.className).toBe("product-mention");
    expect(mention.dataset).toMatchObject({ richTextMention: "", richTextNodeId: "mention" });
    expect(mention.getAttribute("contenteditable")).toBe("false");
  });

  test("renders candidate identity, description, and active option state", () => {
    const item = { id: "research", label: "Research", description: "Find sources", iconText: "R" };
    render(<RichTextMentionSuggestions binding={{
      items: [item], activeItem: item, open: true,
      referenceProps: { role: "combobox", "aria-autocomplete": "list", "aria-haspopup": "listbox", "aria-controls": "mentions", "aria-expanded": true, onKeyDown: () => {}, onFocus: () => {}, onBlur: () => {} },
      listboxProps: { id: "mentions", role: "listbox", "aria-label": "Mentions" },
      optionProps: () => ({ id: "mentions-option-research", type: "button", role: "option", "aria-selected": true }),
      dismiss: () => {}, reopen: () => {},
    }} groupLabel="Agents" />);
    expect(screen.getByRole("listbox", { name: "Mentions" })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Research/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Find sources")).toBeTruthy();
  });
});
