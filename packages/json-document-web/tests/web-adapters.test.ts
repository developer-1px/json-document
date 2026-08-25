import { describe, expect, test } from "vitest";
import {
  createDatabaseEditor,
  createDocumentEditor,
  createOrderEditor,
  createSheetEditor,
  type BlockDocument,
  type DatabaseDocument,
  type OrderDocument,
  type SheetDocument,
} from "@interactive-os/json-document-editing";
import {
  createWebDragDropSession,
  createWebPointerSession,
  createWebClipboardBinding,
  createWebClipboardSurface,
  createWebClipboardTextWriter,
  databaseClipboardCodec,
  documentClipboardCodec,
  orderClipboardCodec,
  createWebKeyboardAdapter,
  findWebGridCell,
  activeDescendantContainerProps,
  activeDescendantItemProps,
  defaultWebKeymap,
  focusWebItem,
  gridBoundary,
  lineBoundary,
  moveGridPoint,
  moveLinePoint,
  pressInteractionFromWeb,
  projectWebWidgetState,
  rovingFocusItemProps,
  selectionOperationFromModifiers,
  sheetClipboardCodec,
  textInputFromControl,
  webFocusItemProps,
  webGridCellAddressProps,
  type WebClipboardData,
  type WebClipboardEvent,
} from "../src/index.js";

describe("Web focus item", () => {
  test("projects and realizes a focus key without selector interpolation", () => {
    let focused = false;
    const item = {
      getAttribute: (name: string) => name === "data-web-focus-key" ? 'a"[1]' : null,
      focus: () => { focused = true; },
    };
    expect(webFocusItemProps('a"[1]', true)).toEqual({ tabIndex: 0, "data-web-focus-key": 'a"[1]' });
    expect(focusWebItem({ querySelectorAll: () => [item] }, 'a"[1]')).toBe(item);
    expect(focused).toBe(true);
  });
});

describe("Web grid cell address", () => {
  test("projects and finds a cell without encoding a CSS selector", () => {
    const point = { rowId: 'row"/1', columnId: "column[한글]" };
    const attributes = webGridCellAddressProps(point);
    const other = addressElement(webGridCellAddressProps({ rowId: "other", columnId: "other" }));
    const expected = addressElement(attributes);
    const root = { querySelectorAll: () => [other, expected] };

    expect(attributes).toEqual({
      "data-grid-row-id": 'row"/1',
      "data-grid-column-id": "column[한글]",
    });
    expect(findWebGridCell(root, point)).toBe(expected);
    expect(findWebGridCell(root, { rowId: "missing", columnId: "missing" })).toBeNull();
    expect(findWebGridCell(null, point)).toBeNull();
  });
});

describe("Web clipboard Adapter", () => {
  test("normalizes imperative text write success, unsupported, and rejection", async () => {
    const writes: string[] = [];
    const writer = createWebClipboardTextWriter({
      clipboard: { writeText: async (text) => { writes.push(text); } },
    });
    expect(await writer.writeText("")).toEqual({ ok: true });
    expect(writes).toEqual([""]);
    expect(await createWebClipboardTextWriter({ clipboard: null }).writeText("text"))
      .toEqual({ ok: false, code: "clipboard.unsupported" });
    expect(await createWebClipboardTextWriter({
      clipboard: { writeText: async () => { throw new DOMException("Permission denied", "NotAllowedError"); } },
    }).writeText("text")).toEqual({
      ok: false,
      code: "clipboard.write-failed",
      reason: "Permission denied",
    });
  });

  test("projects copy, cut, and paste results through one surface callback", () => {
    const editor = createDocumentEditor({
      blocks: [{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }],
    });
    const results: string[] = [];
    const surface = createWebClipboardSurface({
      codec: documentClipboardCodec,
      read: () => editor.copy(),
      cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
      paste: (clipboard) => editor.dispatch({ type: "clipboard.paste", clipboard }),
      onResult: (result) => results.push(result.ok ? result.operation : result.code),
    });
    const data = new MemoryClipboardData();

    expect(surface.onCopy(event(data))).toMatchObject({ ok: true, operation: "copy" });
    expect(editor.dispatch({ type: "selection.set", blockId: "b" }).ok).toBe(true);
    expect(surface.onPaste(event(data))).toMatchObject({ ok: true, operation: "paste" });
    expect(surface.onCut(event(data))).toMatchObject({ ok: true, operation: "cut" });
    expect(surface.onCopy(event(null))).toMatchObject({ ok: false, code: "clipboard.unavailable" });
    expect(results).toEqual(["copy", "paste", "cut", "clipboard.unavailable"]);
  });

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

  test("round-trips Order and Database payloads through their codecs", () => {
    const order = createOrderEditor({
      items: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }],
    });
    const orderBinding = createWebClipboardBinding({
      codec: orderClipboardCodec,
      read: () => order.copy(),
      cut: (payload) => order.cut()?.result ?? { ok: false, code: "selection.empty", reason: payload.type },
      paste: (clipboard) => order.dispatch({ type: "clipboard.paste", clipboard }),
    });
    const orderData = new MemoryClipboardData();
    expect(orderBinding.copy(event(orderData)).ok).toBe(true);
    expect(orderData.getData("text/plain")).toBe("Alpha");
    expect(order.dispatch({ type: "selection.set", itemId: "b" }).ok).toBe(true);
    expect(orderBinding.paste(event(orderData)).ok).toBe(true);
    expect((order.snapshot.value as OrderDocument).items.map((item) => item.label)).toEqual([
      "Alpha",
      "Beta",
      "Alpha",
    ]);

    const database = createDatabaseEditor({
      schema: { properties: [{ id: "title", name: "Title", type: "title", options: [] }] },
      records: [{ id: "r1", values: { title: "Alpha" } }, { id: "r2", values: { title: "Beta" } }],
      views: [{
        id: "all",
        name: "All",
        type: "table",
        propertyOrder: ["title"],
        propertyVisibility: { title: true },
        propertyWidths: {},
        sort: null,
        filter: null,
      }],
    });
    const databaseBinding = createWebClipboardBinding({
      codec: databaseClipboardCodec,
      read: () => database.copy(),
      paste: (clipboard) => database.dispatch({ type: "clipboard.paste", clipboard }),
    });
    const databaseData = new MemoryClipboardData();
    expect(databaseBinding.copy(event(databaseData)).ok).toBe(true);
    expect(database.dispatch({ type: "selection.set", recordId: "r2", propertyId: "title" }).ok).toBe(true);
    expect(databaseBinding.paste(event(databaseData)).ok).toBe(true);
    expect((database.snapshot.value as DatabaseDocument).records[1]?.values.title).toBe("Alpha");
  });

  test("cuts a structured Document payload only after native clipboard data is available", () => {
    const editor = createDocumentEditor({
      blocks: [
        { id: "a", text: "Alpha" },
        { id: "b", text: "Beta" },
      ],
    });
    let cutAttempts = 0;
    const binding = createWebClipboardBinding({
      codec: documentClipboardCodec,
      read: () => editor.copy(),
      cut: () => {
        cutAttempts += 1;
        return editor.cut()?.result ?? { ok: false, code: "selection.empty" };
      },
      paste: (clipboard) => editor.dispatch({ type: "clipboard.paste", clipboard }),
    });

    const unavailable = event(null);
    expect(binding.cut(unavailable)).toMatchObject({ ok: false, code: "clipboard.unavailable" });
    expect(unavailable.defaultPrevented).toBe(false);
    expect(cutAttempts).toBe(0);
    expect((editor.snapshot.value as BlockDocument).blocks.map((block) => block.id)).toEqual(["a", "b"]);

    const data = new MemoryClipboardData();
    const cut = event(data);

    expect(binding.cut(cut)).toMatchObject({ ok: true, operation: "cut" });
    expect(cutAttempts).toBe(1);
    expect(cut.defaultPrevented).toBe(true);
    expect(data.getData("text/plain")).toBe("Alpha");
    expect((editor.snapshot.value as BlockDocument).blocks.map((block) => block.id)).toEqual(["b"]);
    expect(editor.undo().ok).toBe(true);
    expect((editor.snapshot.value as BlockDocument).blocks.map((block) => block.id)).toEqual(["a", "b"]);
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
    const unsupportedCut = event(new MemoryClipboardData());
    expect(binding.cut(unsupportedCut)).toMatchObject({ ok: false, code: "clipboard.unsupported" });
    expect(unsupportedCut.defaultPrevented).toBe(false);
  });

  test("writes all representations and parses the first valid representation by priority", () => {
    type Payload = { readonly type: "application/x-example"; readonly text: string; readonly source: string };
    const codec = {
      mimeType: "application/x-example" as const,
      encode: (payload: Payload) => JSON.stringify(payload),
      decode: (serialized: string): Payload | null => JSON.parse(serialized) as Payload,
    };
    const binding = createWebClipboardBinding({
      codec,
      representations: [
        codec,
        {
          mimeType: "text/html",
          encode: (payload: Payload) => `<p>${payload.text}</p>`,
          decode: (serialized: string): Payload | null => serialized === "<p>HTML</p>"
            ? { type: codec.mimeType, text: "HTML", source: "html" }
            : null,
        },
        {
          mimeType: "text/plain",
          encode: (payload: Payload) => payload.text,
          decode: (text: string): Payload => ({ type: codec.mimeType, text, source: "plain" }),
        },
      ],
      read: () => ({ type: codec.mimeType, text: "Alpha", source: "structured" }),
      paste: () => ({ ok: true as const }),
    });
    const copied = new MemoryClipboardData();
    expect(binding.copy(event(copied)).ok).toBe(true);
    expect(copied.types).toEqual([codec.mimeType, "text/html", "text/plain"]);

    const fallback = new MemoryClipboardData();
    fallback.setData(codec.mimeType, "invalid json");
    fallback.setData("text/html", "<p>HTML</p>");
    fallback.setData("text/plain", "Plain");
    expect(binding.paste(event(fallback))).toMatchObject({
      ok: true,
      payload: { text: "HTML", source: "html" },
    });
  });
});

describe("Web interaction sessions", () => {
  test("owns pointer capture, preview, commit, and lost-capture cancellation", () => {
    const events: string[] = [];
    const target = pointerCaptureTarget();
    const session = createWebPointerSession<{ readonly x: number }>({
      onPreview: (state) => events.push(`preview:${state.x}`),
      onCommit: (state) => events.push(`commit:${state.x}`),
      onCancel: (state, reason) => events.push(`${reason}:${state.x}`),
    });

    session.begin(target, 7, { x: 1 });
    expect(session.preview(8, (state) => ({ x: state.x + 1 }))).toBeNull();
    expect(session.preview(7, (state) => ({ x: state.x + 2 }))).toEqual({ x: 3 });
    expect(session.commit(7)).toEqual({ x: 3 });
    expect(target.captured.size).toBe(0);

    session.begin(target, 9, { x: 4 });
    expect(session.cancel(9, "lost-capture")).toEqual({ x: 4 });
    expect(events).toEqual(["preview:3", "commit:3", "lost-capture:4"]);
  });

  test("owns HTML drag and drop preview, commit, rejection, and supersession", () => {
    const events: string[] = [];
    const session = createWebDragDropSession<string, string>({
      onPreview: (item, target) => events.push(`preview:${item}:${target}`),
      onCommit: (item, target) => events.push(`commit:${item}:${target}`),
      onCancel: (item, reason) => events.push(`${reason}:${item}`),
    });

    session.begin("a");
    expect(session.preview("column-1")).toBe(true);
    session.begin("b");
    expect(session.commit("column-2")).toBe("b");
    session.begin("c");
    expect(session.cancel("drop-rejected")).toBe("c");
    expect(events).toEqual([
      "preview:a:column-1",
      "superseded:a",
      "commit:b:column-2",
      "drop-rejected:c",
    ]);
  });
});

describe("Web Press and ARIA Adapters", () => {
  test("normalizes keyboard, pointer, cancellation, and native activation facts", () => {
    expect(pressInteractionFromWeb({ type: "keydown", key: "Enter" })).toEqual({
      phase: "start", source: "keyboard", key: "Enter",
    });
    expect(pressInteractionFromWeb({ type: "keyup", key: " " })).toEqual({
      phase: "end", source: "keyboard", key: "Space",
    });
    expect(pressInteractionFromWeb({ type: "keydown", key: "Enter", repeat: true })).toBeNull();
    expect(pressInteractionFromWeb({ type: "pointerdown", button: 0 })).toEqual({
      phase: "start", source: "pointer",
    });
    expect(pressInteractionFromWeb({ type: "pointercancel" })).toEqual({
      phase: "cancel", source: "pointer",
    });
    expect(pressInteractionFromWeb({ type: "pointerleave" })).toEqual({
      phase: "cancel", source: "pointer",
    });
    expect(pressInteractionFromWeb({ type: "click", detail: 0 })).toEqual({
      phase: "activation", source: "virtual",
    });
    expect(pressInteractionFromWeb({ type: "click", detail: 1 })).toEqual({
      phase: "activation", source: "pointer",
    });
    expect(pressInteractionFromWeb({ type: "click", button: 2 })).toBeNull();
  });

  test("projects persistent role state without confusing transient press with ARIA", () => {
    expect(projectWebWidgetState({ role: "button" })).toEqual({ role: "button" });
    expect(projectWebWidgetState({ role: "button", pressed: true })).toEqual({
      role: "button", "aria-pressed": true,
    });
    expect(projectWebWidgetState({ role: "option", selected: true, disabled: true })).toEqual({
      role: "option", "aria-selected": true, "aria-disabled": true,
    });
    expect(projectWebWidgetState({ role: "treeitem", selected: false, expanded: true })).toEqual({
      role: "treeitem", "aria-selected": false, "aria-expanded": true,
    });
    expect(projectWebWidgetState({
      role: "treeitem", selected: false, level: 2, posInSet: 1, setSize: 3,
    })).toEqual({
      role: "treeitem",
      "aria-selected": false,
      "aria-level": 2,
      "aria-posinset": 1,
      "aria-setsize": 3,
    });
    expect(projectWebWidgetState({ role: "disclosure", expanded: false })).toEqual({
      role: "button", "aria-expanded": false,
    });
  });

  test("projects exactly one composite focus strategy", () => {
    expect(activeDescendantContainerProps("option-b")).toEqual({
      tabIndex: 0, "aria-activedescendant": "option-b",
    });
    expect(activeDescendantContainerProps(null)).toEqual({ tabIndex: 0 });
    expect(activeDescendantItemProps("option-b")).toEqual({ id: "option-b" });
    expect(rovingFocusItemProps(true)).toEqual({ tabIndex: 0 });
    expect(rovingFocusItemProps(false)).toEqual({ tabIndex: -1 });
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

describe("Web keyboard Adapter", () => {
  const adapter = createWebKeyboardAdapter();
  const grid = {
    rowIds: ["r1", "r2", "r3"],
    columnIds: ["name", "status", "owner"],
  };

  test("resolves conventional structural chords through the default keymap", () => {
    expect(adapter.resolve({ key: "ArrowDown", shiftKey: false, metaKey: false, ctrlKey: false }))
      .toEqual({ type: "move", direction: "down", operation: "replace" });
    expect(adapter.resolve({ key: "ArrowRight", shiftKey: true, metaKey: false, ctrlKey: false }))
      .toEqual({ type: "move", direction: "right", operation: "extend" });
    expect(adapter.resolve({ key: " ", shiftKey: false, metaKey: true, ctrlKey: false }))
      .toEqual({ type: "toggle" });
    expect(adapter.resolve({ key: "Delete", shiftKey: false, metaKey: false, ctrlKey: false }))
      .toEqual({ type: "delete" });
    expect(adapter.resolve({ key: "z", shiftKey: true, metaKey: false, ctrlKey: true }))
      .toEqual({ type: "redo" });
    expect(adapter.resolve({ key: "c", shiftKey: false, metaKey: true, ctrlKey: false })).toBeNull();
  });

  test("lets the host replace chords without inventing editing commands", () => {
    const custom = createWebKeyboardAdapter({
      keymap: { ...defaultWebKeymap, Enter: { type: "toggle" } },
    });
    expect(custom.resolve({ key: "Enter", shiftKey: false, metaKey: false, ctrlKey: false }))
      .toEqual({ type: "toggle" });
  });

  test("moves and bounds a grid point in visible order", () => {
    const start = { rowId: "r2", columnId: "status" };
    expect(moveGridPoint(grid, start, "up")).toEqual({ rowId: "r1", columnId: "status" });
    expect(moveGridPoint(grid, start, "left")).toEqual({ rowId: "r2", columnId: "name" });
    expect(moveGridPoint(grid, { rowId: "r1", columnId: "name" }, "up")).toBeNull();
    expect(gridBoundary(grid, start, "start")).toEqual({ rowId: "r2", columnId: "name" });
    expect(gridBoundary(grid, start, "end")).toEqual({ rowId: "r2", columnId: "owner" });
  });

  test("moves and bounds a line point in visible order", () => {
    const ids = ["alpha", "beta", "gamma"];
    expect(moveLinePoint(ids, "beta", "up")).toBe("alpha");
    expect(moveLinePoint(ids, "beta", "down")).toBe("gamma");
    expect(moveLinePoint(ids, "alpha", "up")).toBeNull();
    expect(lineBoundary(ids, "start")).toBe("alpha");
    expect(lineBoundary(ids, "end")).toBe("gamma");
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

function addressElement(attributes: {
  readonly "data-grid-row-id": string;
  readonly "data-grid-column-id": string;
}) {
  return {
    getAttribute(name: string) {
      if (name === "data-grid-row-id") return attributes["data-grid-row-id"];
      if (name === "data-grid-column-id") return attributes["data-grid-column-id"];
      return null;
    },
  };
}

function pointerCaptureTarget() {
  const captured = new Set<number>();
  return {
    captured,
    setPointerCapture(pointerId: number) {
      captured.add(pointerId);
    },
    hasPointerCapture(pointerId: number) {
      return captured.has(pointerId);
    },
    releasePointerCapture(pointerId: number) {
      captured.delete(pointerId);
    },
  };
}
