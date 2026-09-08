import { readPointer, type JSONDocument, type JSONValue, type Pointer } from "@interactive-os/json-document";
import { getActiveRichTextInstrument } from "./instrument.js";
import { hasRichTextContent, isRichTextDocument, type RichTextDocument, type RichTextNode } from "./model.js";
import type { RichTextSchema } from "./schema.js";
import { validateRichText, validateRichTextPath, validateRichTextNodeAt, validateRichTextContentSize, type RichTextValidationResult } from "./validation.js";
import { richTextTopology } from "./topology.js";
import { nodeAtPath } from "./path.js";

export function readRichTextDocument(document: JSONDocument, pointer: Pointer): RichTextDocument {
  const result = document.at(pointer);
  if (!result.ok || !isRichTextDocument(result.value)) throw new TypeError(`Rich Text document was not found at ${JSON.stringify(pointer)}.`);
  return result.value;
}

export function readRichTextSnapshot(value: JSONValue, pointer: Pointer): RichTextDocument {
  const result = readPointer(value, pointer);
  if (!result.ok || !isRichTextDocument(result.value)) throw new TypeError(`Rich Text document was not found at ${JSON.stringify(pointer)}.`);
  return result.value;
}

export function validateLocalOrFallback(next: RichTextDocument, path: ReadonlyArray<number>, schema: RichTextSchema): ReturnType<typeof validateRichText> {
  const incremental = validateRichTextPath(next, path, { schema });
  if (incremental.ok) return incremental;
  getActiveRichTextInstrument()?.validate("full-fallback");
  return validateRichText(next, { schema });
}

/** Validate a replacement forest against its parent and the surviving document IDs. */
export function validateReplacementNodes(
  document: RichTextDocument,
  parentPath: ReadonlyArray<number>,
  nodes: ReadonlyArray<RichTextNode>,
  removedPaths: ReadonlyArray<ReadonlyArray<number>>,
  schema: RichTextSchema,
  insertedIds = new Set<string>(),
): RichTextValidationResult {
  const topology = richTextTopology(document);
  for (const node of nodes) {
    const validation = validateRichTextNodeAt(document, [...parentPath, 0], node, { schema });
    if (!validation.ok) return validation;
    const identity = visit(node);
    if (!identity.ok) return identity;
  }
  return { ok: true };

  function visit(node: RichTextNode): RichTextValidationResult {
    const existing = topology.locate(node.id);
    if (insertedIds.has(node.id) || (existing && !removedPaths.some((path) => (
      path.length <= existing.path.length && path.every((index, depth) => existing.path[depth] === index)
    )))) {
      return { ok: false, code: "rich-text.duplicate-id", reason: `Duplicate node id ${JSON.stringify(node.id)}.`, nodeId: node.id };
    }
    insertedIds.add(node.id);
    if (hasRichTextContent(node)) {
      for (const child of node.content) {
        const result = visit(child);
        if (!result.ok) return result;
      }
    }
    return { ok: true };
  }
}

export function validateContentSize(document: RichTextDocument, path: ReadonlyArray<number>, delta: number, schema: RichTextSchema): RichTextValidationResult {
  const node = nodeAtPath(document, path);
  if (!node || !hasRichTextContent(node)) return { ok: false, code: "rich-text.schema-violation", reason: "Target must be a content container." };
  return validateRichTextContentSize(node.type, node.content.length + delta, schema);
}
