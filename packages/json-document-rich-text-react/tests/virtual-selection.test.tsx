/** @vitest-environment jsdom */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createRichTextEditor, type RichTextDocument } from "@interactive-os/json-document-rich-text";
import { RichTextEditorSurface, RichTextRenderer } from "../src/index.js";

const documentValue: RichTextDocument = {
  profile: "urn:interactive-os:json-document:rich-text:1",
  id: "doc",
  type: "doc",
  content: [{
    id: "code",
    type: "codeBlock",
    attrs: { language: "ts" },
    content: [{ id: "text", type: "text", text: "const model = true;", marks: [] }],
  }],
};

afterEach(cleanup);

describe("Rich Text code block virtual selection", () => {
  it("uses model-backed Select All and copy only for the read-only renderer", () => {
    const { container, unmount } = render(<RichTextRenderer document={documentValue} />);
    const readOnlyCode = container.querySelector("pre")!;
    fireEvent.pointerDown(readOnlyCode);
    const selectAll = commandA();
    document.dispatchEvent(selectAll);
    expect(selectAll.defaultPrevented).toBe(true);

    const setData = vi.fn();
    const copy = new Event("copy", { bubbles: true, cancelable: true });
    Object.defineProperty(copy, "clipboardData", { value: { setData } });
    document.dispatchEvent(copy);
    expect(setData).toHaveBeenCalledWith("text/plain", "const model = true;");
    unmount();

    const editable = render(<RichTextEditorSurface editor={createRichTextEditor({ document: createJSONDocument(documentValue) })} />);
    const editableCode = editable.container.querySelector("pre")!;
    fireEvent.pointerDown(editableCode);
    const nativeSelectAll = commandA();
    editableCode.dispatchEvent(nativeSelectAll);
    expect(nativeSelectAll.defaultPrevented).toBe(false);
  });
});

function commandA(): KeyboardEvent {
  return new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ctrlKey: true, key: "a" });
}
