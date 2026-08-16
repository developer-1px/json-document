import { readFileSync } from "node:fs";
import { createJSONDocument } from "@interactive-os/json-document";
import { describe, expect, it } from "vitest";
import {
  createRichTextEditor,
  normalizeRichText,
  validateRichText,
  type RichTextDocument,
  type RichTextIntent,
} from "../src/index.js";

interface VectorCase {
  readonly id: string;
  readonly kind: string;
  readonly value?: unknown;
  readonly expect: Record<string, unknown>;
  readonly intents?: ReadonlyArray<RichTextIntent["type"]>;
}

const vectors = JSON.parse(readFileSync(new URL("../../../standards/json-document-rich-text-v1/conformance/vectors/rich-text.json", import.meta.url), "utf8")) as {
  readonly cases: ReadonlyArray<VectorCase>;
};

describe("Official Rich Text executable conformance vectors", () => {
  for (const vector of vectors.cases.filter((entry) => entry.kind === "schema" || entry.kind === "semantic-validation")) {
    it(vector.id, () => {
      const result = validateRichText(vector.value);
      if (vector.expect.semanticValid === true) expect(result).toEqual({ ok: true });
      if (typeof vector.expect.code === "string") expect(result).toMatchObject({ ok: false, code: vector.expect.code });
    });
  }

  it("normalization-is-explicit-and-deterministic", () => {
    const vector = required("normalization-is-explicit-and-deterministic");
    const ids = [...((vector as unknown as { readonly createIds: ReadonlyArray<string> }).createIds)];
    const result = normalizeRichText(vector.value, { createId: () => ids.shift() ?? "unexpected-id" });
    const expected = vector.expect as { readonly value: unknown; readonly operations: unknown };
    expect(result).toMatchObject({ ok: true, value: expected.value, operations: expected.operations });
  });

  it("official-intent-family-is-complete", () => {
    const vector = required("official-intent-family-is-complete");
    expect(vector.intents).toEqual([
      "selection.set", "selection.remove", "text.insert", "text.delete", "mark.toggle",
      "block.split", "block.join", "block.set-type", "node.insert", "node.remove",
      "node.move", "node.set-attrs", "clipboard.paste",
    ] satisfies ReadonlyArray<RichTextIntent["type"]>);
    const editor = createRichTextEditor({ document: createJSONDocument({
      profile: "urn:interactive-os:json-document:rich-text:1",
      id: "doc",
      type: "doc",
      content: [{ id: "p", type: "paragraph", content: [{ id: "t", type: "text", text: "ab", marks: [] }] }],
    } satisfies RichTextDocument) });
    expect(editor.dispatch({ type: "text.insert", text: "X" }).ok).toBe(true);
  });
});

function required(id: string): VectorCase {
  const vector = vectors.cases.find((entry) => entry.id === id);
  if (!vector) throw new Error(`Missing vector ${id}`);
  return vector;
}
