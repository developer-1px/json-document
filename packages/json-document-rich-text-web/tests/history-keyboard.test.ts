import { createJSONDocument } from "@interactive-os/json-document";
import { createRichTextEditor, type RichTextDocument, type RichTextSelection } from "@interactive-os/json-document-rich-text";
import { afterEach, expect, test } from "vitest";
import { createRichTextContentEditableBinding } from "../src/index.js";

const initial: RichTextDocument = {
  profile: "urn:interactive-os:json-document:rich-text:1", id: "doc", type: "doc",
  content: [{ id: "p", type: "paragraph", content: [{ id: "t", type: "text", text: "Alpha", marks: [] }] }],
};
const range = (anchor: number, focus = anchor): RichTextSelection => ({
  kind: "range", primaryIndex: 0, ranges: [{
    anchor: { kind: "text", nodeId: "t", offset: anchor, affinity: "forward" },
    focus: { kind: "text", nodeId: "t", offset: focus, affinity: "forward" },
  }],
});
const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  document.body.replaceChildren();
});
function fixture(backward = false) {
  const editor = createRichTextEditor({ document: createJSONDocument(initial) });
  const root = document.createElement("article");
  root.contentEditable = "true";
  root.dataset.richTextContainerId = "doc";
  root.innerHTML = '<p data-rich-text-node-id="p" data-rich-text-container-id="p"><span data-rich-text-node-id="t" data-rich-text-text-id="t">Alpha</span></p>';
  document.body.append(root);
  const text = root.querySelector("span")!.firstChild!;
  document.getSelection()!.setBaseAndExtent(text, backward ? 4 : 2, text, backward ? 2 : 4);
  const actions: string[] = [];
  const binding = createRichTextContentEditableBinding({ root, editor, onAction: (action) => actions.push(action) });
  disposers.push(() => binding.destroy());
  root.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: "X" }));
  expect(editor.snapshot).toMatchObject({
    value: { content: [{ content: [{ id: "t", text: "AlXa" }] }] },
    selection: range(3), canUndo: true, canRedo: false,
  });
  return { root, editor, actions };
}
function key(target: HTMLElement, options: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", { key: "z", bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
}

test.each(["metaKey", "ctrlKey"] as const)("%s Undo/Redo restores directed selection through the real binding", (modifier) => {
  for (const backward of [false, true]) for (const moveAfterUndo of [false, true]) {
    const { root, editor, actions } = fixture(backward);
    const before = backward ? range(4, 2) : range(2, 4);
    expect(key(root, { [modifier]: true }).defaultPrevented).toBe(true);
    expect(editor.snapshot).toMatchObject({ value: initial, selection: before, canUndo: false, canRedo: true });
    if (moveAfterUndo) {
      editor.dispatch({ type: "selection.set", selection: range(0) });
      expect(editor.snapshot).toMatchObject({ selection: range(0), canUndo: false, canRedo: true });
    }
    expect(key(root, { [modifier]: true, shiftKey: true, key: "Z" }).defaultPrevented).toBe(true);
    expect(editor.snapshot).toMatchObject({
      value: { content: [{ content: [{ id: "t", text: "AlXa" }] }] },
      selection: range(3), canUndo: true, canRedo: false,
    });
    expect(actions.slice(-2)).toEqual(["undo", "redo"]);
  }
});

test.each(["metaKey", "ctrlKey"] as const)("%s preserves legacy Alt and composing modifier acceptance", (modifier) => {
  const { root, editor } = fixture();
  expect(key(root, { [modifier]: true, altKey: true, isComposing: true }).defaultPrevented).toBe(true);
  expect(editor.snapshot).toMatchObject({ value: initial, selection: range(2, 4), canRedo: true });
  expect(key(root, { [modifier]: true, altKey: true, shiftKey: true }).defaultPrevented).toBe(true);
  expect(editor.snapshot.selection).toEqual(range(3));
});

test("unmatched keys and nested controls never consume the outer history", () => {
  const { root, editor } = fixture();
  const before = editor.snapshot;
  for (const options of [{}, { altKey: true }, { metaKey: true, key: "x" }]) {
    expect(key(root, options).defaultPrevented).toBe(false);
  }
  for (const tag of ["input", "textarea", "select", "div"]) {
    const nested = document.createElement(tag);
    if (tag === "div") nested.setAttribute("contenteditable", "true");
    root.append(nested);
    expect(key(nested, { metaKey: true }).defaultPrevented).toBe(false);
  }
  expect(editor.snapshot).toEqual(before);
});
