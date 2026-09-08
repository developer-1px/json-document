import { buildPointer, createJSONDocument } from "@interactive-os/json-document";
import { describe, expect, test } from "vitest";
import { createRichTextEditor, type RichTextDocument, type RichTextPoint } from "../src/index.js";

function rich(text: string): RichTextDocument {
  return { profile: "urn:interactive-os:json-document:rich-text:1", id: "doc", type: "doc", content: [
    { id: "p", type: "paragraph", content: [{ id: "t", type: "text", text, marks: [] }] },
  ] };
}

describe.each([true, false])("external Rich Text positions (observed: %s)", (observed) => {
  test.each([
    { before: "abcd", after: "Xabcd", offset: 2, expected: 3, affinity: "forward" },
    { before: "abcd", after: "acd", offset: 3, expected: 2, affinity: "forward" },
    { before: "abcd", after: "abXcd", offset: 2, expected: 3, affinity: "forward" },
    { before: "abcd", after: "abXcd", offset: 2, expected: 2, affinity: "backward" },
    { before: "abcd", after: "aXd", offset: 2, expected: 2, affinity: "forward" },
    { before: "abcd", after: "aXd", offset: 2, expected: 1, affinity: "backward" },
    { before: "abcd", after: "😀abcd", offset: 2, expected: 4, affinity: "forward" },
    { before: "a😀b", after: "a😁b", offset: 3, expected: 3, affinity: "forward" },
  ] as const)("$before → $after preserves offset $offset ($affinity)", ({ before, after, offset, expected, affinity }) => {
    const document = createJSONDocument(rich(before));
    const point: RichTextPoint = { kind: "text", nodeId: "t", offset, affinity };
    const editor = createRichTextEditor({ document, selection: {
      kind: "range", ranges: [{ anchor: point, focus: point }], primaryIndex: 0,
    } });
    const published: number[] = [];
    const release = observed ? editor.subscribe((snapshot) => published.push(snapshot.selection.ranges[0]!.focus.offset)) : () => {};
    expect(document.commit([{ op: "replace", path: "/content/0/content/0/text", value: after }]).ok).toBe(true);
    expect(editor.snapshot.selection.ranges[0]!.focus.offset).toBe(expected);
    if (observed) expect(published).toEqual([expected]);
    expect(editor.dispatch({ type: "text.insert", text: "!" }).ok).toBe(true);
    expect(document.at("/content/0/content/0/text")).toMatchObject({ ok: true, value: after.slice(0, expected) + "!" + after.slice(expected) });
    release();
  });
});

test("maps only the bound subtree through an escaped pointer", () => {
  const document = createJSONDocument({ "a/b~c": rich("abcd"), adjacent: rich("other") });
  const pointer = buildPointer(["a/b~c"]);
  const point: RichTextPoint = { kind: "text", nodeId: "t", offset: 2, affinity: "forward" };
  const editor = createRichTextEditor({ document, pointer, selection: {
    kind: "range", ranges: [{ anchor: point, focus: point }], primaryIndex: 0,
  } });
  document.commit([{ op: "replace", path: pointer + "/content/0/content/0/text", value: "Xabcd" }]);
  expect(editor.snapshot.selection.ranges[0]!.focus.offset).toBe(3);
  document.commit([{ op: "replace", path: "/adjacent/content/0/content/0/text", value: "unrelated" }]);
  expect(editor.snapshot.selection.ranges[0]!.focus.offset).toBe(3);
});
