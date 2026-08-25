import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { RichTextEditor } from "@interactive-os/json-document-rich-text";
import { ComposerReferenceAtom, useComposerCommandMenu } from "../src/index.js";

afterEach(cleanup);

describe("Composer React integration", () => {
  test("owns suggestion resolution, active-item fallback, keyboard action, and insertion", async () => {
    const dispatch = vi.fn((_intent: unknown) => ({ ok: true }));
    const editor = { dispatch: dispatch as unknown as RichTextEditor["dispatch"] } as RichTextEditor;
    const trigger = { kind: "mention" as const, query: "al", range: { nodeId: "text", from: 0, to: 3 } };
    const suggestions = [
      { id: "alpha", kind: "mention" as const, label: "Alpha", description: "First" },
      { id: "beta", kind: "mention" as const, label: "Beta", description: "Second" },
      { id: "skill", kind: "skill" as const, label: "Alpha skill", description: "Third" },
    ];
    const ids = ["atom", "space"];

    function Harness() {
      const menu = useComposerCommandMenu({
        id: "commands",
        label: "Commands",
        editor,
        trigger,
        suggestions,
        createId: () => ids.shift()!,
      });
      return <>
        <input aria-label="Composer" {...menu.referenceProps} />
        <div {...menu.listboxProps}>
          {menu.items.map((item) => <button key={item.id} {...menu.optionProps(item)}>{item.label}</button>)}
        </div>
        <output>{menu.activeItem?.id}</output>
      </>;
    }

    render(<Harness />);
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Alpha"]);
    expect(screen.getByText("alpha")).toBeTruthy();
    await userEvent.setup().type(screen.getByRole("textbox", { name: "Composer" }), "{Enter}");
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch.mock.calls[1]?.[0]).toMatchObject({ type: "clipboard.paste" });
  });

  test("projects canonical mention and skill atoms without product styling", () => {
    render(<>
      <ComposerReferenceAtom node={{ id: "mention", type: "os.interactive/mention", attrs: { entityId: "alpha", label: "Alpha" } }} className="product-atom" />
      <ComposerReferenceAtom node={{ id: "skill", type: "os.interactive/skill", attrs: { skillId: "summary", label: "Summary" } }} />
    </>);
    expect(screen.getByText("@Alpha").dataset).toMatchObject({ composerReferenceKind: "mention", richTextNodeId: "mention" });
    expect(screen.getByText("@Alpha").className).toBe("product-atom");
    expect(screen.getByText("/Summary").dataset.composerReferenceKind).toBe("skill");
  });
});
