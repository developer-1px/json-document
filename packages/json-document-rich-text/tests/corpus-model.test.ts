import { readFileSync } from "node:fs";
import { createJSONDocument } from "@interactive-os/json-document";
import { describe, expect, it } from "vitest";
import {
  createRichTextEditor,
  type RichTextDocument,
  type RichTextIntent,
} from "../src/index.js";

interface ModelCase {
  readonly id: string;
  readonly initial: RichTextDocument;
  readonly selection: Parameters<typeof createRichTextEditor>[0]["selection"];
  readonly intents: ReadonlyArray<RichTextIntent>;
  readonly expect: {
    readonly operations?: ReadonlyArray<ReadonlyArray<{ readonly op: string; readonly path: string; readonly value?: unknown }>>;
    readonly value?: RichTextDocument;
    readonly selection?: unknown;
    readonly valueLength?: number;
    readonly valueText?: string;
    readonly forbidRootReplace?: boolean;
    readonly undo?: { readonly value?: RichTextDocument };
  };
}

const corpus = JSON.parse(readFileSync(new URL("../../../standards/json-document-rich-text-v1/corpora/model.json", import.meta.url), "utf8")) as {
  readonly suite: string;
  readonly cases: ReadonlyArray<ModelCase>;
};

describe("Official Rich Text model corpus", () => {
  it("is a dedicated model suite", () => {
    expect(corpus.suite).toBe("model");
  });

  for (const entry of corpus.cases) {
    it(entry.id, () => {
      let generated = 0;
      const document = createJSONDocument(entry.initial);
      const editor = createRichTextEditor({
        document,
        ...(entry.selection === undefined ? {} : { selection: entry.selection }),
        createId: () => `generated-${++generated}`,
      });
      const applied = [];
      for (const [index, intent] of entry.intents.entries()) {
        const result = editor.dispatch(intent);
        expect(result.ok, `${entry.id} intent ${index}`).toBe(true);
        if (result.ok) applied.push(result.change?.applied ?? []);
      }
      if (entry.expect.operations) expect(applied).toEqual(entry.expect.operations);
      if (entry.expect.forbidRootReplace) {
        expect(applied.flat().every((operation) => operation.path !== "")).toBe(true);
      }
      if (entry.expect.value) expect(document.value).toEqual(entry.expect.value);
      if (entry.expect.selection) expect(editor.snapshot.selection).toEqual(entry.expect.selection);
      if (entry.expect.valueLength !== undefined) {
        expect((document.value as RichTextDocument).content).toHaveLength(entry.expect.valueLength);
      }
      if (entry.expect.valueText !== undefined) expect(plainText(document.value as RichTextDocument)).toBe(entry.expect.valueText);
      if (entry.expect.undo?.value) {
        expect(editor.undo().ok).toBe(true);
        expect(document.value).toEqual(entry.expect.undo.value);
      }
    });
  }
});

function plainText(document: RichTextDocument): string {
  const texts: string[] = [];
  const visit = (node: { readonly type: string; readonly text?: string; readonly content?: ReadonlyArray<typeof node> }) => {
    if (typeof node.text === "string") texts.push(node.text);
    node.content?.forEach(visit);
  };
  visit(document);
  return texts.join("");
}
