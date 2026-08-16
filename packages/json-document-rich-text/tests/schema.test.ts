import { createJSONDocument } from "@interactive-os/json-document";
import { describe, expect, it } from "vitest";
import {
  createRichTextSchema,
  createRichTextTopology,
  normalizeRichText,
  validateRichText,
  tryCreateRichTextEditor,
  type RichTextDocument,
  type RichTextClipboard,
} from "../src/index.js";

const canonical: RichTextDocument = {
  profile: "urn:interactive-os:json-document:rich-text:1",
  id: "document-1",
  type: "doc",
  content: [
    {
      id: "quote-1",
      type: "blockquote",
      content: [{ id: "paragraph-1", type: "paragraph", content: [] }],
    },
    {
      id: "list-1",
      type: "orderedList",
      attrs: { start: 2 },
      content: [{
        id: "item-1",
        type: "listItem",
        content: [{
          id: "paragraph-2",
          type: "paragraph",
          content: [{ id: "text-1", type: "text", text: "All nodes", marks: [{ type: "strong" }] }],
        }],
      }],
    },
    {
      id: "code-1",
      type: "codeBlock",
      attrs: { language: "ts" },
      content: [{ id: "text-code", type: "text", text: "const x = 1", marks: [] }],
    },
  ],
};

describe("Official Rich Text schema", () => {
  it("validates every official container and reports stable semantic failures", () => {
    expect(validateRichText(canonical)).toEqual({ ok: true });
    expect(validateRichText({ ...canonical, content: [] })).toMatchObject({ ok: false, code: "rich-text.schema-violation" });
    expect(validateRichText({
      ...canonical,
      content: [{ id: "code", type: "codeBlock", attrs: { language: null }, content: [
        { id: "text", type: "text", text: "x", marks: [{ type: "strong" }] },
      ] }],
    })).toMatchObject({ ok: false, code: "rich-text.schema-violation", pointer: "/content/0/content/0/marks" });
    expect(validateRichText({ ...canonical, content: [{ id: "document-1", type: "paragraph", content: [] }] }))
      .toMatchObject({ ok: false, code: "rich-text.duplicate-id", nodeId: "document-1" });
  });

  it("normalizes marks, adjacent text, empty text, and an empty document deterministically", () => {
    const result = normalizeRichText({
      profile: canonical.profile,
      id: "document-1",
      type: "doc",
      content: [{
        id: "paragraph-1",
        type: "paragraph",
        content: [
          { id: "text-1", type: "text", text: "A", marks: [{ type: "strong" }, { type: "link", attrs: { href: "/a" } }] },
          { id: "text-2", type: "text", text: "B", marks: [{ type: "link", attrs: { href: "/a" } }, { type: "strong" }] },
          { id: "empty", type: "text", text: "", marks: [] },
        ],
      }],
    });
    expect(result).toMatchObject({
      ok: true,
      value: { content: [{ content: [{ id: "text-1", text: "AB", marks: [{ type: "link" }, { type: "strong" }] }] }] },
      operations: [{ op: "replace", path: "/content/0/content" }],
    });

    expect(normalizeRichText({ profile: canonical.profile, id: "empty", type: "doc", content: [] }, { createId: () => "paragraph-new" }))
      .toMatchObject({ ok: true, value: { content: [{ id: "paragraph-new", type: "paragraph", content: [] }] } });

    const leading = normalizeRichText({
      profile: canonical.profile,
      id: "leading-doc",
      type: "doc",
      content: [{ id: "p", type: "paragraph", content: [
        { id: "empty-leading", type: "text", text: "", marks: [] },
        { id: "next", type: "text", text: "🙂", marks: [] },
      ] }],
    });
    expect(leading.ok && leading.mapping.mapPoint({ kind: "text", nodeId: "empty-leading", offset: 0, affinity: "forward" }))
      .toEqual({ kind: "text", nodeId: "next", offset: 0, affinity: "forward" });
  });

  it("reuses canonical subtree identity only for explicitly borrowed immutable input", () => {
    const detached = normalizeRichText(canonical);
    const borrowed = normalizeRichText(canonical, { inputOwnership: "borrowed" });

    expect(detached.ok && detached.value).not.toBe(canonical);
    expect(borrowed.ok && borrowed.value).toBe(canonical);
    expect(borrowed.ok && borrowed.operations).toEqual([]);
  });

  it("orders child boundaries, atoms, and Unicode scalar points in logical topology", () => {
    const document: RichTextDocument = {
      profile: canonical.profile,
      id: "topology-doc",
      type: "doc",
      content: [{ id: "p", type: "paragraph", content: [
        { id: "emoji", type: "text", text: "🙂", marks: [] },
        { id: "break", type: "hardBreak" },
        { id: "tail", type: "text", text: "x", marks: [] },
      ] }],
    };
    const topology = createRichTextTopology(document);
    expect(topology.interval(
      { kind: "child", nodeId: "p", offset: 1, affinity: "forward" },
      { kind: "child", nodeId: "p", offset: 2, affinity: "forward" },
    )).toEqual([{ kind: "node", nodeId: "break" }]);
    expect(topology.reconcilePoint({ kind: "text", nodeId: "emoji", offset: 1, affinity: "backward" })).toMatchObject({ offset: 0 });
    expect(topology.reconcilePoint({ kind: "text", nodeId: "emoji", offset: 1, affinity: "forward" })).toMatchObject({ offset: 2 });
  });

  it("constructs an immutable namespaced extension without overriding official types", () => {
    const mention = {
      group: "inline" as const,
      atom: true,
      attrs: { userId: { required: true, validate: (value: unknown) => typeof value === "string" } },
      content: null,
      allowedMarks: "none" as const,
    };
    const schema = createRichTextSchema({ profile: "urn:example:rich-text:1", nodes: { "com.example/mention": mention } });
    expect(schema.nodes["com.example/mention"]).not.toBe(mention);
    expect(Object.isFrozen(mention)).toBe(false);
    expect(schema.nodes.paragraph?.content?.allowedTypes).toContain("com.example/mention");
    expect(validateRichText({
      profile: "urn:example:rich-text:1",
      id: "extension-doc",
      type: "doc",
      content: [{ id: "p", type: "paragraph", content: [{ id: "mention", type: "com.example/mention", attrs: { userId: "u1" } }] }],
    }, { schema })).toEqual({ ok: true });
    expect(Object.isFrozen(schema)).toBe(true);
    expect(() => createRichTextSchema({ profile: "relative", nodes: { "com.example/mention": mention } })).toThrow(TypeError);
  });

  it("reports unavailable profiles without changing the JSONDocument", () => {
    const value = { profile: "urn:unavailable:rich-text:1", id: "raw", type: "doc", content: [{ id: "raw-node", type: "com.example/raw", attrs: { value: 1 } }] };
    const document = createJSONDocument(value);
    expect(tryCreateRichTextEditor({ document })).toMatchObject({ ok: false, code: "rich-text.profile-unavailable", pointer: "/profile" });
    expect(document.value).toEqual(value);
  });

  it("edits extension profiles and remaps declared slice node references", () => {
    const reference = {
      group: "block" as const,
      atom: true,
      attrs: { target: { required: true, nodeReference: true, validate: (value: unknown) => typeof value === "string" } },
      content: null,
      allowedMarks: "none" as const,
    };
    const schema = createRichTextSchema({ profile: "urn:example:references:1", nodes: { "com.example/reference": reference } });
    const document = createJSONDocument({
      profile: schema.profile,
      id: "doc",
      type: "doc",
      content: [{ id: "p", type: "paragraph", content: [] }],
    });
    const created = ["new-a", "new-b"];
    const result = tryCreateRichTextEditor({
      document,
      schema,
      selection: { kind: "range", ranges: [{
        anchor: { kind: "child", nodeId: "doc", offset: 1, affinity: "forward" },
        focus: { kind: "child", nodeId: "doc", offset: 1, affinity: "forward" },
      }], primaryIndex: 0 },
      createId: () => created.shift()!,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const clipboard: RichTextClipboard = {
      type: "application/vnd.interactive-os.rich-text+json",
      slice: { profile: schema.profile, openStart: 0, openEnd: 0, content: [
        { id: "old-a", type: "com.example/reference", attrs: { target: "old-b" } },
        { id: "old-b", type: "com.example/reference", attrs: { target: "old-b" } },
      ] },
      text: "",
      html: "",
    };
    expect(result.editor.dispatch({ type: "clipboard.paste", clipboard }).ok).toBe(true);
    expect(document.value).toMatchObject({ content: [
      { id: "p" },
      { id: "new-a", attrs: { target: "new-b" } },
      { id: "new-b", attrs: { target: "new-b" } },
    ] });
  });
});
