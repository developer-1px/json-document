import { createTextRuntime } from "@interactive-os/json-document-collaboration/text";
import { createCollaborationEditingHistory } from "@interactive-os/json-document-collaboration/editing";
import { createRichTextEditor, type RichTextDocument } from "@interactive-os/json-document-rich-text";
import { describe, expect, test } from "vitest";
import { createRichTextContentEditableBinding } from "../src/index.js";

describe("synthetic DOM history input uses the official selective history", () => {
  test.each(["toolbar", "Meta+Z", "Ctrl+Z", "beforeinput"])("%s preserves concurrent text and supports redo", (input) => {
    const initial: RichTextDocument = {
      profile: "urn:interactive-os:json-document:rich-text:1", id: "doc", type: "doc",
      content: [{ id: "p", type: "paragraph", content: [{ id: "t", type: "text", text: "abcd", marks: [] }] }],
    };
    const shared = { epochId: "web-history", ruleset: { id: "web-history", digest: "1" } };
    const local = createTextRuntime(initial, { ...shared, actorId: "local" });
    const remote = createTextRuntime(initial, { ...shared, actorId: "remote" });
    const point = { kind: "text" as const, nodeId: "t", offset: 2, affinity: "forward" as const };
    const editor = createRichTextEditor({ document: local.document, history: createCollaborationEditingHistory(local), selection: {
      kind: "range", ranges: [{ anchor: point, focus: point }], primaryIndex: 0,
    } });
    const root = document.createElement("div");
    root.setAttribute("contenteditable", "true");
    root.innerHTML = '<p data-rich-text-node-id="p"><span data-rich-text-text-id="t">abcd</span></p>';
    document.body.append(root);
    const text = root.querySelector("span")!.firstChild!;
    const render = editor.subscribe(() => {
      const located = local.document.at("/content/0/content/0/text");
      if (located.ok) text.textContent = String(located.value);
    });
    const binding = createRichTextContentEditableBinding({ root, editor });
    editor.dispatch({ type: "text.insert", text: "!" });
    remote.document.commit([{ op: "replace", path: "/content/0/content/0/text", value: "Xabcd" }]);
    local.replica.ingest(remote.replica.exportBundle());
    expect(text.textContent).toBe("Xab!cd");
    binding.restoreSelection();
    historyInput(false);
    expect(text.textContent).toBe("Xabcd");
    expect(editor.snapshot.canRedo).toBe(true);
    expect(editor.snapshot.selection.ranges[0]!.focus.offset).toBe(3);
    historyInput(true);
    expect(text.textContent).toBe("Xab!cd");
    expect(editor.snapshot.selection.ranges[0]!.focus.offset).toBe(4);
    binding.destroy();
    render();
    root.remove();

    function historyInput(redo: boolean) {
      if (input === "toolbar") {
        expect((redo ? editor.redo() : editor.undo()).ok).toBe(true);
        return;
      }
      const event = input === "beforeinput"
        ? new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: redo ? "historyRedo" : "historyUndo" })
        : new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "z",
          metaKey: input === "Meta+Z", ctrlKey: input === "Ctrl+Z", shiftKey: redo });
      root.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
  });
});
