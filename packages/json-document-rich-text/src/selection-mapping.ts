import { collapsedRangeSelection, createRangeSelectionFamily } from "@interactive-os/json-document-selection";
import { hasRichTextContent, isRichTextText, type RichTextDocument, type RichTextNode, type RichTextPoint, type RichTextSelection, type RichTextTarget } from "./model.js";
import { richTextTopology } from "./topology.js";

export function firstSelection(document: RichTextDocument): RichTextSelection {
  const text = findFirstText(document);
  return asRichTextSelection(text
    ? collapsedRangeSelection({ kind: "text", nodeId: text.id, offset: 0, affinity: "forward" })
    : collapsedRangeSelection(firstChildPoint(document)));
}

export function mapSelectionByTextOrder(before: RichTextDocument, after: RichTextDocument, selection: RichTextSelection): RichTextSelection {
  return { ...selection, ranges: selection.ranges.map((range) => ({ anchor: mapPoint(range.anchor), focus: mapPoint(range.focus) })) } as RichTextSelection;
  function mapPoint(point: RichTextPoint): RichTextPoint {
    if (point.kind === "child") return richTextTopology(after).reconcilePoint(point) ?? firstSelection(after).ranges[0]!.anchor;
    return pointAtTextOffset(after, absoluteTextOffset(before, point), point.affinity);
  }
}

export function mapSelectionByExistingIds(selection: RichTextSelection, document: RichTextDocument): RichTextSelection {
  return asRichTextSelection(createRangeSelectionFamily<RichTextPoint, RichTextTarget>().reconcile(selection, { topology: richTextTopology(document) }).state);
}

export function reconcileOrFirst(document: RichTextDocument, point: RichTextPoint): RichTextPoint {
  return richTextTopology(document).reconcilePoint(point) ?? firstSelection(document).ranges[0]!.anchor;
}

export function collapsedAtPoint(point: RichTextPoint): RichTextSelection {
  return asRichTextSelection(collapsedRangeSelection(point));
}

function firstChildPoint(document: RichTextDocument): RichTextPoint {
  let node: RichTextDocument | RichTextNode = document;
  while (hasRichTextContent(node) && node.content.length > 0) {
    const child: RichTextNode = node.content[0]!;
    if (!hasRichTextContent(child) || child.content.length > 0) break;
    node = child;
  }
  return { kind: "child", nodeId: node.id, offset: 0, affinity: "forward" };
}

function findFirstText(node: RichTextDocument | RichTextNode): Extract<RichTextNode, { readonly type: "text" }> | null {
  if (isRichTextText(node)) return node;
  if (!hasRichTextContent(node)) return null;
  for (const child of node.content) {
    const text = findFirstText(child);
    if (text) return text;
  }
  return null;
}

function absoluteTextOffset(document: RichTextDocument, point: Extract<RichTextPoint, { readonly kind: "text" }>): number {
  let total = 0;
  for (const text of allTextNodes(document)) {
    if (text.id === point.nodeId) return total + Math.min(point.offset, text.text.length);
    total += text.text.length;
  }
  return total;
}

function pointAtTextOffset(document: RichTextDocument, absolute: number, affinity: RichTextPoint["affinity"]): RichTextPoint {
  let remaining = absolute;
  const texts = allTextNodes(document);
  for (const text of texts) {
    if (remaining <= text.text.length) return { kind: "text", nodeId: text.id, offset: remaining, affinity };
    remaining -= text.text.length;
  }
  const last = texts.at(-1);
  return last ? { kind: "text", nodeId: last.id, offset: last.text.length, affinity } : firstSelection(document).ranges[0]!.anchor;
}

export function allTextNodes(document: RichTextDocument): Array<Extract<RichTextNode, { readonly type: "text" }>> {
  const output: Array<Extract<RichTextNode, { readonly type: "text" }>> = [];
  visit(document);
  return output;
  function visit(node: RichTextNode | RichTextDocument): void {
    if (isRichTextText(node)) output.push(node);
    else if (hasRichTextContent(node)) node.content.forEach(visit);
  }
}

function asRichTextSelection(selection: import("@interactive-os/json-document-selection").RangeSelection<RichTextPoint>): RichTextSelection {
  return selection as RichTextSelection;
}
