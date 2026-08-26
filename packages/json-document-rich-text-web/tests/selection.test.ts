import { describe, expect, it } from "vitest";
import { readRichTextDOMSelection, restoreRichTextDOMSelection } from "../src/index.js";

describe("Rich Text DOM Selection mapping", () => {
  it("round-trips text points through semantic mark wrappers", () => {
    const root = fixture('<p data-rich-text-node-id="p" data-rich-text-container-id="p"><strong><span data-rich-text-node-id="t" data-rich-text-text-id="t">hello</span></strong></p>');
    restoreRichTextDOMSelection(root, { kind: "range", ranges: [{
      anchor: { kind: "text", nodeId: "t", offset: 1, affinity: "forward" },
      focus: { kind: "text", nodeId: "t", offset: 4, affinity: "backward" },
    }], primaryIndex: 0 });
    expect(readRichTextDOMSelection(root)).toEqual({ kind: "range", ranges: [{
      anchor: { kind: "text", nodeId: "t", offset: 1, affinity: "forward" },
      focus: { kind: "text", nodeId: "t", offset: 4, affinity: "forward" },
    }], primaryIndex: 0 });
  });

  it("round-trips child boundaries around inline atoms", () => {
    const root = fixture('<p data-rich-text-node-id="p" data-rich-text-container-id="p"><span data-rich-text-node-id="a" data-rich-text-text-id="a">A</span><br data-rich-text-node-id="br"><span data-rich-text-node-id="b" data-rich-text-text-id="b">B</span></p>');
    restoreRichTextDOMSelection(root, { kind: "range", ranges: [{
      anchor: { kind: "child", nodeId: "p", offset: 1, affinity: "forward" },
      focus: { kind: "child", nodeId: "p", offset: 2, affinity: "forward" },
    }], primaryIndex: 0 });
    expect(readRichTextDOMSelection(root)).toEqual({ kind: "range", ranges: [{
      anchor: { kind: "child", nodeId: "p", offset: 1, affinity: "forward" },
      focus: { kind: "child", nodeId: "p", offset: 2, affinity: "forward" },
    }], primaryIndex: 0 });
  });

  it("rejects selection owned by a nested editing host", () => {
    const root = fixture('<p data-rich-text-node-id="p" data-rich-text-container-id="p"><span data-rich-text-node-id="t" data-rich-text-text-id="t">outer</span><span contenteditable><span data-rich-text-node-id="nested" data-rich-text-text-id="nested">inner</span></span></p>');
    const nested = root.querySelector('[data-rich-text-text-id="nested"]')!.firstChild!;
    window.getSelection()!.setBaseAndExtent(nested, 2, nested, 2);

    expect(readRichTextDOMSelection(root)).toBeNull();
  });
});

function fixture(html: string): HTMLElement {
  document.body.innerHTML = `<article contenteditable="true">${html}</article>`;
  return document.querySelector("article")!;
}
