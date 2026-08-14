import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichTextEditorSurface, RichTextRenderer } from "../src/index.js";
import {
  createRichTextSchema,
  richTextSchemaV1,
  type RichTextDocument,
  type RichTextEditor,
} from "@interactive-os/json-document-rich-text";

describe("RichTextRenderer", () => {
  it("renders every official container with DOM mapping identifiers", () => {
    const html = renderToStaticMarkup(<RichTextRenderer document={{
      profile: "urn:interactive-os:json-document:rich-text:1",
      id: "doc",
      type: "doc",
      content: [{ id: "quote", type: "blockquote", content: [{ id: "p", type: "paragraph", content: [
        { id: "text", type: "text", text: "Hello", marks: [{ type: "strong" }] },
        { id: "break", type: "hardBreak" },
      ] }] }],
    }} />);
    expect(html).toContain('<blockquote data-rich-text-node-id="quote" data-rich-text-container-id="quote">');
    expect(html).toContain('<strong><span data-rich-text-node-id="text" data-rich-text-text-id="text">Hello</span></strong>');
    expect(html).toContain('<br data-rich-text-node-id="break"/>');
  });

  it("passes unavailable and registered extension nodes to host fallbacks without data loss", () => {
    const document = {
      profile: "urn:example:rich-text:1",
      id: "doc",
      type: "doc",
      content: [{ id: "mention", type: "com.example/mention", attrs: { userId: "u1" } }],
    } as RichTextDocument;
    expect(renderToStaticMarkup(<RichTextRenderer document={document} renderUnknown={(value) => <aside>{JSON.stringify(value)}</aside>} />))
      .toContain('&quot;userId&quot;:&quot;u1&quot;');

    const schema = createRichTextSchema({ profile: document.profile, nodes: { "com.example/mention": {
      group: "inline", atom: true, attrs: { userId: { required: true, validate: (value) => typeof value === "string" } }, content: null, allowedMarks: "none",
    } } });
    expect(renderToStaticMarkup(<RichTextRenderer document={document} schema={schema} renderExtension={(node) => <b>{String((node as unknown as { attrs: { userId: string } }).attrs.userId)}</b>} />))
      .toBe("<b>u1</b>");
  });

  it("delegates registered extension marks to the host renderer", () => {
    const schema = createRichTextSchema({ profile: "urn:example:marks:1", marks: { "com.example/highlight": {
      attrs: { color: { required: true, validate: (value) => typeof value === "string" } }, excludes: [], rank: 10,
    } } });
    const document = {
      profile: schema.profile,
      id: "doc",
      type: "doc",
      content: [{ id: "p", type: "paragraph", content: [{ id: "t", type: "text", text: "marked", marks: [{ type: "com.example/highlight", attrs: { color: "yellow" } }] }] }],
    } as RichTextDocument;
    expect(renderToStaticMarkup(<RichTextRenderer document={document} schema={schema} renderExtensionMark={(_mark, children) => <mark>{children}</mark>} />))
      .toBe('<p data-rich-text-node-id="p" data-rich-text-container-id="p"><mark><span data-rich-text-node-id="t" data-rich-text-text-id="t">marked</span></mark></p>');
  });

  it("preserves whitespace on the official editable surface without discarding host styles", () => {
    const document: RichTextDocument = {
      profile: richTextSchemaV1.profile,
      id: "doc",
      type: "doc",
      content: [{ id: "p", type: "paragraph", content: [{ id: "text", type: "text", text: "a  b", marks: [] }] }],
    };
    const editor = {
      schema: richTextSchemaV1,
      snapshot: {
        value: document,
        selection: { kind: "range", ranges: [], primaryIndex: null },
        revision: 0,
        canUndo: false,
        canRedo: false,
      },
      subscribe: () => () => {},
    } as unknown as RichTextEditor;

    const html = renderToStaticMarkup(<RichTextEditorSurface
      editor={editor}
      style={{ color: "red", whiteSpace: "normal" }}
    />);

    expect(html).toContain('style="color:red;white-space:pre-wrap"');
    expect(html).toContain(">a  b</span>");
  });
});
