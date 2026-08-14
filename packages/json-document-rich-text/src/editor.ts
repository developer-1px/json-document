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
  RICH_TEXT_CLIPBOARD_MIME,
  RICH_TEXT_PROFILE_V1,
  type RichTextClipboard,
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
  | { readonly type: "text.insert"; readonly text: string; readonly historyGroup?: string }
  | { readonly type: "text.delete"; readonly direction: "backward" | "forward"; readonly unit: "character" }
  | { readonly type: "block.split" }
  | { readonly type: "block.join"; readonly direction: "backward" | "forward" }
  | { readonly type: "clipboard.paste"; readonly clipboard: RichTextClipboard };

export interface RichTextEditor {
  readonly snapshot: EditingSnapshot<RichTextSelection>;
  readonly pointer: Pointer;
  readonly topology: RichTextTopology;
  dispatch(intent: RichTextIntent): EditingResult<RichTextSelection>;
  copy(): RichTextClipboard | null;
  cut(): { readonly clipboard: RichTextClipboard; readonly result: EditingResult<RichTextSelection> } | null;
  undo(): EditingResult<RichTextSelection>;
  redo(): EditingResult<RichTextSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<RichTextSelection>) => void): () => void;
}

export function createRichTextEditor(options: {
  readonly document: JSONDocument;
  readonly pointer?: Pointer;
  readonly selection?: RichTextSelection;
  readonly createId?: () => string;
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

  let nextId = 0;
  const createId = options.createId ?? (() => `rich-text-${Date.now().toString(36)}-${++nextId}`);

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
      if (intent.type === "text.insert") return replaceSelection(intent.text, undefined, intent.historyGroup);
      if (intent.type === "text.delete") return deleteCharacter(intent.direction);
      if (intent.type === "block.split") return splitBlock();
      if (intent.type === "block.join") return joinBlock(intent.direction);
      return pasteClipboard(intent.clipboard);
    },
    copy: copySelection,
    cut() {
      const clipboard = copySelection();
      if (clipboard === null) return null;
      return { clipboard, result: replaceSelection("") };
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
    historyGroup = "rich-text.typing",
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
      historyGroup,
    });
  }

  function copySelection(): RichTextClipboard | null {
    const range = primaryRange(session.snapshot.selection);
    if (!range || range.anchor.kind !== "text" || range.focus.kind !== "text" || range.anchor.nodeId !== range.focus.nodeId) {
      return null;
    }
    const located = findText(value(), range.anchor.nodeId);
    if (!located) return null;
    const start = Math.min(range.anchor.offset, range.focus.offset);
    const end = Math.max(range.anchor.offset, range.focus.offset);
    if (start === end || !validOffset(located.node.text, start) || !validOffset(located.node.text, end)) return null;
    const text = located.node.text.slice(start, end);
    return {
      type: RICH_TEXT_CLIPBOARD_MIME,
      slice: {
        profile: RICH_TEXT_PROFILE_V1,
        content: [{ ...located.node, text }],
        openStart: 1,
        openEnd: 1,
      },
      text,
      html: "",
    };
  }

  function pasteClipboard(clipboard: RichTextClipboard): EditingResult<RichTextSelection> {
    if (clipboard.type !== RICH_TEXT_CLIPBOARD_MIME || clipboard.slice.profile !== RICH_TEXT_PROFILE_V1) {
      return failure("rich-text.clipboard-invalid");
    }
    const range = primaryRange(session.snapshot.selection);
    if (!range || range.anchor.kind !== "text" || range.focus.kind !== "text" || range.anchor.nodeId !== range.focus.nodeId) {
      return failure("rich-text.intent-unsupported");
    }
    const current = value();
    const located = findText(current, range.anchor.nodeId);
    const block = located ? findTextBlock(current, located.node.id) : null;
    if (!located || !block) return failure("rich-text.point-not-found");
    const start = Math.min(range.anchor.offset, range.focus.offset);
    const end = Math.max(range.anchor.offset, range.focus.offset);
    const before = located.node.text.slice(0, start);
    const after = located.node.text.slice(end);
    if (clipboard.slice.openStart === 0 && clipboard.slice.openEnd === 0) {
      const remappedBlocks = clipboard.slice.content.map((node) => remapNodeIds(node, createId));
      const last = findLastText(remappedBlocks);
      if (!last) return failure("rich-text.clipboard-invalid");
      const textIndex = block.node.content.findIndex((node) => node.id === located.node.id);
      const prefix = [
        ...block.node.content.slice(0, textIndex),
        ...(before.length > 0 ? [{ ...located.node, text: before }] : []),
      ];
      const suffix = [
        ...(after.length > 0 ? [{ ...located.node, id: createId(), text: after }] : []),
        ...block.node.content.slice(textIndex + 1),
      ];
      const replacement: RichTextNode[] = [
        ...(prefix.length > 0 ? [{ ...block.node, content: prefix } as RichTextBlock] : []),
        ...remappedBlocks,
        ...(suffix.length > 0 ? [{ id: createId(), type: "paragraph", content: suffix } as RichTextBlock] : []),
      ];
      const next = replaceTopLevelBlock(current, block.node.id, replacement);
      return session.apply({
        operations: [{ op: "replace", path: absolutePath(pointer, []), value: detached(next) }],
        selectionAfter: collapsedAt(last.id, last.text.length),
        origin: "rich-text.clipboard.paste",
        historyGroup: "rich-text.clipboard.paste",
      });
    }
    const inserted = collectTexts(clipboard.slice.content);
    if (inserted.length === 0) return replaceSelection(clipboard.text, undefined, "rich-text.clipboard.paste");
    const remapped = inserted.map((node) => ({ ...node, id: createId() }));
    const replacement = [
      ...(before.length > 0 ? [{ ...located.node, text: before }] : []),
      ...remapped,
      ...(after.length > 0 ? [{ ...located.node, id: createId(), text: after }] : []),
    ];
    const next = replaceBlockContent(current, block.node.id, located.node.id, replacement);
    const last = remapped.at(-1)!;
    const selectionAfter = collapsedAt(last.id, last.text.length);
    return session.apply({
      operations: [{ op: "replace", path: absolutePath(pointer, []), value: detached(next) }],
      selectionAfter,
      origin: "rich-text.clipboard.paste",
      historyGroup: "rich-text.clipboard.paste",
    });
  }

  function splitBlock(): EditingResult<RichTextSelection> {
    const range = primaryRange(session.snapshot.selection);
    if (!range || range.anchor.kind !== "text" || range.focus.kind !== "text" || range.anchor.nodeId !== range.focus.nodeId) {
      return failure("rich-text.intent-unsupported");
    }
    if (range.anchor.offset !== range.focus.offset) return failure("rich-text.intent-unsupported");
    const current = value();
    const block = findTextBlock(current, range.anchor.nodeId);
    if (!block) return failure("rich-text.point-not-found");
    const textIndex = block.node.content.findIndex((node) => node.id === range.anchor.nodeId);
    const text = block.node.content[textIndex];
    if (!text || !isRichTextText(text) || !validOffset(text.text, range.anchor.offset)) return failure("rich-text.invalid-offset");
    const leftText = { ...text, text: text.text.slice(0, range.anchor.offset) };
    const rightText = { ...text, id: createId(), text: text.text.slice(range.anchor.offset) };
    const left = { ...block.node, content: [...block.node.content.slice(0, textIndex), leftText] };
    const right: RichTextBlock = block.node.type === "heading"
      ? {
          id: createId(),
          type: "paragraph",
          content: [rightText, ...block.node.content.slice(textIndex + 1)],
        }
      : {
          ...block.node,
          id: createId(),
          content: [rightText, ...block.node.content.slice(textIndex + 1)],
        };
    const next = replaceTopLevelBlock(current, block.node.id, [left as RichTextNode, right]);
    return session.apply({
      operations: [{ op: "replace", path: absolutePath(pointer, []), value: detached(next) }],
      selectionAfter: collapsedAt(rightText.id, 0),
      origin: "rich-text.block.split",
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
    if (boundary === offset) return joinBlock(direction);
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

  function joinBlock(direction: "backward" | "forward"): EditingResult<RichTextSelection> {
    const range = primaryRange(session.snapshot.selection);
    if (!range || range.anchor.kind !== "text" || range.focus.kind !== "text" || range.anchor.nodeId !== range.focus.nodeId) {
      return failure("rich-text.intent-unsupported");
    }
    const current = value();
    const block = findTextBlock(current, range.anchor.nodeId);
    if (!block) return failure("rich-text.point-not-found");
    const blockIndex = current.content.findIndex((node) => node.id === block.node.id);
    const adjacentIndex = direction === "backward" ? blockIndex - 1 : blockIndex + 1;
    const adjacent = current.content[adjacentIndex];
    if (!adjacent || (adjacent.type !== "paragraph" && adjacent.type !== "heading") || adjacent.type !== block.node.type) {
      return success(session.snapshot);
    }
    const adjacentBlock = adjacent as RichTextBlock;
    const first = direction === "backward" ? adjacentBlock : block.node;
    const second = direction === "backward" ? block.node : adjacentBlock;
    const lastInline = first.content.at(-1);
    const firstInline = second.content[0];
    const canMergeText = lastInline !== undefined && firstInline !== undefined
      && isRichTextText(lastInline) && isRichTextText(firstInline)
      && JSON.stringify(lastInline.marks) === JSON.stringify(firstInline.marks);
    const caretNodeId = canMergeText ? lastInline.id : firstInline?.id;
    const caretOffset = canMergeText ? lastInline.text.length : 0;
    if (caretNodeId === undefined) return failure("rich-text.intent-unsupported");
    const content = canMergeText
      ? [
          ...first.content.slice(0, -1),
          { ...lastInline, text: lastInline.text + firstInline.text },
          ...second.content.slice(1),
        ]
      : [...first.content, ...second.content];
    const joined = { ...first, content } as RichTextBlock;
    const start = Math.min(blockIndex, adjacentIndex);
    const next: RichTextDocument = {
      ...current,
      content: [...current.content.slice(0, start), joined, ...current.content.slice(start + 2)],
    };
    return session.apply({
      operations: [{ op: "replace", path: absolutePath(pointer, []), value: detached(next) }],
      selectionAfter: collapsedAt(caretNodeId, caretOffset),
      origin: "rich-text.block.join",
    });
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

type RichTextBlock = Extract<RichTextNode, { readonly type: "paragraph" | "heading" }>;

function findTextBlock(
  document: RichTextDocument,
  textId: string,
): { readonly node: RichTextBlock } | null {
  for (const node of document.content) {
    if ((node.type === "paragraph" || node.type === "heading") && node.content.some((child) => child.id === textId)) {
      return { node: node as RichTextBlock };
    }
  }
  return null;
}

function replaceTopLevelBlock(
  document: RichTextDocument,
  blockId: string,
  replacement: ReadonlyArray<RichTextNode>,
): RichTextDocument {
  const index = document.content.findIndex((node) => node.id === blockId);
  if (index < 0) return document;
  return {
    ...document,
    content: [...document.content.slice(0, index), ...replacement, ...document.content.slice(index + 1)],
  };
}

function replaceBlockContent(
  document: RichTextDocument,
  blockId: string,
  textId: string,
  replacement: ReadonlyArray<Extract<RichTextNode, { readonly type: "text" }>>,
): RichTextDocument {
  return {
    ...document,
    content: document.content.map((node) => {
      if ((node.type !== "paragraph" && node.type !== "heading") || node.id !== blockId) return node;
      const index = node.content.findIndex((child) => child.id === textId);
      if (index < 0) return node;
      return {
        ...node,
        content: [...node.content.slice(0, index), ...replacement, ...node.content.slice(index + 1)],
      };
    }),
  };
}

function collectTexts(nodes: ReadonlyArray<RichTextNode>): ReadonlyArray<Extract<RichTextNode, { readonly type: "text" }>> {
  const texts: Array<Extract<RichTextNode, { readonly type: "text" }>> = [];
  for (const node of nodes) {
    if (isRichTextText(node)) texts.push(node);
    else if (hasRichTextContent(node)) texts.push(...collectTexts(node.content));
  }
  return texts;
}

function remapNodeIds(node: RichTextNode, createId: () => string): RichTextNode {
  if (!hasRichTextContent(node)) return { ...node, id: createId() };
  return {
    ...node,
    id: createId(),
    content: node.content.map((child) => remapNodeIds(child, createId)),
  } as RichTextNode;
}

function findLastText(nodes: ReadonlyArray<RichTextNode>): Extract<RichTextNode, { readonly type: "text" }> | null {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index]!;
    if (isRichTextText(node)) return node;
    if (hasRichTextContent(node)) {
      const found = findLastText(node.content);
      if (found) return found;
    }
  }
  return null;
}

function collapsedAt(nodeId: string, offset: number): RichTextSelection {
  return asRichTextSelection(collapsedRangeSelection({
    kind: "text",
    nodeId,
    offset,
    affinity: "forward",
  }));
}

function detached(document: RichTextDocument): RichTextDocument {
  return JSON.parse(JSON.stringify(document)) as RichTextDocument;
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
