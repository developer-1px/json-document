import { afterEach, describe, expect, test, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createTextEditor } from "@interactive-os/json-document-editing";
import { createContentEditableBinding, plainTextDOMAdapter } from "../src/index.js";

const cleanup: Array<() => void> = [];
afterEach(() => {
  cleanup.splice(0).forEach(dispose => dispose());
  vi.useRealTimers();
  document.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
});

function setup(source = "A **한글** B") {
  const json = createJSONDocument({ source });
  const editor = createTextEditor(json, "/source");
  const root = document.createElement("div");
  root.setAttribute("contenteditable", "true");
  document.body.append(root);
  const binding = createContentEditableBinding({ document: json, pointer: "/source", root, editor });
  cleanup.push(binding.bind());
  const select = (anchor: number, focus = anchor) => {
    plainTextDOMAdapter.restoreSelection(root, { anchor, focus });
    document.dispatchEvent(new Event("selectionchange"));
  };
  const native = (value: string, offset: number) => {
    plainTextDOMAdapter.render(root, value);
    plainTextDOMAdapter.restoreSelection(root, { anchor: offset, focus: offset });
  };
  return { json, editor, root, binding, select, native };
}

describe("source editor contenteditable lifecycle", () => {
  test.each(["", "\n", "a\n\n", "a\r\n"])("terminal caret boundary preserves source and offsets: %j", (source) => {
    const { root, editor, select } = setup(source);
    select(source.length, 0);
    expect(plainTextDOMAdapter.observe(root)).toEqual({ value: source, selection: { anchor: source.length, focus: 0 } });
    expect(root.textContent).toBe(source);
    expect(editor.snapshot.canUndo).toBe(false);
    // An ordinary native BR remains source text; only our caret boundary is ignored.
    root.insertBefore(document.createElement("br"), root.lastChild);
    expect(plainTextDOMAdapter.observe(root).value).toBe(source + "\n");
  });

  test("IME Enter confirms text then inserts one newline with restorable selection/history", () => {
    vi.useFakeTimers();
    const { editor, root, select, native } = setup("ab");
    select(1);
    root.dispatchEvent(new CompositionEvent("compositionstart"));
    native("a한b", 2);
    const enter = new KeyboardEvent("keydown", { key: "Enter", code: "Enter", isComposing: true, cancelable: true });
    root.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(false);
    expect(editor.text).toBe("ab");
    root.dispatchEvent(new CompositionEvent("compositionend", { data: "한" }));
    root.dispatchEvent(new InputEvent("input", { inputType: "insertFromComposition" }));
    root.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter" }));
    vi.runAllTimers();
    expect(editor.text).toBe("a한\nb");
    expect(plainTextDOMAdapter.observe(root).selection).toEqual({ anchor: 3, focus: 3 });
    editor.undo();
    expect(editor.text).toBe("a한b");
    expect(editor.snapshot.selection).toEqual({ anchor: 2, focus: 2 });
    editor.undo();
    expect(editor.text).toBe("ab");
    expect(editor.snapshot.selection).toEqual({ anchor: 1, focus: 1 });
    editor.redo();
    editor.redo();
    expect(editor.text).toBe("a한\nb");
    expect(editor.snapshot.selection).toEqual({ anchor: 3, focus: 3 });
  });

  test.each(["insertParagraph", "insertLineBreak"])("IME Enter owns %s before and after compositionend, then releases the next Enter", (inputType) => {
    vi.useFakeTimers();
    const { editor, root, select, native } = setup("ab");
    select(1);
    root.dispatchEvent(new CompositionEvent("compositionstart"));
    native("a한b", 2);
    // Some IMEs expose the physical Enter code while keyCode remains 229.
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Process", code: "Enter", keyCode: 229 }));
    const before = new InputEvent("beforeinput", { inputType, cancelable: true });
    root.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(true);
    root.dispatchEvent(new CompositionEvent("compositionend", { data: "한" }));
    const tail = new InputEvent("beforeinput", { inputType, cancelable: true });
    root.dispatchEvent(tail);
    expect(tail.defaultPrevented).toBe(true);
    root.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter" }));
    vi.runAllTimers();
    expect(editor.text).toBe("a한\nb");
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter" }));
    const next = new InputEvent("beforeinput", { inputType, cancelable: true });
    root.dispatchEvent(next);
    expect(next.defaultPrevented).toBe(true);
    expect(editor.text).toBe("a한\n\nb");
    expect(plainTextDOMAdapter.observe(root).selection).toEqual({ anchor: 4, focus: 4 });
  });
  test("a second Enter keydown from the same IME confirmation does not insert another newline", () => {
    const { editor, root, select, native } = setup("ab");
    select(1);
    root.dispatchEvent(new CompositionEvent("compositionstart"));
    native("a한b", 2);
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Process", code: "Enter", keyCode: 229 }));
    root.dispatchEvent(new CompositionEvent("compositionend", { data: "한" }));
    root.dispatchEvent(new InputEvent("input", { inputType: "insertFromComposition" }));
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter" }));
    root.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertParagraph", cancelable: true }));
    expect(editor.text).toBe("a한\nb");
    root.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter" }));
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter" }));
    root.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertParagraph", cancelable: true }));
    expect(editor.text).toBe("a한\n\nb");
  });

  test.each(["insertParagraph", "insertLineBreak"])("native %s during IME confirmation is not inserted twice", (inputType) => {
    const { editor, root, select, native } = setup("a\nb");
    select(1);
    root.dispatchEvent(new CompositionEvent("compositionstart"));
    native("a한\nb", 2);
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Process", code: "Enter", keyCode: 229 }));
    root.dispatchEvent(new InputEvent("beforeinput", { inputType, cancelable: false, isComposing: true }));
    native("a한\n\nb", 3);
    root.dispatchEvent(new InputEvent("input", { inputType, isComposing: true }));
    root.dispatchEvent(new CompositionEvent("compositionend", { data: "한" }));
    root.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter" }));
    expect(editor.text).toBe("a한\n\nb");
    expect(editor.snapshot.selection).toEqual({ anchor: 3, focus: 3 });
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter" }));
    root.dispatchEvent(new InputEvent("beforeinput", { inputType, cancelable: true }));
    expect(editor.text).toBe("a한\n\n\nb");
    editor.undo();
    expect(editor.text).toBe("a한\n\nb");
  });

  test.each(["insertParagraph", "insertLineBreak"])("recorded IME keyup replay does not duplicate %s or its undo entry", (inputType) => {
    const { editor, root, select, native } = setup("ab");
    const enter = (type: string, timeStamp: number, keyCode: number) => {
      const event = new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode, cancelable: true });
      Object.defineProperty(event, "timeStamp", { value: timeStamp });
      root.dispatchEvent(event);
    };
    select(1);
    root.dispatchEvent(new CompositionEvent("compositionstart"));
    native("a한b", 2);
    // Recording 71f515b3: all three keyboard events have timestamp 5998.4.
    enter("keydown", 5998.4, 229);
    root.dispatchEvent(new CompositionEvent("compositionend", { data: "한" }));
    enter("keyup", 5998.4, 13);
    enter("keydown", 5998.4, 13);
    const paragraph = new InputEvent("beforeinput", { inputType, cancelable: true });
    root.dispatchEvent(paragraph);
    enter("keyup", 6098.7, 13);
    expect(paragraph.defaultPrevented).toBe(true);
    expect(editor.text).toBe("a한\nb");
    expect(editor.snapshot.selection).toEqual({ anchor: 3, focus: 3 });
    editor.undo();
    expect(editor.text).toBe("a한b");
    editor.redo();
    expect(editor.text).toBe("a한\nb");
    enter("keydown", 6098.71, 13);
    root.dispatchEvent(new InputEvent("beforeinput", { inputType, cancelable: true }));
    expect(editor.text).toBe("a한\n\nb");
  });

  test("a distinct Enter timestamp after the matching release is not swallowed", () => {
    const { editor, root, select, native } = setup("ab");
    const enter = (type: string, timeStamp: number, keyCode: number, repeat = false) => {
      const event = new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode, repeat, cancelable: true });
      Object.defineProperty(event, "timeStamp", { value: timeStamp });
      root.dispatchEvent(event);
    };
    select(1);
    root.dispatchEvent(new CompositionEvent("compositionstart"));
    native("a한b", 2);
    enter("keydown", 100, 229);
    root.dispatchEvent(new CompositionEvent("compositionend", { data: "한" }));
    enter("keyup", 100, 13);
    // No debounce interval: even a 0.01 ms difference is a new key press.
    enter("keydown", 100.01, 13);
    root.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertParagraph", cancelable: true }));
    expect(editor.text).toBe("a한\n\nb");
  });

  test("native rich formatting cannot create state outside the source string", () => {
    const { root, editor } = setup();
    const event = new InputEvent("beforeinput", { inputType: "formatBold", bubbles: true, cancelable: true });
    root.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(editor.text).toBe("A **한글** B");
    expect(editor.snapshot.canUndo).toBe(false);
  });
  test("refuses HTML-only paste instead of letting native DOM become another model", () => {
    const { root, editor } = setup();
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: {
      types: ["text/html"], getData: () => "<b>HTML only</b>", setData: () => {},
    } });
    root.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(editor.text).toBe("A **한글** B");
    expect(editor.snapshot.canUndo).toBe(false);
  });
  test("commits Korean composition once and restores source selection on keyboard undo/redo", () => {
    vi.useFakeTimers();
    const { json, editor, root, select, native } = setup();
    const committed = vi.fn();
    json.subscribe(committed);
    select(6, 4);
    root.dispatchEvent(new CompositionEvent("compositionstart"));
    native("A **하** B", 5);
    root.dispatchEvent(new InputEvent("input", { inputType: "insertCompositionText", isComposing: true }));
    expect(editor.text).toBe("A **한글** B");
    native("A **한국** B", 6);
    root.dispatchEvent(new CompositionEvent("compositionend", { data: "한국" }));
    root.dispatchEvent(new InputEvent("input", { inputType: "insertFromComposition" }));
    vi.runAllTimers();
    expect(committed).toHaveBeenCalledTimes(1);
    expect(editor.text).toBe("A **한국** B");
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true, cancelable: true }));
    expect(editor.text).toBe("A **한글** B");
    expect(plainTextDOMAdapter.observe(root).selection).toEqual({ anchor: 6, focus: 4 });
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true, shiftKey: true, cancelable: true }));
    expect(editor.text).toBe("A **한국** B");
    expect(plainTextDOMAdapter.observe(root).selection).toEqual({ anchor: 6, focus: 6 });
  });

  test("refuses stale native input and recovers the current source", () => {
    const { json, editor, root, binding, select, native } = setup();
    select(4);
    binding.handle(new CompositionEvent("compositionstart"));
    native("A **임시한글** B", 6);
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", isComposing: true }));
    json.commit([{ op: "replace", path: "/source", value: "external" }]);
    expect(root.textContent).toBe("A **임시한글** B");
    expect(binding.handle(new CompositionEvent("compositionend"))).toMatchObject({ ok: false, code: "text_source_stale" });
    expect(root.textContent).toBe("external");
    expect(editor.text).toBe("external");
    expect(editor.snapshot.canUndo).toBe(false);
  });

  test("blur cancels an unfinished lease without making a history entry", () => {
    const { editor, root, select, native } = setup();
    select(4);
    root.dispatchEvent(new CompositionEvent("compositionstart"));
    native("temporary", 9);
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", isComposing: true }));
    root.dispatchEvent(new FocusEvent("blur"));
    expect(root.textContent).toBe(editor.text);
    expect(editor.snapshot.canUndo).toBe(false);
  });

  test("cut writes literal source before deletion; failed writes preserve the document", () => {
    const { editor, root, select } = setup("**raw**\r\n");
    select(0, editor.text.length);
    const entries = new Map<string, string>();
    function cut(fail: boolean) {
      const event = new Event("cut", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: {
        types: ["text/plain"],
        getData: (type: string) => entries.get(type) ?? "",
        setData: (type: string, value: string) => { if (fail) throw new Error("write denied"); entries.set(type, value); },
      } });
      root.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    cut(true);
    expect(editor.text).toBe("**raw**\r\n");
    cut(false);
    expect(entries.get("text/plain")).toBe("**raw**\r\n");
    expect(editor.text).toBe("");
    editor.undo();
    expect(editor.text).toBe("**raw**\r\n");
    expect(editor.snapshot.selection).toEqual({ anchor: 0, focus: 9 });
  });
});

test("Mod+A selects the complete source including concealed leading and trailing text", () => {
  const root = document.createElement("div"); root.contentEditable = "true"; document.body.append(root);
  const source = "prefix body suffix";
  const doc = createJSONDocument(source);
  const editor = createTextEditor(doc);
  const dom = {
    ...plainTextDOMAdapter,
    render(root: HTMLElement, value: string) {
      const prefix = document.createElement("span"); prefix.hidden = true; prefix.textContent = value.slice(0, 7);
      const suffix = document.createElement("span"); suffix.hidden = true; suffix.textContent = value.slice(11);
      root.replaceChildren(prefix, document.createTextNode(value.slice(7, 11)), suffix);
    },
  };
  const binding = createContentEditableBinding({ document: doc, pointer: "", root, editor, dom });
  cleanup.push(binding.bind());
  for (let index = 0; index < 2; index++) {
    const event = new KeyboardEvent("keydown", { key: "a", metaKey: true, cancelable: true, bubbles: true });
    root.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(editor.snapshot.selection).toEqual({anchor: 0, focus: source.length});
    expect(editor.copy()).toBe(source);
    expect(plainTextDOMAdapter.observe(root).selection).toEqual({anchor: 0, focus: source.length});
  }
});

test("projected horizontal selection respects modifiers and composition ownership", () => {
  const json = createJSONDocument({source:"# title"});
  const editor = createTextEditor(json, "/source");
  const root = document.createElement("div"); document.body.append(root);
  const resolveHorizontalSelection = vi.fn(() => ({anchor:1, focus:1}));
  const binding = createContentEditableBinding({document:json, pointer:"/source", root, editor,
    dom:{...plainTextDOMAdapter, resolveHorizontalSelection}});
  cleanup.push(binding.bind());
  plainTextDOMAdapter.restoreSelection(root, {anchor:2, focus:2});
  const left = new KeyboardEvent("keydown", {key:"ArrowLeft", cancelable:true});
  binding.handle(left);
  expect(left.defaultPrevented).toBe(true);
  expect(editor.snapshot.selection).toEqual({anchor:1, focus:1});
  expect(editor.snapshot.canUndo).toBe(false);
  expect(resolveHorizontalSelection).toHaveBeenLastCalledWith(root, {anchor:2, focus:2}, "backward", false);
  resolveHorizontalSelection.mockClear();
  for (const modifiers of [{metaKey:true}, {ctrlKey:true}, {altKey:true}, {isComposing:true}, {keyCode:229}]) {
    const key = new KeyboardEvent("keydown", {key:"ArrowLeft", cancelable:true, ...modifiers});
    binding.handle(key);
    expect(key.defaultPrevented).toBe(false);
  }
  binding.handle(new CompositionEvent("compositionstart"));
  binding.handle(new KeyboardEvent("keydown", {key:"ArrowLeft", cancelable:true}));
  expect(resolveHorizontalSelection).not.toHaveBeenCalled();
  binding.cancel();
});

test("projected deletion preserves the original caret in Undo and yields to composition", () => {
  const json = createJSONDocument({source:"## title\n\n**body**"});
  const editor = createTextEditor(json, "/source");
  const root = document.createElement("div"); document.body.append(root);
  const resolveDeletionSelection = vi.fn(() => ({anchor:2, focus:3}));
  const binding = createContentEditableBinding({document:json, pointer:"/source", root, editor,
    dom:{...plainTextDOMAdapter, resolveDeletionSelection}});
  cleanup.push(binding.bind());
  plainTextDOMAdapter.restoreSelection(root, {anchor:3, focus:3});
  const input = new InputEvent("beforeinput", {inputType:"deleteContentBackward", cancelable:true});
  binding.handle(input);
  expect(input.defaultPrevented).toBe(true);
  expect(editor.text).toBe("##title\n\n**body**");
  editor.undo();
  expect(editor.text).toBe("## title\n\n**body**");
  expect(editor.snapshot.selection).toEqual({anchor:3, focus:3});
  resolveDeletionSelection.mockClear();
  binding.handle(new CompositionEvent("compositionstart"));
  const composing = new InputEvent("beforeinput", {inputType:"deleteContentBackward", cancelable:true, isComposing:true});
  binding.handle(composing);
  expect(composing.defaultPrevented).toBe(false);
  expect(resolveDeletionSelection).not.toHaveBeenCalled();
  binding.cancel();
});
