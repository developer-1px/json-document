import { createJSONDocument } from "@interactive-os/json-document";
import { createRichTextEditor } from "@interactive-os/json-document-rich-text";
import { afterEach, expect, it } from "vitest";
import { createRichTextContentEditableBinding } from "../src/index.js";

const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  document.body.replaceChildren();
});

function fixture() {
  const json = createJSONDocument({
    profile: "urn:interactive-os:json-document:rich-text:1",
    id: "doc",
    type: "doc",
    content: [
      {
        id: "p",
        type: "paragraph",
        content: [{ id: "t", type: "text", text: "abc", marks: [] }],
      },
    ],
  });
  const point = {
    kind: "text" as const,
    nodeId: "t",
    offset: 3,
    affinity: "forward" as const,
  };
  const editor = createRichTextEditor({
    document: json,
    selection: {
      kind: "range",
      ranges: [{ anchor: point, focus: point }],
      primaryIndex: 0,
    },
  });
  const root = document.createElement("article");
  root.contentEditable = "true";
  root.dataset.richTextContainerId = "doc";
  root.innerHTML =
    '<p data-rich-text-node-id="p" data-rich-text-container-id="p"><span data-rich-text-node-id="t" data-rich-text-text-id="t">abc</span></p>';
  document.body.append(root);
  const text = root.querySelector("span")!.firstChild!;
  document.getSelection()!.setBaseAndExtent(text, 3, text, 3);
  const binding = createRichTextContentEditableBinding({ root, editor });
  disposers.push(() => binding.destroy());
  return { json, editor, root, text };
}

it.each(["input", "textarea", "select"])(
  "does not consume nested native %s input or clipboard",
  (tag) => {
    const { json, root } = fixture();
    const before = json.value;
    const control = document.createElement(tag);
    root.append(control);
    control.focus();
    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Backspace",
    });
    control.dispatchEvent(event);
    expect({ prevented: event.defaultPrevented, value: json.value }).toEqual({
      prevented: false,
      value: before,
    });
    const beforeInput = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: "X",
    });
    control.dispatchEvent(beforeInput);
    expect(beforeInput.defaultPrevented).toBe(false);
    for (const type of ["copy", "cut", "paste"]) {
      const clipboard = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(clipboard, "clipboardData", {
        value: { types: ["text/plain"], getData: () => "X", setData: () => {} },
      });
      control.dispatchEvent(clipboard);
      expect(clipboard.defaultPrevented).toBe(false);
    }
    expect(json.value).toEqual(before);
  },
);

it.each(["insertReplacementText", "insertFromYank", "insertTranspose"])(
  "consumes %s carried in dataTransfer",
  (inputType) => {
    const { json, root, text } = fixture();
    const event = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType,
      data: null,
    });
    Object.defineProperties(event, {
      dataTransfer: {
        value: {
          types: ["text/plain"],
          getData: (type: string) => (type === "text/plain" ? "X" : ""),
        },
      },
      getTargetRanges: {
        value: () => [
          {
            startContainer: text,
            startOffset: 1,
            endContainer: text,
            endOffset: 2,
          },
        ],
      },
    });
    root.dispatchEvent(event);
    expect({
      prevented: event.defaultPrevented,
      value: json.at("/content/0/content/0/text"),
    }).toMatchObject({ prevented: true, value: { ok: true, value: "aXc" } });
  },
);
