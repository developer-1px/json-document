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
import { RichTextEditorSurface } from "../src/index.js";
import {
  lastRenderStoreBlockScan,
  lastPlaceholderScan,
  observeRichTextBlockRenders,
  observeRichTextSurfaceRenders,
} from "../src/render-instrument.js";
import { createRichTextRenderStore } from "../src/render-store.js";

describe("Rich Text React locality", () => {
  it("catches up after disconnected structural and leaf edits", () => {
    const editor = createRichTextEditor({
      document: createJSONDocument(createRichTextBlockFixture(3, { idPrefix: "offline" })),
      selection: collapsed("offline-text-0", 1),
    });
    const store = createRichTextRenderStore(editor);
    const unsubscribe = store.subscribeStructure(() => {});
    unsubscribe();
    expect(editor.dispatch({ type: "node.move", nodeId: "offline-0", point: {
      kind: "child", nodeId: (editor.snapshot.value as { id: string }).id, offset: 3, affinity: "forward",
    } }).ok).toBe(true);
    expect(editor.dispatch({ type: "text.insert", text: "y" }).ok).toBe(true);
    expect(store.getBlockIds()).toEqual(["offline-1", "offline-2", "offline-0"]);
    expect(store.getNode("offline-text-0")).toMatchObject({ text: "xy" });
  });

  it("projects identity-preserving moves and releases the editor after unmount", async () => {
    const inner = createJSONDocument(createRichTextBlockFixture(3, { idPrefix: "move" }));
    let active = 0;
    const source = {
      ...inner,
      get value() { return inner.value; },
      subscribe(listener: Parameters<typeof inner.subscribe>[0]) {
        active++;
        const unsubscribe = inner.subscribe(listener);
        return () => { active--; unsubscribe(); };
      },
    };
    const editor = createRichTextEditor({ document: source });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<RichTextEditorSurface editor={editor} />));
    await act(async () => {
      expect(editor.dispatch({ type: "node.move", nodeId: "move-0",
        point: { kind: "child", nodeId: (editor.snapshot.value as { id: string }).id, offset: 3, affinity: "forward" },
      }).ok).toBe(true);
    });
    expect(createRichTextRenderStore(editor).getBlockIds()).toEqual(["move-1", "move-2", "move-0"]);
    expect([...container.querySelectorAll("p[data-rich-text-node-id]")].map((node) => node.getAttribute("data-rich-text-node-id"))).toEqual(["move-1", "move-2", "move-0"]);
    await act(async () => root.unmount());
    expect(active).toBe(0);
  });

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
    const store = createRichTextRenderStore(editor);
    const notified: string[] = [];
    store.subscribeNode("scan-5000", () => notified.push("scan-5000"));
    store.subscribeNode("scan-0", () => notified.push("scan-0"));
    expect(editor.dispatch({ type: "text.insert", text: "y" }).ok).toBe(true);
    expect(lastRenderStoreBlockScan()).toBeLessThan(16);
    expect(notified).toEqual(["scan-5000"]);
  });

  it("keeps placeholder updates local in a 10,000-block document", () => {
    const jsonDocument = createJSONDocument(createRichTextBlockFixture(10_000, { idPrefix: "placeholder" }));
    const editor = createRichTextEditor({
      document: jsonDocument,
      selection: collapsed("placeholder-text-5000", 1),
    });
    const store = createRichTextRenderStore(editor);
    let notifies = 0;
    store.subscribePlaceholder(() => { notifies += 1; });

    expect(editor.dispatch({ type: "text.insert", text: "y" }).ok).toBe(true);
    expect(lastPlaceholderScan()).toBeLessThan(16);
    expect(notifies).toBe(0);
  });

  it("does no placeholder work when the surface has no placeholder", () => {
    const jsonDocument = createJSONDocument(createRichTextBlockFixture(10_000, { idPrefix: "plain" }));
    const editor = createRichTextEditor({
      document: jsonDocument,
      selection: collapsed("plain-text-5000", 1),
    });
    const unsubscribe = createRichTextRenderStore(editor).subscribeStructure(() => {});

    expect(editor.dispatch({ type: "text.insert", text: "y" }).ok).toBe(true);
    expect(lastPlaceholderScan()).toBe(0);
    unsubscribe();
  });

  it("notifies structure subscribers after a block split", () => {
    const jsonDocument = createJSONDocument(createRichTextBlockFixture(4, { idPrefix: "split" }));
    const editor = createRichTextEditor({
      document: jsonDocument,
      selection: collapsed("split-text-1", 1),
    });
    const store = createRichTextRenderStore(editor);
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
    const store = createRichTextRenderStore(editor);
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
