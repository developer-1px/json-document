import { createJSONDocument } from "@interactive-os/json-document";
import { createRangeSelectionFamily } from "@interactive-os/json-document-selection";
import { expect, test } from "vitest";
import { editingGrammar } from "../../../json-document-editing/tests/conformance/editing-grammar.js";
import {
  createRichTextEditor, type RichTextClipboard, type RichTextDocument,
  type RichTextPoint, type RichTextSelection, type RichTextTarget,
} from "../../src/index.js";

const initial: RichTextDocument = {
  profile: "urn:interactive-os:json-document:rich-text:1", id: "doc", type: "doc",
  content: [
    { id: "p", type: "paragraph", content: [{ id: "t", type: "text", text: "Alpha", marks: [] }] },
    { id: "q", type: "paragraph", content: [] },
  ],
};
const point = (offset: number): RichTextPoint => ({ kind: "text", nodeId: "t", offset, affinity: "forward" });
const range = (anchor: number, focus = anchor): RichTextSelection => ({
  kind: "range", ranges: [{ anchor: point(anchor), focus: point(focus) }], primaryIndex: 0,
});

test.each([
  { backward: false, moveAfterUndo: false }, { backward: true, moveAfterUndo: false },
  { backward: false, moveAfterUndo: true }, { backward: true, moveAfterUndo: true },
])("EG-HISTORY / replacement restores directed range ($backward), redo survives selection ($moveAfterUndo)", ({ backward, moveAfterUndo }) => {
  const editor = createRichTextEditor({ document: createJSONDocument(initial) });
  const before = backward ? range(4, 2) : range(2, 4);
  expect(editor.dispatch({ type: "selection.set", selection: before }).ok).toBe(true);
  expect(editor.dispatch({ type: "text.insert", text: "X" }).ok).toBe(true);
  const after = { ...initial, content: [
    { id: "p", type: "paragraph", content: [{ id: "t", type: "text", text: "AlXa", marks: [] }] },
    initial.content[1],
  ] };
  expect(editor.snapshot).toMatchObject({ value: after, selection: range(3), canUndo: true, canRedo: false });
  expect(editor.undo()).toMatchObject({ ok: true, snapshot: { value: initial, selection: before, canUndo: false, canRedo: true } });
  if (moveAfterUndo) {
    expect(editor.dispatch({ type: "selection.set", selection: range(0) })).toMatchObject({
      ok: true, snapshot: { value: initial, selection: range(0), canUndo: false, canRedo: true },
    });
  }
  expect(editor.redo()).toMatchObject({ ok: true, snapshot: { value: after, selection: range(3), canUndo: true, canRedo: false } });
});

editingGrammar("Rich Text v1 / inline slice / local history", () => {
  const document = createJSONDocument(initial);
  let id = 0;
  const editor = createRichTextEditor({ document, createId: () => `new-${++id}` });
  const family = createRangeSelectionFamily<RichTextPoint, RichTextTarget>();
  const clipboard: RichTextClipboard = {
    type: "application/vnd.interactive-os.rich-text+json", text: "lp", html: "",
    slice: { profile: initial.profile, openStart: 1, openEnd: 1, content: [
      { id: "t", type: "text", text: "lp", marks: [] },
    ] },
  };
  const withText = (text: string) => ({ ...initial, content: [
    { id: "p", type: "paragraph", content: [{ id: "t", type: "text", text, marks: [] }] },
    initial.content[1],
  ] });
  return {
    document, editor, clipboard,
    selectStart: () => editor.dispatch({ type: "selection.set", selection: range(1) }),
    extend() {
      const selection = family.transition(editor.snapshot.selection, { type: "extend-primary", point: point(3) }, { topology: editor.topology }).state;
      return editor.dispatch({ type: "selection.set", selection: selection as RichTextSelection });
    },
    assertSelected(selection) {
      expect(selection).toEqual(range(1, 3));
      expect(family.targets(selection, { topology: editor.topology })).toEqual([{ kind: "text", nodeId: "t", from: 1, to: 3 }]);
    },
    edit: () => editor.dispatch({ type: "text.insert", text: "!" }),
    assertEdited(snapshot) {
      expect(snapshot.value).toEqual(withText("!Alpha"));
      expect(snapshot.selection).toEqual(range(1));
    },
    paste: () => editor.dispatch({ type: "clipboard.paste", clipboard: {
      ...clipboard, text: "Z", slice: { ...clipboard.slice, content: [{ id: "source", type: "text", text: "Z", marks: [] }] },
    } }),
    assertPasted(snapshot) {
      // The surviving prefix keeps t; inserted text and split suffix get fresh IDs.
      expect(snapshot.value).toEqual({ ...initial, content: [
        { id: "p", type: "paragraph", content: [
          { id: "t", type: "text", text: "A", marks: [] },
          { id: "new-1", type: "text", text: "Z", marks: [] },
          { id: "new-2", type: "text", text: "ha", marks: [] },
        ] }, initial.content[1],
      ] });
      const after = { kind: "text", nodeId: "new-1", offset: 1, affinity: "forward" };
      expect(snapshot.selection).toEqual({ kind: "range", ranges: [{ anchor: after, focus: after }], primaryIndex: 0 });
    },
    assertCut(snapshot) {
      expect(snapshot.value).toEqual(withText("Aha"));
      expect(snapshot.selection).toEqual(range(1));
    },
    reject: () => editor.dispatch({ type: "node.insert", point: { kind: "child", nodeId: "doc", offset: 1, affinity: "forward" },
      node: { id: "duplicate-parent", type: "paragraph", content: [{ id: "t", type: "text", text: "duplicate", marks: [] }] },
    }),
    rejectionCode: "rich-text.duplicate-id",
    noop: () => editor.dispatch({ type: "text.insert", text: "" }),
    removeExternal() { expect(document.commit([{ op: "remove", path: "/content/0" }]).ok).toBe(true); },
    assertExternal(selection) { expect(selection).toEqual({ kind: "range", ranges: [], primaryIndex: null }); },
  };
});
