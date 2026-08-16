import { createJSONDocument } from "@interactive-os/json-document";
import {
  createRichTextEditor,
  type RichTextDocument,
} from "@interactive-os/json-document-rich-text";
import { describe, expect, it } from "vitest";
import { createRichTextContentEditableBinding } from "../src/index.js";

describe("Official Rich Text contenteditable composition", () => {
  it("reconciles native Korean DOM composition once and keeps one undo step", async () => {
    const document = createJSONDocument(initialDocument());
    const editor = createRichTextEditor({
      document,
      selection: collapsed("text", 3),
    });
    const root = fixture();
    const compositionStates: boolean[] = [];
    const binding = createRichTextContentEditableBinding({
      root,
      editor,
      onCompositionChange: (composing) => compositionStates.push(composing),
    });
    const text = root.querySelector("[data-rich-text-text-id='text']")!.firstChild as Text;
    window.getSelection()!.setBaseAndExtent(text, 3, text, 3);

    root.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    expect(binding.isComposing()).toBe(true);
    mutateComposition(text, 3, 0, "ㅎ");
    mutateComposition(text, 3, 1, "하");
    mutateComposition(text, 3, 1, "한");
    root.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "한" }));
    root.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromComposition", data: "한" }));
    await Promise.resolve();

    expect(binding.isComposing()).toBe(false);
    expect((document.value as RichTextDocument).content[0]).toMatchObject({
      content: [{ id: "text", text: "abc한" }],
    });
    expect(compositionStates).toEqual([true, false]);
    expect(editor.snapshot.selection.ranges[0]?.focus).toMatchObject({ nodeId: "text", offset: 4 });

    expect(editor.undo().ok).toBe(true);
    expect((document.value as RichTextDocument).content[0]).toMatchObject({
      content: [{ id: "text", text: "abc" }],
    });
    binding.destroy();
  });

  it("treats a composition that restores the original DOM as cancellation", async () => {
    const document = createJSONDocument(initialDocument());
    const editor = createRichTextEditor({ document, selection: collapsed("text", 3) });
    const root = fixture();
    const binding = createRichTextContentEditableBinding({ root, editor });
    const text = root.querySelector("[data-rich-text-text-id='text']")!.firstChild as Text;
    window.getSelection()!.setBaseAndExtent(text, 3, text, 3);

    root.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    mutateComposition(text, 3, 0, "ㅎ");
    mutateComposition(text, 3, 1, "");
    root.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "" }));
    await Promise.resolve();

    expect(document.value).toEqual(initialDocument());
    expect(editor.snapshot.canUndo).toBe(false);
    binding.destroy();
  });

  it("does not report unsupported collapsed word and line deletion as a successful removal", () => {
    const document = createJSONDocument(initialDocument());
    const editor = createRichTextEditor({ document, selection: collapsed("text", 3) });
    const root = fixture();
    const actions: string[] = [];
    const binding = createRichTextContentEditableBinding({
      root,
      editor,
      onAction: (action) => actions.push(action),
    });
    const text = root.querySelector("[data-rich-text-text-id='text']")!.firstChild as Text;
    window.getSelection()!.setBaseAndExtent(text, 3, text, 3);

    for (const inputType of [
      "deleteWordBackward",
      "deleteWordForward",
      "deleteSoftLineBackward",
      "deleteSoftLineForward",
      "deleteHardLineBackward",
      "deleteHardLineForward",
    ]) {
      const event = new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType });
      root.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }

    expect(actions).toEqual(Array.from({ length: 6 }, () => "rich-text.intent-unsupported"));
    expect(document.value).toEqual(initialDocument());
    binding.destroy();
  });

  it("reconciles composition from the composing text node instead of the editable root", async () => {
    const document = createJSONDocument({
      ...initialDocument(),
      content: [
        initialDocument().content[0]!,
        { id: "noise", type: "paragraph", content: [{ id: "noise-text", type: "text", text: "x".repeat(10_000), marks: [] }] },
      ],
    });
    const editor = createRichTextEditor({ document, selection: collapsed("text", 3) });
    const root = fixture();
    const noise = root.ownerDocument.createElement("p");
    noise.dataset.richTextNodeId = "noise";
    noise.innerHTML = `<span data-rich-text-node-id="noise-text" data-rich-text-text-id="noise-text">${"x".repeat(10_000)}</span>`;
    root.append(noise);
    const binding = createRichTextContentEditableBinding({ root, editor });
    const text = root.querySelector("[data-rich-text-text-id='text']")!.firstChild as Text;
    window.getSelection()!.setBaseAndExtent(text, 3, text, 3);
    root.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    mutateComposition(text, 3, 0, "한");
    root.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "한" }));
    await Promise.resolve();
    const value = document.value as RichTextDocument;
    expect(value.content[0]).toMatchObject({
      content: [{ id: "text", text: "abc한" }],
    });
    const noiseBlock = value.content[1];
    expect(noiseBlock && "content" in noiseBlock && Array.isArray(noiseBlock.content) ? noiseBlock.content[0] : undefined).toMatchObject({
      text: "x".repeat(10_000),
    });
    binding.destroy();
  });
});

function initialDocument(): RichTextDocument {
  return {
    profile: "urn:interactive-os:json-document:rich-text:1",
    id: "doc",
    type: "doc",
    content: [{
      id: "paragraph",
      type: "paragraph",
      content: [{ id: "text", type: "text", text: "abc", marks: [] }],
    }],
  };
}

function collapsed(nodeId: string, offset: number) {
  const point = { kind: "text" as const, nodeId, offset, affinity: "forward" as const };
  return { kind: "range" as const, ranges: [{ anchor: point, focus: point }], primaryIndex: 0 };
}

function fixture(): HTMLElement {
  document.body.innerHTML = '<article contenteditable="true" data-rich-text-container-id="doc"><p data-rich-text-node-id="paragraph" data-rich-text-container-id="paragraph"><span data-rich-text-node-id="text" data-rich-text-text-id="text">abc</span></p></article>';
  return document.querySelector("article")!;
}

function mutateComposition(text: Text, offset: number, previousLength: number, value: string): void {
  const current = text.nodeValue ?? "";
  text.nodeValue = current.slice(0, offset) + value + current.slice(offset + previousLength);
  window.getSelection()!.setBaseAndExtent(text, offset + value.length, text, offset + value.length);
}
