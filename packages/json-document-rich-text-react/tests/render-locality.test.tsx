/** @vitest-environment jsdom */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { createJSONDocument } from "@interactive-os/json-document";
import {
  createRichTextBlockFixture,
  createRichTextEditor,
} from "@interactive-os/json-document-rich-text";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { lastRenderStoreBlockScan, observeRichTextBlockRenders, observeRichTextSurfaceRenders, RichTextEditorSurface } from "../src/index.js";
import { richTextRenderStore } from "../src/render-store.js";

describe("Rich Text React locality", () => {
  afterEach(() => {
    observeRichTextBlockRenders(null);
    observeRichTextSurfaceRenders(null);
    document.body.innerHTML = "";
  });

  it("does not rerender the surface or unaffected blocks after a local text insert", async () => {
    const jsonDocument = createJSONDocument(createRichTextBlockFixture(4, { idPrefix: "n" }));
    const editor = createRichTextEditor({
      document: jsonDocument,
      selection: collapsed("n-text-1", 1),
    });
    const counts = new Map<string, number>();
    let surfaceRenders = 0;
    observeRichTextBlockRenders((nodeId) => counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1));
    observeRichTextSurfaceRenders(() => { surfaceRenders += 1; });
    const root = globalThis.document.createElement("div");
    globalThis.document.body.append(root);
    const reactRoot = createRoot(root);
    await act(async () => {
      reactRoot.render(<RichTextEditorSurface editor={editor} />);
    });
    const before = Object.fromEntries(counts);
    const surfaceBefore = surfaceRenders;
    await act(async () => {
      editor.dispatch({ type: "text.insert", text: "y" });
    });
    expect(surfaceRenders).toBe(surfaceBefore);
    expect(counts.get("n-0")).toBe(before["n-0"]);
    expect(counts.get("n-2")).toBe(before["n-2"]);
    expect(counts.get("n-3")).toBe(before["n-3"]);
    expect(counts.get("n-1")).toBeGreaterThan(before["n-1"] ?? 0);
    await act(async () => reactRoot.unmount());
  });

  it("keeps unaffected block renders flat as the document grows from 64 to 1,000 blocks", async () => {
    for (const size of [64, 1_000]) {
      const jsonDocument = createJSONDocument(createRichTextBlockFixture(size, { idPrefix: `s${size}` }));
      const middle = Math.floor(size / 2);
      const editor = createRichTextEditor({
        document: jsonDocument,
        selection: collapsed(`s${size}-text-${middle}`, 1),
      });
      const counts = new Map<string, number>();
      let surfaceRenders = 0;
      observeRichTextBlockRenders((nodeId) => counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1));
      observeRichTextSurfaceRenders(() => { surfaceRenders += 1; });
      const root = globalThis.document.createElement("div");
      globalThis.document.body.append(root);
      const reactRoot = createRoot(root);
      await act(async () => {
        reactRoot.render(<RichTextEditorSurface editor={editor} />);
      });
      const before = new Map(counts);
      const surfaceBefore = surfaceRenders;
      await act(async () => {
        editor.dispatch({ type: "text.insert", text: "y" });
      });
      const increased = [...counts.entries()].filter(([id, count]) => count !== (before.get(id) ?? 0));
      expect(surfaceRenders, `${size} surface`).toBe(surfaceBefore);
      expect(increased.map(([id]) => id).sort()).toEqual([`s${size}-${middle}`, `s${size}-text-${middle}`].sort());
      await act(async () => reactRoot.unmount());
      root.remove();
    }
  });

  it("does not scan every block after a local insert in a 10,000-block document", () => {
    const jsonDocument = createJSONDocument(createRichTextBlockFixture(10_000, { idPrefix: "scan" }));
    const editor = createRichTextEditor({
      document: jsonDocument,
      selection: collapsed("scan-text-5000", 1),
    });
    const store = richTextRenderStore(editor);
    const notified: string[] = [];
    store.subscribeNode("scan-5000", () => notified.push("scan-5000"));
    store.subscribeNode("scan-0", () => notified.push("scan-0"));
    expect(editor.dispatch({ type: "text.insert", text: "y" }).ok).toBe(true);
    expect(lastRenderStoreBlockScan()).toBeLessThan(16);
    expect(notified).toEqual(["scan-5000"]);
  });

  it("notifies structure subscribers after a block split", () => {
    const jsonDocument = createJSONDocument(createRichTextBlockFixture(4, { idPrefix: "split" }));
    const editor = createRichTextEditor({
      document: jsonDocument,
      selection: collapsed("split-text-1", 1),
    });
    const store = richTextRenderStore(editor);
    let structureNotifies = 0;
    store.subscribeStructure(() => { structureNotifies += 1; });
    const beforeIds = store.getBlockIds();
    expect(editor.dispatch({ type: "block.split" }).ok).toBe(true);
    expect(structureNotifies).toBe(1);
    expect(store.getBlockIds().length).toBe(beforeIds.length + 1);
  });

  it("renders a Rich Text document bound below the JSON root", async () => {
    const value = createRichTextBlockFixture(2, { idPrefix: "nested" });
    const jsonDocument = createJSONDocument({ instruction: value, attachments: [] });
    const editor = createRichTextEditor({
      document: jsonDocument,
      pointer: "/instruction",
      selection: collapsed("nested-text-0", 1),
    });
    const store = richTextRenderStore(editor);
    expect(store.getDocumentId()).toBe(value.id);
    expect(store.getBlockIds()).toEqual(["nested-0", "nested-1"]);

    const root = globalThis.document.createElement("div");
    globalThis.document.body.append(root);
    const reactRoot = createRoot(root);
    await act(async () => reactRoot.render(<RichTextEditorSurface editor={editor} />));
    expect(root.querySelector('[data-rich-text-node-id="nested-0"]')).not.toBeNull();
    await act(async () => { editor.dispatch({ type: "text.insert", text: "x" }); });
    expect(root.textContent).toContain("x");
    await act(async () => reactRoot.unmount());
  });

  it("exposes the editable element for ecosystem focus restoration", async () => {
    const editor = createRichTextEditor({ document: createJSONDocument(createRichTextBlockFixture(1, { idPrefix: "focus" })) });
    const elementRef: { current: HTMLElement | null } = { current: null };
    const root = globalThis.document.createElement("div");
    globalThis.document.body.append(root);
    const reactRoot = createRoot(root);

    await act(async () => reactRoot.render(<RichTextEditorSurface editor={editor} elementRef={elementRef} />));
    expect(elementRef.current).toBe(root.firstElementChild);
    elementRef.current?.focus();
    expect(document.activeElement).toBe(elementRef.current);

    await act(async () => reactRoot.unmount());
    expect(elementRef.current).toBeNull();
  });
});

function collapsed(nodeId: string, offset: number) {
  const point = { kind: "text" as const, nodeId, offset, affinity: "forward" as const };
  return { kind: "range" as const, ranges: [{ anchor: point, focus: point }], primaryIndex: 0 };
}
