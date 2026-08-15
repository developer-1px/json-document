import type { JSONValue } from "@interactive-os/json-document";
import { getActiveRichTextInstrument } from "./instrument.js";
import {
  hasRichTextContent,
  type RichTextDocument,
  type RichTextNode,
} from "./model.js";

export function contentSegments(path: ReadonlyArray<number>): Array<string | number> {
  return path.flatMap((index) => ["content", index]);
}

export function containerContentSegments(path: ReadonlyArray<number>): Array<string | number> {
  return [...contentSegments(path), "content"];
}

export function nodeAtPath(
  document: RichTextDocument,
  path: ReadonlyArray<number>,
): RichTextDocument | RichTextNode | null {
  let current: RichTextDocument | RichTextNode = document;
  getActiveRichTextInstrument()?.visitNode();
  for (const index of path) {
    if (!hasRichTextContent(current)) return null;
    const children: ReadonlyArray<RichTextNode> = current.content;
    const next = children[index];
    if (next === undefined) return null;
    current = next;
    getActiveRichTextInstrument()?.visitNode();
  }
  return current;
}

export function replaceNodeAtPath(
  document: RichTextDocument,
  path: ReadonlyArray<number>,
  replacement: RichTextNode,
): RichTextDocument {
  if (path.length === 0) throw new TypeError("Cannot replace the Rich Text document root with a node.");
  return update(document, 0) as RichTextDocument;

  function update(node: RichTextDocument | RichTextNode, depth: number): RichTextDocument | RichTextNode {
    getActiveRichTextInstrument()?.visitNode();
    if (!hasRichTextContent(node)) throw new TypeError("Rich Text path does not address a container.");
    const index = path[depth]!;
    if (node.content.length > 32) getActiveRichTextInstrument()?.contentCopy();
    const children = node.content.slice();
    children[index] = depth === path.length - 1
      ? replacement
      : update(children[index]!, depth + 1) as RichTextNode;
    return { ...node, content: children } as RichTextDocument | RichTextNode;
  }
}

export function replaceContentAtPath(
  document: RichTextDocument,
  path: ReadonlyArray<number>,
  content: ReadonlyArray<RichTextNode>,
): RichTextDocument {
  if (path.length === 0) return { ...document, content: content as RichTextDocument["content"] };
  const container = nodeAtPath(document, path);
  if (!container || !hasRichTextContent(container) || container.type === "doc") {
    throw new TypeError("Rich Text path does not address a content container.");
  }
  return replaceNodeAtPath(document, path, { ...container, content } as RichTextNode);
}

export function detachedValue<Value extends JSONValue>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}
