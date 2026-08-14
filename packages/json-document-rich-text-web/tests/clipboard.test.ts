import { describe, expect, it } from "vitest";
import {
  createRichTextClipboardRepresentations,
  richTextClipboardCodec,
  serializeRichTextSlice,
} from "../src/index.js";
import { RICH_TEXT_CLIPBOARD_MIME, RICH_TEXT_PROFILE_V1, type RichTextClipboard } from "@interactive-os/json-document-rich-text";

const clipboard: RichTextClipboard = {
  type: RICH_TEXT_CLIPBOARD_MIME,
  slice: {
    profile: RICH_TEXT_PROFILE_V1,
    content: [{
      id: "p-1",
      type: "paragraph",
      content: [{ id: "t-1", type: "text", text: "Rich", marks: [{ type: "strong" }] }],
    }],
    openStart: 0,
    openEnd: 0,
  },
  text: "Rich",
  html: "",
};

describe("Official Rich Text Web clipboard", () => {
  it("encodes a versioned slice without leaking internal IDs into semantic HTML", () => {
    expect(richTextClipboardCodec.decode(richTextClipboardCodec.encode(clipboard))).toMatchObject({
      type: RICH_TEXT_CLIPBOARD_MIME,
      text: "Rich",
    });
    const html = serializeRichTextSlice(clipboard.slice);
    expect(html).toBe("<p><strong>Rich</strong></p>");
    expect(html).not.toContain("p-1");
    expect(html).not.toContain("t-1");
  });

  it("publishes structured, HTML, and plain representations in paste priority order", () => {
    const representations = createRichTextClipboardRepresentations();
    expect(representations.map((representation) => representation.mimeType)).toEqual([
      RICH_TEXT_CLIPBOARD_MIME,
      "text/html",
      "text/plain",
    ]);
    expect(representations[2]?.decode("external text")).toMatchObject({
      text: "external text",
      slice: { openStart: 0, openEnd: 0 },
    });
  });
});
