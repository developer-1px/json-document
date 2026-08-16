import { describe, expect, it } from "vitest";
import {
  createRichTextClipboardRepresentations,
  createRichTextClipboardCodec,
  parseRichTextHTML,
  richTextClipboardCodec,
  serializeRichTextSlice,
} from "../src/index.js";
import { createRichTextSchema, RICH_TEXT_CLIPBOARD_MIME, RICH_TEXT_PROFILE_V1, type RichTextClipboard } from "@interactive-os/json-document-rich-text";

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

  it("rejects malformed JSON and schema-invalid structured slices", () => {
    expect(richTextClipboardCodec.decode("{")).toBeNull();
    expect(richTextClipboardCodec.decode(JSON.stringify({
      profile: RICH_TEXT_PROFILE_V1,
      content: [{ id: "empty", type: "text", text: "", marks: [] }],
      openStart: 1,
      openEnd: 1,
    }))).toBeNull();
  });

  it("validates structured clipboard against the editor extension profile", () => {
    const schema = createRichTextSchema({ profile: "urn:example:clipboard:1", nodes: { "com.example/card": {
      group: "block", atom: true, attrs: { label: { required: true, validate: (value) => typeof value === "string" } }, content: null, allowedMarks: "none",
    } } });
    const slice = { profile: schema.profile, content: [{ id: "card", type: "com.example/card", attrs: { label: "A" } }], openStart: 0, openEnd: 0 };
    expect(createRichTextClipboardCodec(schema).decode(JSON.stringify(slice))).toMatchObject({ slice });
    expect(richTextClipboardCodec.decode(JSON.stringify(slice))).toBeNull();
  });

  it("round-trips the complete official block vocabulary through semantic HTML", () => {
    let id = 0;
    const parsed = parseRichTextHTML(
      '<blockquote><h3>Quote</h3></blockquote><pre><code class="language-ts">const x = 1;</code></pre><ul><li><p>One<br>line</p><ol start="4"><li>Nested</li></ol></li></ul>',
      () => `id-${++id}`,
    );
    expect(parsed?.slice.content).toMatchObject([
      { type: "blockquote", content: [{ type: "heading", attrs: { level: 3 } }] },
      { type: "codeBlock", attrs: { language: "ts" }, content: [{ text: "const x = 1;", marks: [] }] },
      { type: "bulletList", content: [{ type: "listItem", content: [
        { type: "paragraph", content: [{ text: "One" }, { type: "hardBreak" }, { text: "line" }] },
        { type: "orderedList", attrs: { start: 4 } },
      ] }] },
    ]);
    expect(parsed?.html).toContain('<ol start="4">');
  });

  it("drops unsafe link semantics while retaining their text", () => {
    let id = 0;
    const parsed = parseRichTextHTML('<p><a href="javascript:alert(1)">safe text</a></p>', () => `id-${++id}`);
    expect(parsed?.slice.content).toMatchObject([{ content: [{ text: "safe text", marks: [] }] }]);
    expect(parsed?.html).not.toContain("javascript:");
  });
});
