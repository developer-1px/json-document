import {
  buildPointer,
  parsePointer,
  type JSONDocument,
  type JSONPatchOperation,
  type Pointer,
} from "@interactive-os/json-document";
import {
  createEditingSession,
  type EditingResult,
  type EditingSnapshot,
} from "@interactive-os/json-document-editing";
import {
  collapsedRangeSelection,
  createRangeSelectionFamily,
  emptyRangeSelection,
  primaryRange,
  type RangeSelection,
  type RangeSelectionMapping,
  type SelectionRange,
} from "@interactive-os/json-document-selection";
import {
  hasRichTextContent,
  isRichTextDocument,
  isRichTextText,
  type RichTextDocument,
  type RichTextNode,
  type RichTextPoint,
  type RichTextSelection,
  type RichTextTarget,
} from "./model.js";
import { createRichTextTopology, type RichTextTopology } from "./topology.js";

export type RichTextIntent =
  | { readonly type: "selection.set"; readonly selection: RichTextSelection }
  | { readonly type: "selection.remove" }
  | { readonly type: "text.insert"; readonly text: string }
  | { readonly type: "text.delete"; readonly direction: "backward" | "forward"; readonly unit: "character" };

export interface RichTextEditor {
  readonly snapshot: EditingSnapshot<RichTextSelection>;
  readonly pointer: Pointer;
  readonly topology: RichTextTopology;
  dispatch(intent: RichTextIntent): EditingResult<RichTextSelection>;
  undo(): EditingResult<RichTextSelection>;
  redo(): EditingResult<RichTextSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<RichTextSelection>) => void): () => void;
}

export function createRichTextEditor(options: {
  readonly document: JSONDocument;
  readonly pointer?: Pointer;
  readonly selection?: RichTextSelection;
}): RichTextEditor {
  const pointer = options.pointer ?? "";
  const initial = readDocument(options.document, pointer);
  const initialTopology = createRichTextTopology(initial);
  const selectionFamily = createRangeSelectionFamily<RichTextPoint, RichTextTarget>();
  const session = createEditingSession<RichTextSelection>({
    document: options.document,
    selection: options.selection === undefined
      ? firstSelection(initial)
      : asRichTextSelection(selectionFamily.reconcile(options.selection, { topology: initialTopology }).state),
  });

  return {
    get snapshot() { return session.snapshot; },
    pointer,
    get topology() { return createRichTextTopology(value()); },
    dispatch(intent) {
      if (intent.type === "selection.set") {
        const selection = asRichTextSelection(
          selectionFamily.reconcile(intent.selection, { topology: createRichTextTopology(value()) }).state,
        );
        return { ok: true, snapshot: session.select(selection) };
      }
      if (intent.type === "selection.remove") return replaceSelection("");
      if (intent.type === "text.insert") return replaceSelection(intent.text);
      return deleteCharacter(intent.direction);
    },
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };

  function value(): RichTextDocument {
    return readDocument(options.document, pointer);
  }

  function replaceSelection(
    text: string,
    targetRange?: SelectionRange<RichTextPoint>,
  ): EditingResult<RichTextSelection> {
    const range = targetRange ?? primaryRange(session.snapshot.selection);
    if (!range) return failure("rich-text.selection-empty");
    if (range.anchor.kind !== "text" || range.focus.kind !== "text" || range.anchor.nodeId !== range.focus.nodeId) {
      return failure("rich-text.intent-unsupported");
    }
    const current = value();
    const located = findText(current, range.anchor.nodeId);
    if (!located) return failure("rich-text.point-not-found");
    const start = Math.min(range.anchor.offset, range.focus.offset);
    const end = Math.max(range.anchor.offset, range.focus.offset);
    if (!validOffset(located.node.text, start) || !validOffset(located.node.text, end)) {
      return failure("rich-text.invalid-offset");
    }
    if (start === end && text.length === 0) return success(session.snapshot);
    const nextText = located.node.text.slice(0, start) + text + located.node.text.slice(end);
    const operations: ReadonlyArray<JSONPatchOperation> = [{
      op: "replace",
      path: absolutePath(pointer, [...located.path, "text"]),
      value: nextText,
    }];
    const nextDocument = replaceText(current, located.node.id, nextText);
    const mapping = replaceMapping(located.node.id, start, end, text.length);
    const selectionAfter = asRichTextSelection(selectionFamily.map(
      session.snapshot.selection,
      mapping,
      { topology: createRichTextTopology(nextDocument) },
    ).state);
    return session.apply({
      operations,
      selectionAfter,
      origin: text.length === 0 ? "rich-text.selection.remove" : "rich-text.text.insert",
      historyGroup: "rich-text.typing",
    });
  }

  function deleteCharacter(direction: "backward" | "forward"): EditingResult<RichTextSelection> {
    const range = primaryRange(session.snapshot.selection);
    if (!range) return failure("rich-text.selection-empty");
    if (range.anchor.kind !== "text" || range.focus.kind !== "text" || range.anchor.nodeId !== range.focus.nodeId) {
      return failure("rich-text.intent-unsupported");
    }
    if (range.anchor.offset !== range.focus.offset) return replaceSelection("");
    const located = findText(value(), range.anchor.nodeId);
    if (!located) return failure("rich-text.point-not-found");
    const offset = range.anchor.offset;
    const boundary = direction === "backward"
      ? previousScalarOffset(located.node.text, offset)
      : nextScalarOffset(located.node.text, offset);
    if (boundary === offset) return success(session.snapshot);
    const selection = {
      kind: "range",
      ranges: [{
        anchor: { ...range.anchor, offset: Math.min(offset, boundary), affinity: "forward" },
        focus: { ...range.focus, offset: Math.max(offset, boundary), affinity: "forward" },
      }],
      primaryIndex: 0,
    } satisfies RichTextSelection;
    return replaceSelection("", selection.ranges[0]);
  }
}

function readDocument(document: JSONDocument, pointer: Pointer): RichTextDocument {
  const result = document.at(pointer);
  if (!result.ok || !isRichTextDocument(result.value)) {
    throw new TypeError(`Rich Text document was not found at ${JSON.stringify(pointer)}.`);
  }
  createRichTextTopology(result.value);
  return result.value;
}

function firstSelection(document: RichTextDocument): RichTextSelection {
  const text = findFirstText(document);
  return asRichTextSelection(text
    ? collapsedRangeSelection({ kind: "text", nodeId: text.id, offset: 0, affinity: "forward" })
    : emptyRangeSelection());
}

function findFirstText(node: RichTextDocument | RichTextNode): ReturnType<typeof asText> {
  if (node.type === "text") return asText(node);
  if (!hasRichTextContent(node)) return null;
  for (const child of node.content) {
    const text = findFirstText(child);
    if (text) return text;
  }
  return null;
}

function asText(node: RichTextNode): Extract<RichTextNode, { readonly type: "text" }> | null {
  return isRichTextText(node) ? node : null;
}

function findText(
  node: RichTextDocument | RichTextNode,
  id: string,
  path: ReadonlyArray<string | number> = [],
): { readonly node: Extract<RichTextNode, { readonly type: "text" }>; readonly path: ReadonlyArray<string | number> } | null {
  if (node.type === "text") return node.id === id && isRichTextText(node) ? { node, path } : null;
  if (!hasRichTextContent(node)) return null;
  for (let index = 0; index < node.content.length; index += 1) {
    const found = findText(node.content[index]!, id, [...path, "content", index]);
    if (found) return found;
  }
  return null;
}

function replaceText(document: RichTextDocument, id: string, text: string): RichTextDocument {
  return replace(document) as RichTextDocument;

  function replace(node: RichTextDocument | RichTextNode): RichTextDocument | RichTextNode {
    if (node.type === "text" && isRichTextText(node)) return node.id === id ? { ...node, text } : node;
    if (!hasRichTextContent(node)) return node;
    return { ...node, content: node.content.map(replace) } as RichTextDocument | RichTextNode;
  }
}

function replaceMapping(nodeId: string, start: number, end: number, insertedLength: number): RangeSelectionMapping<RichTextPoint> {
  return {
    mapPoint(point) {
      if (point.kind !== "text" || point.nodeId !== nodeId) return point;
      if (point.offset < start) return point;
      if (point.offset > end) return { ...point, offset: point.offset + insertedLength - (end - start) };
      if (start === end && point.affinity === "backward") return point;
      return { ...point, offset: start + insertedLength };
    },
  };
}

function absolutePath(pointer: Pointer, segments: ReadonlyArray<string | number>): Pointer {
  return buildPointer([...parsePointer(pointer), ...segments]);
}

function validOffset(text: string, offset: number): boolean {
  if (!Number.isInteger(offset) || offset < 0 || offset > text.length) return false;
  if (offset === 0 || offset === text.length) return true;
  const previous = text.charCodeAt(offset - 1);
  const next = text.charCodeAt(offset);
  return !(previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff);
}

function previousScalarOffset(text: string, offset: number): number {
  if (offset <= 0) return 0;
  const previous = text.charCodeAt(offset - 1);
  if (previous >= 0xdc00 && previous <= 0xdfff && offset >= 2) return offset - 2;
  return offset - 1;
}

function nextScalarOffset(text: string, offset: number): number {
  if (offset >= text.length) return text.length;
  const current = text.charCodeAt(offset);
  if (current >= 0xd800 && current <= 0xdbff && offset + 1 < text.length) return offset + 2;
  return offset + 1;
}

function success(snapshot: EditingSnapshot<RichTextSelection>): EditingResult<RichTextSelection> {
  return { ok: true, snapshot };
}

function failure(code: string): EditingResult<RichTextSelection> {
  return { ok: false, code };
}

function asRichTextSelection(selection: RangeSelection<RichTextPoint>): RichTextSelection {
  return selection as RichTextSelection;
}
