import { afterEach, describe, expect, test, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import {
  createContentEditableBinding,
} from "../src/index.js";

function createRoot(): HTMLElement {
  const root = document.createElement("div");
  root.contentEditable = "true";
  document.body.append(root);
  return root;
}

function setEditableText(
  root: HTMLElement,
  value: string,
  anchor: number,
  focus = anchor,
): void {
  root.replaceChildren(document.createTextNode(value));
  const text = root.firstChild;
  if (!(text instanceof Text)) throw new Error("missing text node");
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.collapse(text, anchor);
  selection?.extend(text, focus);
}

function input(
  type: "beforeinput" | "input",
  inputType: string,
  isComposing = false,
): InputEvent {
  return new InputEvent(type, {
    bubbles: true,
    cancelable: type === "beforeinput",
    inputType,
    isComposing,
  });
}

afterEach(() => {
  vi.useRealTimers();
  document.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
});

describe("@interactive-os/json-document-contenteditable", () => {
  test("commits local input through the JSONDocument port", () => {
    const json = createJSONDocument({ title: "ab" });
    const root = createRoot();
    const adapter = createContentEditableBinding({
      document: json,
      pointer: "/title",
      root,
    });
    const unbind = adapter.bind();

    setEditableText(root, "ab", 1);
    root.dispatchEvent(input("beforeinput", "insertText"));
    setEditableText(root, "aXb", 2);
    root.dispatchEvent(input("input", "insertText"));

    expect(json.value).toEqual({ title: "aXb" });
    expect(root.textContent).toBe("aXb");
    unbind();
  });

  test("authors exactly one commit for a composition session", () => {
    const json = createJSONDocument({ title: "ab" });
    const root = createRoot();
    const adapter = createContentEditableBinding({
      document: json,
      pointer: "/title",
      root,
    });
    adapter.bind();

    setEditableText(root, "ab", 1);
    adapter.handle(new CompositionEvent("compositionstart"));
    setEditableText(root, "aXb", 2);
    adapter.handle(input("input", "insertCompositionText", true));
    expect(json.value).toEqual({ title: "ab" });

    expect(adapter.handle(new CompositionEvent("compositionend")))
      .toMatchObject({ ok: true, kind: "committed" });
    adapter.handle(input("input", "insertFromComposition"));

    expect(json.value).toEqual({ title: "aXb" });
    expect(root.textContent).toBe("aXb");
  });

  test("keeps another pointer's commit from replacing a leased root", () => {
    vi.useFakeTimers();
    const json = createJSONDocument({ title: "ab", note: "cd" });
    const titleRoot = createRoot();
    const noteRoot = createRoot();
    const title = createContentEditableBinding({
      document: json,
      pointer: "/title",
      root: titleRoot,
    });
    const note = createContentEditableBinding({
      document: json,
      pointer: "/note",
      root: noteRoot,
    });
    title.bind();
    note.bind();

    setEditableText(titleRoot, "ab", 1);
    title.handle(new CompositionEvent("compositionstart"));
    setEditableText(titleRoot, "aXb", 2);

    json.commit([{ op: "replace", path: "/note", value: "cYd" }]);

    expect(json.value).toEqual({ title: "ab", note: "cYd" });
    expect(titleRoot.textContent).toBe("aXb");
    expect(noteRoot.textContent).toBe("cYd");

    expect(title.handle(new CompositionEvent("compositionend")))
      .toMatchObject({ ok: true, kind: "committed" });
    expect(json.value).toEqual({ title: "aXb", note: "cYd" });
    expect(titleRoot.textContent).toBe("aXb");
  });

  test("renders the latest string after the lease ends", () => {
    const json = createJSONDocument({ title: "ab" });
    const root = createRoot();
    const adapter = createContentEditableBinding({
      document: json,
      pointer: "/title",
      root,
    });
    adapter.bind();

    setEditableText(root, "ab", 1);
    adapter.handle(new CompositionEvent("compositionstart"));
    setEditableText(root, "aXb", 2);
    expect(adapter.cancel()).toMatchObject({ ok: true, kind: "cancelled" });

    expect(root.textContent).toBe("ab");
    expect(json.value).toEqual({ title: "ab" });
  });

  test("fails closed when the bound pointer is not a string", () => {
    const json = createJSONDocument({ title: "ab" });
    const root = createRoot();
    const adapter = createContentEditableBinding({
      document: json,
      pointer: "/title",
      root,
    });
    adapter.bind();

    setEditableText(root, "ab", 1);
    adapter.handle(new CompositionEvent("compositionstart"));
    setEditableText(root, "aXb", 2);
    json.commit([{ op: "remove", path: "/title" }]);

    expect(adapter.handle(new CompositionEvent("compositionend")))
      .toMatchObject({ ok: false, code: "text_target_unavailable" });
    expect(root.textContent).toBe("");
    expect(json.value).toEqual({});
  });
});
