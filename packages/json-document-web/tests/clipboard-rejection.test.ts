import { describe, expect, it, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createDocumentEditor } from "@interactive-os/json-document-editing";
import { createWebClipboardBinding, documentClipboardCodec } from "../src/index.js";

describe("clipboard event ownership", () => {
  const payload = { type: "application/vnd.interactive-os.blocks+json" as const, blocks: [{ id: "a", text: "A" }], text: "A" };
  it.each(["cut", "paste"] as const)("cancels a supported %s before a rejected edit", (operation) => {
    const preventDefault = vi.fn();
    const reject = () => {
      expect(preventDefault).toHaveBeenCalledOnce();
      return { ok: false, code: "permission-denied" };
    };
    const binding = createWebClipboardBinding({ codec: documentClipboardCodec, read: () => payload, cut: reject, paste: reject });
    const result = binding[operation]({
      clipboardData: { types: [payload.type], getData: () => JSON.stringify(payload), setData() {} },
      preventDefault,
    });
    expect(result).toMatchObject({ ok: false, code: "editing.rejected" });
    expect(preventDefault).toHaveBeenCalledOnce();
  });
  it("leaves unsupported paste formats to their owner", () => {
    const preventDefault = vi.fn();
    const paste = vi.fn(() => ({ ok: true }));
    const binding = createWebClipboardBinding({ codec: documentClipboardCodec, read: () => payload, paste });
    expect(binding.paste({ clipboardData: { types: ["image/png"], getData: () => "", setData() {} }, preventDefault }).ok).toBe(false);
    expect(paste).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it.each(["structured", "text"])("EG-CUT / failed %s write does not invoke removal", (failedWrite) => {
    const document = createJSONDocument({ blocks: payload.blocks });
    const editor = createDocumentEditor(document);
    const before = structuredClone(editor.snapshot);
    const remove = vi.fn(() => editor.cut()?.result ?? { ok: false, code: "selection.empty" });
    const binding = createWebClipboardBinding({ codec: documentClipboardCodec, read: () => editor.copy(), cut: remove,
      paste: (clipboard) => editor.dispatch({ type: "clipboard.paste", clipboard }),
    });
    const published: unknown[] = [];
    const release = editor.subscribe((snapshot) => published.push(snapshot));
    const written = new Map<string, string>();
    try {
      const result = binding.cut({
        clipboardData: { types: [], getData: () => "", setData(format, data) {
          if (format === (failedWrite === "structured" ? payload.type : "text/plain")) throw new Error("Clipboard write refused");
          written.set(format, data);
        } },
        preventDefault() {},
      });
      expect(result).toMatchObject({ ok: false, code: "clipboard.unavailable" });
      expect(remove).not.toHaveBeenCalled();
      expect(document.value).toEqual(before.value);
      expect(editor.snapshot).toMatchObject(before);
      expect(published).toEqual([]);
      // A preceding clipboard representation can remain written: this is not an OS transaction.
      expect(written.size).toBe(failedWrite === "structured" ? 0 : 1);
    } finally { release(); }
  });

  it("EG-CUT / rejected removal keeps the captured clipboard and document unchanged", () => {
    const document = createJSONDocument({ blocks: payload.blocks }, { validate(candidate) {
      return (candidate as { blocks: unknown[] }).blocks.length > 0 ? { ok: true } : { ok: false, code: "last-block-required" };
    } });
    const editor = createDocumentEditor(document);
    const before = structuredClone(editor.snapshot);
    const preventDefault = vi.fn();
    const written = new Map<string, string>();
    const binding = createWebClipboardBinding({ codec: documentClipboardCodec, read: () => editor.copy(),
      cut(captured) {
        expect(captured).toEqual(payload);
        expect(written.get(payload.type)).toBe(JSON.stringify(payload));
        expect(written.get("text/plain")).toBe("A");
        expect(preventDefault).toHaveBeenCalledOnce();
        const cut = editor.cut();
        expect(cut?.clipboard).toEqual(captured);
        return cut!.result;
      },
      paste: (clipboard) => editor.dispatch({ type: "clipboard.paste", clipboard }),
    });
    const published: unknown[] = [];
    const release = editor.subscribe((snapshot) => published.push(snapshot));
    try {
      expect(binding.cut({ clipboardData: { types: [], getData: () => "", setData: (format, data) => { written.set(format, data); } }, preventDefault }))
        .toMatchObject({ ok: false, code: "editing.rejected", reason: "last-block-required" });
      expect(editor.snapshot).toMatchObject(before);
      expect(document.value).toEqual(before.value);
      expect(published).toEqual([]);
    } finally { release(); }
  });

  it("EG-CUT / successful Web cut captures before removal and undo restores the selection", () => {
    const editor = createDocumentEditor({ blocks: payload.blocks });
    const before = structuredClone(editor.snapshot);
    const written = new Map<string, string>();
    const preventDefault = vi.fn();
    const binding = createWebClipboardBinding({ codec: documentClipboardCodec, read: () => editor.copy(),
      cut(captured) {
        expect(written.get(payload.type)).toBe(JSON.stringify(captured));
        expect(written.get("text/plain")).toBe(captured.text);
        expect(preventDefault).toHaveBeenCalledOnce();
        return editor.cut()!.result;
      },
      paste: (clipboard) => editor.dispatch({ type: "clipboard.paste", clipboard }),
    });
    const result = binding.cut({ clipboardData: { types: [], getData: () => "", setData: (format, data) => { written.set(format, data); } }, preventDefault });
    expect(result).toMatchObject({ ok: true, operation: "cut", payload, result: { ok: true } });
    expect(editor.snapshot).toMatchObject({ value: { blocks: [] }, canUndo: true, canRedo: false });
    expect(editor.undo().ok).toBe(true);
    expect(editor.snapshot).toMatchObject({ value: before.value, selection: before.selection, canUndo: false, canRedo: true });
    expect(written.get(payload.type)).toBe(JSON.stringify(payload));
  });
});
