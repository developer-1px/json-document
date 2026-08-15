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
import { observeRichTextBlockRenders, observeRichTextSurfaceRenders, RichTextEditorSurface } from "../src/index.js";

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
});

function collapsed(nodeId: string, offset: number) {
  const point = { kind: "text" as const, nodeId, offset, affinity: "forward" as const };
  return { kind: "range" as const, ranges: [{ anchor: point, focus: point }], primaryIndex: 0 };
}
