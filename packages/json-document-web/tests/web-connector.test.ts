import { describe, expect, test } from "vitest";
import {
  createDocumentEditor,
  createSheetEditor,
  type BlockDocument,
  type SheetDocument,
} from "@interactive-os/json-document-editing";
import {
  createWebClipboardBinding,
  documentClipboardCodec,
  selectionOperationFromModifiers,
  sheetClipboardCodec,
  textInputFromControl,
  type WebClipboardData,
  type WebClipboardEvent,
} from "../src/index.js";

describe("Web clipboard Connector", () => {
  test("copies and pastes a structured Document payload through ClipboardEvent contracts", () => {
    const editor = createDocumentEditor({
      blocks: [
        { id: "a", text: "Alpha" },
        { id: "b", text: "Beta" },
      ],
    });
    const binding = createWebClipboardBinding({
      codec: documentClipboardCodec,
      read: () => editor.copy(),
      paste: (clipboard) => editor.dispatch({ type: "clipboard.paste", clipboard }),
    });
    const data = new MemoryClipboardData();
    const copied = event(data);

    expect(binding.copy(copied)).toMatchObject({ ok: true, operation: "copy" });
    expect(copied.defaultPrevented).toBe(true);
    expect(data.getData("text/plain")).toBe("Alpha");
    expect(JSON.parse(data.getData(documentClipboardCodec.mimeType))).toMatchObject({
      type: documentClipboardCodec.mimeType,
      blocks: [{ id: "a", text: "Alpha" }],
    });

    expect(editor.dispatch({ type: "selection.set", blockId: "b" }).ok).toBe(true);
    const pasted = event(data);
    expect(binding.paste(pasted)).toMatchObject({ ok: true, operation: "paste" });
    expect(pasted.defaultPrevented).toBe(true);
    expect((editor.snapshot.value as BlockDocument).blocks.map((block) => block.text)).toEqual([
      "Alpha",
      "Beta",
      "Alpha",
    ]);
    expect(editor.snapshot.canUndo).toBe(true);
  });

  test("round-trips a rectangular Sheet payload", () => {
    const editor = createSheetEditor({
      columns: [{ id: "name", label: "Name" }],
      rows: [
        { id: "r1", cells: { name: "Alpha" } },
        { id: "r2", cells: { name: "Beta" } },
      ],
    });
    const binding = createWebClipboardBinding({
      codec: sheetClipboardCodec,
      read: () => editor.copy(),
      paste: (clipboard) => editor.dispatch({ type: "clipboard.paste", clipboard }),
    });
    const data = new MemoryClipboardData();
    expect(binding.copy(event(data)).ok).toBe(true);
    expect(editor.dispatch({ type: "selection.set", rowId: "r2", columnId: "name" }).ok).toBe(true);
    expect(binding.paste(event(data)).ok).toBe(true);
    expect((editor.snapshot.value as SheetDocument).rows[1]?.cells.name).toBe("Alpha");
  });

  test("malformed and rejected pastes preserve canonical state and native handling", () => {
    const editor = createDocumentEditor({ blocks: [{ id: "a", text: "Alpha" }] });
    const binding = createWebClipboardBinding({
      codec: documentClipboardCodec,
      read: () => editor.copy(),
      paste: (clipboard) => editor.dispatch({ type: "clipboard.paste", clipboard, afterId: "missing" }),
    });
    const initial = editor.snapshot.value;
    const malformedData = new MemoryClipboardData();
    malformedData.setData(documentClipboardCodec.mimeType, "{not json");
    const malformed = event(malformedData);

    expect(binding.paste(malformed)).toMatchObject({ ok: false, code: "clipboard.invalid" });
    expect(malformed.defaultPrevented).toBe(false);
    expect(editor.snapshot.value).toBe(initial);

    const validData = new MemoryClipboardData();
    expect(binding.copy(event(validData)).ok).toBe(true);
    const rejected = event(validData);
    expect(binding.paste(rejected)).toMatchObject({ ok: false, code: "editing.rejected" });
    expect(rejected.defaultPrevented).toBe(false);
    expect(editor.snapshot.value).toBe(initial);
    expect(editor.snapshot.canUndo).toBe(false);
  });

  test("does not claim unsupported plain text or unavailable clipboard data", () => {
    const editor = createDocumentEditor({ blocks: [{ id: "a", text: "Alpha" }] });
    const binding = createWebClipboardBinding({
      codec: documentClipboardCodec,
      read: () => editor.copy(),
      paste: (clipboard) => editor.dispatch({ type: "clipboard.paste", clipboard }),
    });
    const plain = new MemoryClipboardData();
    plain.setData("text/plain", "external");

    expect(binding.paste(event(plain))).toMatchObject({ ok: false, code: "clipboard.empty" });
    expect(binding.copy(event(null))).toMatchObject({ ok: false, code: "clipboard.unavailable" });
  });
});

describe("Web input modifiers", () => {
  test("maps the conventional replace, extend, and toggle operations", () => {
    expect(selectionOperationFromModifiers({ shiftKey: false, metaKey: false, ctrlKey: false })).toBe("replace");
    expect(selectionOperationFromModifiers({ shiftKey: true, metaKey: false, ctrlKey: false })).toBe("extend");
    expect(selectionOperationFromModifiers({ shiftKey: false, metaKey: true, ctrlKey: false })).toBe("toggle");
    expect(selectionOperationFromModifiers({ shiftKey: false, metaKey: false, ctrlKey: true })).toBe("toggle");
    expect(selectionOperationFromModifiers({ shiftKey: true, metaKey: true, ctrlKey: true })).toBe("extend");
  });

  test("reads a native text control value and caret without owning native selection", () => {
    expect(textInputFromControl({ currentTarget: { value: "Alpha", selectionStart: 2 } })).toEqual({
      text: "Alpha",
      offset: 2,
    });
    expect(textInputFromControl({ currentTarget: { value: "Beta", selectionStart: null } })).toEqual({
      text: "Beta",
      offset: 4,
    });
  });
});

class MemoryClipboardData implements WebClipboardData {
  readonly #values = new Map<string, string>();

  get types(): ReadonlyArray<string> {
    return [...this.#values.keys()];
  }

  getData(format: string): string {
    return this.#values.get(format) ?? "";
  }

  setData(format: string, data: string): void {
    this.#values.set(format, data);
  }
}

function event(clipboardData: WebClipboardData | null): WebClipboardEvent & { readonly defaultPrevented: boolean } {
  let defaultPrevented = false;
  return {
    clipboardData,
    get defaultPrevented() { return defaultPrevented; },
    preventDefault() { defaultPrevented = true; },
  };
}
