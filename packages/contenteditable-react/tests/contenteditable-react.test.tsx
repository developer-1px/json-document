import { describe, expect, test, vi } from "vitest";
import * as z from "zod";
import {
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

import { createJSONDocument, type JSONDocument, type TextSurface } from "@interactive-os/json-document";
import {
  JSON_TEXT_ATTRIBUTE,
} from "@interactive-os/json-document-contenteditable-web";
import {
  useContentEditable,
  type UseContentEditableResult,
} from "../src/index.js";

const MarkSchema = z.object({
  type: z.literal("bold"),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

const Schema = z.object({
  body: z.string(),
  atoms: z.record(z.string(), z.never()),
  marks: z.record(z.string(), MarkSchema),
});

type Value = z.output<typeof Schema>;

const surface: TextSurface = {
  textPath: "/body",
  atomsPath: "/atoms",
  rangesPath: "/marks",
};

function createDoc() {
  return createJSONDocument(
    Schema,
    { body: "Plain text", atoms: {}, marks: {} },
    { history: 20, selection: true, trustedInitial: true },
  );
}

function renderContent(root: HTMLElement, value: Value) {
  root.replaceChildren();
  const host = document.createElement("div");
  host.setAttribute(JSON_TEXT_ATTRIBUTE, "/body");
  const bold = Object.values(value.marks).find((mark) => mark.type === "bold");
  if (bold === undefined) {
    host.textContent = value.body;
  } else {
    host.append(document.createTextNode(value.body.slice(0, bold.start)));
    const strong = document.createElement("strong");
    strong.textContent = value.body.slice(bold.start, bold.end);
    host.append(strong, document.createTextNode(value.body.slice(bold.end)));
  }
  root.append(host);
}

function Editor({
  doc,
  onReady,
}: {
  doc: JSONDocument<Value>;
  onReady(api: UseContentEditableResult<Value>, rootRef: RefObject<HTMLDivElement | null>): void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const api = useContentEditable({
    document: doc,
    rootRef,
    surface,
    renderContent,
  });

  useLayoutEffect(() => {
    onReady(api, rootRef);
  }, [api, onReady]);

  return (
    <div
      aria-label="editor"
      contentEditable={true}
      ref={rootRef}
      suppressContentEditableWarning={true}
    />
  );
}

function selectText(root: HTMLElement, start: number, end: number) {
  const host = root.querySelector(`[${JSON_TEXT_ATTRIBUTE}]`);
  if (!(host instanceof HTMLElement)) throw new Error("missing text host");
  const text = host.textContent ?? "";
  const textNode = firstTextNode(host);
  if (textNode === null) throw new Error("missing text node");
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.collapse(textNode, Math.min(start, text.length));
  selection?.extend(textNode, Math.min(end, text.length));
}

function firstTextNode(node: Node): Text | null {
  if (node.nodeType === Node.TEXT_NODE) return node as Text;
  for (const child of Array.from(node.childNodes)) {
    const found = firstTextNode(child);
    if (found !== null) return found;
  }
  return null;
}

describe("@interactive-os/json-document-contenteditable-react", () => {
  test("restores selection after document-driven rerender", () => {
    const doc = createDoc();
    const container = document.createElement("div");
    document.body.replaceChildren(container);
    const root = createRoot(container);
    const ready: {
      api?: UseContentEditableResult<Value>;
      editorRef?: RefObject<HTMLDivElement | null>;
    } = {};

    act(() => {
      root.render(<Editor doc={doc} onReady={(nextApi, nextRef) => {
        ready.api = nextApi;
        ready.editorRef = nextRef;
      }} />);
    });

    const api = ready.api;
    const editor = ready.editorRef?.current;
    if (!(editor instanceof HTMLElement) || api === undefined) throw new Error("editor not ready");

    selectText(editor, 5, 0);
    api.adapterRef.current?.syncSelectionFromDOM();
    const selection = doc.selection?.snapshot();
    if (selection === undefined) throw new Error("selection not synced");

    act(() => {
      doc.commit([
        { op: "add", path: "/marks/bold", value: { type: "bold", start: 0, end: 5 } },
      ], {
        selectionAfter: selection,
      });
    });

    expect(editor.querySelector("strong")?.textContent).toBe("Plain");
    expect(document.getSelection()?.toString()).toBe("Plain");
    expect(document.getSelection()?.isCollapsed).toBe(false);
  });

  test("preserves command-start selection for toolbar commands", () => {
    const doc = createDoc();
    const container = document.createElement("div");
    document.body.replaceChildren(container);
    const root = createRoot(container);
    const ready: {
      api?: UseContentEditableResult<Value>;
      editorRef?: RefObject<HTMLDivElement | null>;
    } = {};

    act(() => {
      root.render(<Editor doc={doc} onReady={(nextApi, nextRef) => {
        ready.api = nextApi;
        ready.editorRef = nextRef;
      }} />);
    });

    const api = ready.api;
    const editor = ready.editorRef?.current;
    if (!(editor instanceof HTMLElement) || api === undefined) throw new Error("editor not ready");

    selectText(editor, 0, 5);
    const preventDefault = vi.fn();
    api.syncCommandSelection({ preventDefault });
    selectText(editor, doc.value.body.length, doc.value.body.length);

    const result = api.adapterRef.current?.pasteText("Hi", api.getCommandSelection());

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true });
    expect(doc.value.body).toBe("Hi text");
    expect(doc.selection?.focus).toMatchObject({ path: "/body", offset: 2 });
  });
});
