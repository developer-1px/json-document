import { afterEach, expect, test, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createTextEditor } from "@interactive-os/json-document-editing";
import { plainTextDOMAdapter } from "@interactive-os/json-document-contenteditable";
import { createMarkdownEditingBinding } from "../src/index.js";

const disposals: Array<() => void> = [];
afterEach(() => { disposals.splice(0).forEach(dispose => dispose()); vi.useRealTimers(); document.getSelection()?.removeAllRanges(); document.body.replaceChildren(); });
function setup(source: string) {
  const root = document.createElement("div"); root.contentEditable = "true"; document.body.append(root);
  const editor = createTextEditor(createJSONDocument(source));
  const binding = createMarkdownEditingBinding({editor, root});
  const dispose = binding.bind(); disposals.push(dispose);
  const select = (focus: number) => { editor.select({anchor:focus,focus}); plainTextDOMAdapter.restoreSelection(root,{anchor:focus,focus}); };
  select(source.length);
  return {root, editor, dispose, select};
}
test("direct binding continues and exits quotes using existing Undo and releases input listeners", () => {
  const {root, editor, dispose} = setup("> first");
  const enter = () => root.dispatchEvent(new InputEvent("beforeinput", {inputType:"insertParagraph",cancelable:true}));
  enter(); expect(editor.text).toBe("> first\n> ");
  enter(); expect(editor.text).toBe("> first\n\n");
  editor.undo(); expect(editor.text).toBe("> first\n> ");
  editor.redo(); expect(editor.text).toBe("> first\n\n");
  dispose(); enter(); expect(editor.text).toBe("> first\n\n");
});
test("IME-confirmed quote source uses the same Markdown Enter command", () => {
  vi.useFakeTimers();
  const {root, editor} = setup("> ");
  root.dispatchEvent(new CompositionEvent("compositionstart"));
  root.replaceChildren(document.createTextNode("> 한"));
  plainTextDOMAdapter.restoreSelection(root,{anchor:3,focus:3});
  root.dispatchEvent(new KeyboardEvent("keydown", {key:"Enter",code:"Enter",isComposing:true,cancelable:true}));
  root.dispatchEvent(new CompositionEvent("compositionend", {data:"한"}));
  vi.runAllTimers();
  expect(editor.text).toBe("> 한\n> ");
  editor.undo(); expect(editor.text).toBe("> 한");
  editor.undo(); expect(editor.text).toBe("> ");
});
