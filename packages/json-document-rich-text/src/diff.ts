import { buildPointer, type JSONPatchOperation, type Pointer } from "@interactive-os/json-document";
import { hasRichTextContent, isRichTextText, type RichTextDocument, type RichTextNode } from "./model.js";
import { detachedValue } from "./path.js";

export function diffRichText(
  before: RichTextDocument,
  after: RichTextDocument,
  rootPointer: Pointer = "",
): ReadonlyArray<JSONPatchOperation> {
  if (before === after) return [];
  const operations = diffNode(before, after, parseSegments(rootPointer));
  return operations.length === 0 && before !== after
    ? [{ op: "replace", path: rootPointer, value: detachedValue(after) }]
    : operations;
}

function diffNode(
  before: RichTextDocument | RichTextNode,
  after: RichTextDocument | RichTextNode,
  segments: ReadonlyArray<string | number>,
): JSONPatchOperation[] {
  if (before === after) return [];
  if (before.id !== after.id || before.type !== after.type) {
    return [{ op: "replace", path: buildPointer(segments), value: detachedValue(after) }];
  }
  const operations: JSONPatchOperation[] = [];
  if (isRichTextText(before) && isRichTextText(after)) {
    if (before.text !== after.text) {
      operations.push({ op: "replace", path: buildPointer([...segments, "text"]), value: after.text });
    }
    if (JSON.stringify(before.marks) !== JSON.stringify(after.marks)) {
      operations.push({ op: "replace", path: buildPointer([...segments, "marks"]), value: detachedValue(after.marks) });
    }
    return operations;
  }
  const beforeRecord = before as { readonly attrs?: import("@interactive-os/json-document").JSONValue };
  const afterRecord = after as { readonly attrs?: import("@interactive-os/json-document").JSONValue };
  if (JSON.stringify(beforeRecord.attrs) !== JSON.stringify(afterRecord.attrs) && afterRecord.attrs !== undefined) {
    operations.push({ op: "replace", path: buildPointer([...segments, "attrs"]), value: detachedValue(afterRecord.attrs) });
  }
  if (!hasRichTextContent(before) || !hasRichTextContent(after)) return operations;
  operations.push(...diffContent(before.content, after.content, [...segments, "content"]));
  return operations;
}

function diffContent(
  before: ReadonlyArray<RichTextNode>,
  after: ReadonlyArray<RichTextNode>,
  segments: ReadonlyArray<string | number>,
): JSONPatchOperation[] {
  if (before === after) return [];
  const beforeIds = before.map((node) => node.id);
  const afterIds = after.map((node) => node.id);
  if (sameIds(beforeIds, afterIds)) {
    return before.flatMap((node, index) => diffNode(node, after[index]!, [...segments, index]));
  }
  const afterSet = new Set(afterIds);
  const beforeSet = new Set(beforeIds);
  const sharedBefore = beforeIds.filter((id) => afterSet.has(id));
  const sharedAfter = afterIds.filter((id) => beforeSet.has(id));
  if (!sameIds(sharedBefore, sharedAfter)) {
    return [{ op: "replace", path: buildPointer(segments), value: detachedValue(after) }];
  }
  const operations: JSONPatchOperation[] = [];
  for (let index = before.length - 1; index >= 0; index -= 1) {
    if (afterSet.has(before[index]!.id)) continue;
    operations.push({ op: "remove", path: buildPointer([...segments, index]) });
  }
  const remaining = before.filter((node) => afterSet.has(node.id));
  after.forEach((node, index) => {
    if (!beforeSet.has(node.id)) {
      operations.push({ op: "add", path: buildPointer([...segments, index]), value: detachedValue(node) });
      return;
    }
    const previous = remaining.find((candidate) => candidate.id === node.id);
    if (previous) operations.push(...diffNode(previous, node, [...segments, index]));
  });
  return operations;
}

function sameIds(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function parseSegments(pointer: Pointer): Array<string | number> {
  if (pointer === "") return [];
  return pointer.slice(1).split("/").map((segment) => {
    const index = Number(segment);
    return Number.isInteger(index) && String(index) === segment ? index : segment;
  });
}
