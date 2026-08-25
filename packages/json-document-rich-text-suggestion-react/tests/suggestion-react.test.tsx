import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useRichTextSuggestion } from "../src/index.js";

afterEach(cleanup);

describe("Rich Text suggestion React binding", () => {
  test("keeps focus on the editable combobox and owns keyboard, pointer, ARIA, and dismissal", async () => {
    const action = vi.fn();
    const candidates = [{ id: "alpha", label: "Alpha" }, { id: "beta", label: "Beta" }];
    function Harness() {
      const binding = useRichTextSuggestion({
        id: "mentions",
        label: "Mentions",
        trigger: { trigger: "@", query: "", range: { nodeId: "text", from: 0, to: 1 } },
        candidates,
        onAction: action,
      });
      return <>
        <div contentEditable aria-label="Editor" {...binding.referenceProps} />
        {binding.open ? <div {...binding.listboxProps}>{binding.items.map((item) => <button key={item.id} {...binding.optionProps(item)}>{item.label}</button>)}</div> : null}
      </>;
    }
    render(<Harness />);
    const editor = screen.getByRole("combobox", { name: "Editor" });
    editor.focus();
    expect(editor.getAttribute("aria-autocomplete")).toBe("list");
    expect(editor.getAttribute("aria-activedescendant")).toBe("mentions-option-alpha");
    await userEvent.keyboard("{ArrowDown}");
    expect(editor.getAttribute("aria-activedescendant")).toBe("mentions-option-beta");
    expect(document.activeElement).toBe(editor);
    await userEvent.keyboard(" ");
    expect(action).not.toHaveBeenCalled();
    await userEvent.keyboard("{Enter}");
    expect(action).toHaveBeenCalledWith(candidates[1], expect.objectContaining({ trigger: "@" }));
    await userEvent.keyboard("{Escape}");
    expect(editor.getAttribute("aria-expanded")).toBe("false");
  });
});
