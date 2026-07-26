import { describe, expect, test } from "vitest";
import * as z from "zod";

import { createJSONDocument, type TextSurface } from "@interactive-os/json-document/session";
import {
  JSON_ATOM_ATTRIBUTE,
  JSON_ATOM_REPLACEMENT,
  JSON_DOCUMENT_CONTENTEDITABLE_MIME,
  JSON_TEXT_ATTRIBUTE,
  createContentEditableAdapter,
} from "../src/index.js";

const AtomSchema = z.object({
  type: z.literal("mention"),
  label: z.string(),
  offset: z.number().int().nonnegative(),
});

const MarkSchema = z.object({
  type: z.literal("bold"),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

const Schema = z.object({
  body: z.string(),
  atoms: z.record(z.string(), AtomSchema),
  marks: z.record(z.string(), MarkSchema),
});

const surface: TextSurface = {
  textPath: "/body",
  atomsPath: "/atoms",
  rangesPath: "/marks",
};

function createDoc(value: z.output<typeof Schema> = {
  body: `Plain text ${JSON_ATOM_REPLACEMENT}`,
  atoms: {
    ada: { type: "mention" as const, label: "@Ada", offset: 11 },
  },
  marks: {},
}) {
  return createJSONDocument(Schema, value, {
    history: 20,
    selection: true,
    trustedInitial: true,
  });
}

function createRoot(): HTMLElement {
  document.body.replaceChildren();
  const root = document.createElement("div");
  document.body.append(root);
  return root;
}

function render(root: HTMLElement, value: z.output<typeof Schema>) {
  root.replaceChildren();
  const host = document.createElement("div");
  host.setAttribute(JSON_TEXT_ATTRIBUTE, "/body");
  for (let offset = 0; offset < value.body.length; offset += 1) {
    const atom = Object.entries(value.atoms).find((entry) => entry[1].offset === offset);
    if (value.body[offset] === JSON_ATOM_REPLACEMENT && atom !== undefined) {
      const [id, record] = atom;
      const element = document.createElement("span");
      element.setAttribute(JSON_ATOM_ATTRIBUTE, id);
      element.contentEditable = "false";
      element.textContent = record.label;
      host.append(element);
    } else {
      host.append(document.createTextNode(value.body[offset] ?? ""));
    }
  }
  root.append(host);
}

function selectText(root: HTMLElement, start: number, end: number) {
  const host = root.querySelector(`[${JSON_TEXT_ATTRIBUTE}]`);
  if (!(host instanceof HTMLElement)) throw new Error("missing text host");
  const anchor = locateTextPosition(host, start);
  const focus = locateTextPosition(host, end);
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.collapse(anchor.node, anchor.offset);
  selection?.extend(focus.node, focus.offset);
}

function locateTextPosition(element: HTMLElement, target: number): { node: Node; offset: number } {
  let remaining = target;
  const visit = (node: Node): { node: Node; offset: number } | null => {
    if (node instanceof HTMLElement && node.hasAttribute(JSON_ATOM_ATTRIBUTE)) {
      const parent = node.parentNode;
      if (parent === null) return null;
      const index = Array.from(parent.childNodes).indexOf(node);
      if (remaining <= 0) return { node: parent, offset: index };
      if (remaining <= 1) return { node: parent, offset: index + 1 };
      remaining -= 1;
      return null;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) return { node, offset: remaining };
      remaining -= length;
      return null;
    }
    for (const child of Array.from(node.childNodes)) {
      const found = visit(child);
      if (found !== null) return found;
    }
    return null;
  };
  return visit(element) ?? { node: element, offset: element.childNodes.length };
}

function createClipboardEvent(type: string): ClipboardEvent {
  const store = new Map<string, string>();
  const event = new Event(type, { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", {
    value: {
      getData: (name: string) => store.get(name) ?? "",
      setData: (name: string, value: string) => {
        store.set(name, value);
      },
    },
  });
  return event;
}

describe("@interactive-os/json-document-contenteditable-web", () => {
  test("flushes native text input into a json-document transaction", () => {
    const doc = createDoc();
    const root = createRoot();
    render(root, doc.value);
    const adapter = createContentEditableAdapter({ document: doc, root, surface });

    selectText(root, 5, 5);
    adapter.handle(new InputEvent("beforeinput", { inputType: "insertText", bubbles: true }));
    const host = root.querySelector(`[${JSON_TEXT_ATTRIBUTE}]`);
    if (!(host instanceof HTMLElement)) throw new Error("missing text host");
    host.textContent = `Plain! text ${JSON_ATOM_REPLACEMENT}`;
    adapter.handle(new InputEvent("input", { inputType: "insertText", bubbles: true }));

    expect(doc.value.body).toBe(`Plain! text ${JSON_ATOM_REPLACEMENT}`);
    expect(doc.value.atoms.ada?.offset).toBe(12);
    expect(doc.canUndo()).toEqual({ ok: true });
  });

  test("commits IME-style composition without intermediate model writes", () => {
    const doc = createDoc({ body: "", atoms: {}, marks: {} });
    const root = createRoot();
    render(root, doc.value);
    const adapter = createContentEditableAdapter({ document: doc, root, surface });

    selectText(root, 0, 0);
    adapter.handle(new CompositionEvent("compositionstart", { bubbles: true }));
    const host = root.querySelector(`[${JSON_TEXT_ATTRIBUTE}]`);
    if (!(host instanceof HTMLElement)) throw new Error("missing text host");
    host.textContent = "한";
    expect(doc.value.body).toBe("");

    adapter.handle(new CompositionEvent("compositionend", { bubbles: true }));

    expect(doc.value.body).toBe("한");
  });

  test("restores DOM selection direction after rerendered wrappers", () => {
    const doc = createDoc({ body: "Plain text", atoms: {}, marks: {} });
    const root = createRoot();
    render(root, doc.value);
    const adapter = createContentEditableAdapter({ document: doc, root, surface });

    selectText(root, 5, 0);
    const selection = adapter.syncSelectionFromDOM();
    const host = root.querySelector(`[${JSON_TEXT_ATTRIBUTE}]`);
    if (!(host instanceof HTMLElement)) throw new Error("missing text host");
    host.innerHTML = "<strong>Plain</strong> text";

    expect(adapter.restoreSelectionToDOM(selection ?? undefined)).toBe(true);
    expect(document.getSelection()?.toString()).toBe("Plain");
    expect(document.getSelection()?.isCollapsed).toBe(false);
  });

  test("maps atom elements as one model character", () => {
    const doc = createDoc();
    const root = createRoot();
    render(root, doc.value);
    const adapter = createContentEditableAdapter({ document: doc, root, surface });
    const atom = root.querySelector(`[${JSON_ATOM_ATTRIBUTE}]`);
    if (!(atom instanceof HTMLElement)) throw new Error("missing atom");

    const range = document.createRange();
    range.setStartBefore(atom);
    range.setEndAfter(atom);
    const domSelection = document.getSelection();
    domSelection?.removeAllRanges();
    domSelection?.addRange(range);

    const selection = adapter.syncSelectionFromDOM();

    expect(selection?.selectionRanges[0]).toMatchObject({
      anchor: { path: "/body", offset: 11 },
      focus: { path: "/body", offset: 12 },
    });
  });

  test("copies and pastes structured text surface fragments", () => {
    const doc = createDoc({
      body: `Hi ${JSON_ATOM_REPLACEMENT}`,
      atoms: {
        ada: { type: "mention", label: "@Ada", offset: 3 },
      },
      marks: {
        bold: { type: "bold", start: 0, end: 2 },
      },
    });
    const root = createRoot();
    render(root, doc.value);
    const adapter = createContentEditableAdapter({ document: doc, root, surface });

    selectText(root, 0, 4);
    const copyEvent = createClipboardEvent("copy");
    expect(adapter.copy(copyEvent)).toMatchObject({ ok: true });
    expect(JSON.parse(copyEvent.clipboardData?.getData(JSON_DOCUMENT_CONTENTEDITABLE_MIME) ?? "{}"))
      .toMatchObject({
        text: `Hi ${JSON_ATOM_REPLACEMENT}`,
        atoms: { ada: { offset: 3 } },
        ranges: { bold: { start: 0, end: 2 } },
      });

    selectText(root, 0, 0);
    adapter.syncSelectionFromDOM();
    const pasteEvent = createClipboardEvent("paste");
    pasteEvent.clipboardData?.setData(
      JSON_DOCUMENT_CONTENTEDITABLE_MIME,
      copyEvent.clipboardData?.getData(JSON_DOCUMENT_CONTENTEDITABLE_MIME) ?? "",
    );

    expect(adapter.paste(pasteEvent)).toMatchObject({ ok: true });
    expect(doc.value.body).toBe(`Hi ${JSON_ATOM_REPLACEMENT}Hi ${JSON_ATOM_REPLACEMENT}`);
    expect(Object.values(doc.value.atoms).map((atom) => atom.offset).sort((a, b) => a - b))
      .toEqual([3, 7]);
  });

  test("pastes plain text at the current document selection", () => {
    const doc = createDoc({ body: "Plain text", atoms: {}, marks: {} });
    const root = createRoot();
    render(root, doc.value);
    const adapter = createContentEditableAdapter({ document: doc, root, surface });

    selectText(root, 0, 5);
    adapter.syncSelectionFromDOM();
    const pasteEvent = createClipboardEvent("paste");
    pasteEvent.clipboardData?.setData("text/plain", "Rich");

    expect(adapter.paste(pasteEvent)).toMatchObject({ ok: true });
    expect(doc.value.body).toBe("Rich text");
    expect(doc.selection?.focus).toMatchObject({ path: "/body", offset: 4 });
  });

  test("dispatches clipboard paste events through handle", () => {
    const doc = createDoc({ body: "Plain text", atoms: {}, marks: {} });
    const root = createRoot();
    render(root, doc.value);
    const adapter = createContentEditableAdapter({ document: doc, root, surface });

    selectText(root, 6, 10);
    adapter.syncSelectionFromDOM();
    const pasteEvent = createClipboardEvent("paste");
    pasteEvent.clipboardData?.setData("text/plain", "body");

    expect(adapter.handle(pasteEvent)).toMatchObject({ ok: true, kind: "text" });
    expect(pasteEvent.defaultPrevented).toBe(true);
    expect(doc.value.body).toBe("Plain body");
  });

  test("falls back to plain text when structured clipboard data is malformed", () => {
    const doc = createDoc({ body: "Plain text", atoms: {}, marks: {} });
    const root = createRoot();
    render(root, doc.value);
    const adapter = createContentEditableAdapter({ document: doc, root, surface });

    selectText(root, 0, 5);
    adapter.syncSelectionFromDOM();
    const pasteEvent = createClipboardEvent("paste");
    pasteEvent.clipboardData?.setData(
      JSON_DOCUMENT_CONTENTEDITABLE_MIME,
      JSON.stringify({ text: "Bad", atoms: [] }),
    );
    pasteEvent.clipboardData?.setData("text/plain", "Safe");

    expect(adapter.paste(pasteEvent)).toMatchObject({ ok: true });
    expect(doc.value.body).toBe("Safe text");
  });
});
