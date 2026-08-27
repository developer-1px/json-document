import {
  buildPointer,
  parsePointer,
  type JSONDocument,
  type JSONPatchOperation,
  type JSONValue,
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
  primaryRange,
  type RangeSelection,
  type SelectionRange,
} from "@interactive-os/json-document-selection";
import {
  hasRichTextContent,
  isRichTextText,
  RICH_TEXT_CLIPBOARD_MIME,
  type RichTextClipboard,
  type RichTextContentNode,
  type RichTextDocument,
  type RichTextNode,
  type RichTextPoint,
  type RichTextSelection,
  type RichTextTarget,
  type RichTextMark,
} from "./model.js";
import { createRichTextNodeId } from "./identity.js";
import { normalizeRichText } from "./normalize.js";
import { richTextPlainText } from "./plain-text.js";
import { diffRichText } from "./diff.js";
import {
  containerContentSegments,
  contentSegments,
  detachedValue,
  nodeAtPath,
  replaceContentAtPath,
  replaceNodeAtPath,
} from "./path.js";
import { compareRichTextMarks, richTextSchemaV1, type RichTextSchema } from "./schema.js";
import { rememberAppliedOperations } from "./applied-change.js";
import { indexValidatedRichText, richTextTopology, seedRichTextTopology, type RichTextTopology } from "./topology.js";
import { validateRichText, validateRichTextNodeAt } from "./validation.js";
import type { RichTextValidationFailure } from "./validation.js";
import { readRichTextDocument, validateLocalOrFallback } from "./editor-validation.js";
import { allTextNodes, collapsedAtPoint, firstSelection, mapSelectionByExistingIds, mapSelectionByTextOrder, reconcileOrFirst } from "./selection-mapping.js";
import { nextScalarOffset, previousScalarOffset, validTextOffset } from "./text-offset.js";

export type RichTextIntent =
  | { readonly type: "selection.set"; readonly selection: RichTextSelection }
  | { readonly type: "selection.remove" }
  | { readonly type: "text.insert"; readonly text: string; readonly historyGroup?: string }
  | { readonly type: "text.delete"; readonly direction: "backward" | "forward"; readonly unit: "character" }
  | { readonly type: "mark.toggle"; readonly mark: RichTextMark }
  | { readonly type: "block.split" }
  | { readonly type: "block.join"; readonly direction: "backward" | "forward" }
  | { readonly type: "block.set-type"; readonly nodeType: "paragraph" | "heading"; readonly attrs?: Readonly<Record<string, import("@interactive-os/json-document").JSONValue>> }
  | { readonly type: "node.insert"; readonly point: RichTextPoint; readonly node: RichTextContentNode }
  | { readonly type: "node.remove"; readonly nodeId: string }
  | { readonly type: "node.move"; readonly nodeId: string; readonly point: RichTextPoint }
  | { readonly type: "node.set-attrs"; readonly nodeId: string; readonly attrs: Readonly<Record<string, import("@interactive-os/json-document").JSONValue>> }
  | { readonly type: "clipboard.paste"; readonly clipboard: RichTextClipboard };

export interface RichTextEditor {
  readonly snapshot: EditingSnapshot<RichTextSelection>;
  readonly pointer: Pointer;
  readonly schema: RichTextSchema;
  readonly topology: RichTextTopology;
  dispatch(intent: RichTextIntent): EditingResult<RichTextSelection>;
  apply(operations: ReadonlyArray<JSONPatchOperation>, options?: { readonly origin?: string; readonly historyGroup?: string }): EditingResult<RichTextSelection>;
  copy(): RichTextClipboard | null;
  cut(): { readonly clipboard: RichTextClipboard; readonly result: EditingResult<RichTextSelection> } | null;
  undo(): EditingResult<RichTextSelection>;
  redo(): EditingResult<RichTextSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<RichTextSelection>) => void): () => void;
}

export interface RichTextEditorOptions {
  readonly document: JSONDocument;
  readonly pointer?: Pointer;
  readonly selection?: RichTextSelection;
  readonly createId?: () => string;
  readonly schema?: RichTextSchema;
}

export type RichTextEditorCreationResult =
  | { readonly ok: true; readonly editor: RichTextEditor }
  | RichTextValidationFailure;

export function tryCreateRichTextEditor(options: RichTextEditorOptions): RichTextEditorCreationResult {
  const pointer = options.pointer ?? "";
  const located = options.document.at(pointer);
  if (!located.ok) return { ok: false, code: "rich-text.invalid-document", reason: `Rich Text document was not found at ${JSON.stringify(pointer)}.`, pointer };
  const schema = options.schema ?? richTextSchemaV1;
  const indexed = indexValidatedRichText(located.value, schema);
  if (!indexed.ok) return indexed;
  return { ok: true, editor: createRichTextEditor(options) };
}

export function createRichTextEditor(options: RichTextEditorOptions): RichTextEditor {
  const pointer = options.pointer ?? "";
  const schema = options.schema ?? richTextSchemaV1;
  const initial = readRichTextDocument(options.document, pointer);
  const initialValidation = indexValidatedRichText(initial, schema);
  if (!initialValidation.ok) throw new TypeError(initialValidation.reason);
  const initialTopology = richTextTopology(initial);
  let previousDocument = initial;
  options.document.subscribe((change) => {
    const next = readRichTextDocument(options.document, pointer);
    seedRichTextTopology(previousDocument, next, change.applied, pointer);
    rememberAppliedOperations(next, change.applied);
    previousDocument = next;
  });
  const selectionFamily = createRangeSelectionFamily<RichTextPoint, RichTextTarget>();
  const session = createEditingSession<RichTextSelection>({
    document: options.document,
    selection: options.selection === undefined
      ? firstSelection(initial)
      : asRichTextSelection(selectionFamily.reconcile(options.selection, { topology: initialTopology }).state),
  });

  const createId = options.createId ?? createRichTextNodeId;

  return {
    get snapshot() { return session.snapshot; },
    pointer,
    schema,
    get topology() { return richTextTopology(value()); },
    dispatch(intent) {
      if (intent.type === "selection.set") {
        const selection = asRichTextSelection(
          selectionFamily.reconcile(intent.selection, { topology: richTextTopology(value()) }).state,
        );
        return { ok: true, snapshot: session.select(selection) };
      }
      if (intent.type === "selection.remove") return removeSelections();
      if (intent.type === "text.insert") return insertText(intent.text, intent.historyGroup);
      if (intent.type === "text.delete") return deleteCharacter(intent.direction);
      if (intent.type === "mark.toggle") return toggleMark(intent.mark);
      if (intent.type === "block.split") return splitBlock();
      if (intent.type === "block.join") return joinBlock(intent.direction);
      if (intent.type === "block.set-type") return setBlockType(intent.nodeType, intent.attrs);
      if (intent.type === "node.insert") return insertNode(intent.point, intent.node);
      if (intent.type === "node.remove") return removeNode(intent.nodeId);
      if (intent.type === "node.move") return moveNode(intent.nodeId, intent.point);
      if (intent.type === "node.set-attrs") return setNodeAttrs(intent.nodeId, intent.attrs);
      return pasteClipboard(intent.clipboard);
    },
    apply(operations, applyOptions) {
      return session.apply({
        operations,
        selectionAfter: session.snapshot.selection,
        origin: applyOptions?.origin ?? "rich-text.document.apply",
        ...(applyOptions?.historyGroup === undefined ? {} : { historyGroup: applyOptions.historyGroup }),
      });
    },
    copy: copySelection,
    cut() {
      const clipboard = copySelection();
      if (clipboard === null) return null;
      return { clipboard, result: removeSelections() };
    },
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };

  function value(): RichTextDocument {
    return readRichTextDocument(options.document, pointer);
  }

  function insertText(text: string, historyGroup = "rich-text.typing"): EditingResult<RichTextSelection> {
    if (text.length === 0) return removeSelections();
    const ranges = session.snapshot.selection.ranges;
    if (ranges.length === 0) return failure("rich-text.selection-empty");
    if (ranges.every((range) => range.anchor.kind === "text" && range.focus.kind === "text" && range.anchor.nodeId === range.focus.nodeId)) {
      const before = value();
      const nextRanges: SelectionRange<RichTextPoint>[] = [];
      const grouped = new Map<string, Array<{ start: number; end: number; rangeIndex: number; affinity: RichTextPoint["affinity"] }>>();
      ranges.forEach((range, rangeIndex) => {
        const anchor = range.anchor as Extract<RichTextPoint, { readonly kind: "text" }>;
        const focus = range.focus as Extract<RichTextPoint, { readonly kind: "text" }>;
        grouped.set(anchor.nodeId, [...(grouped.get(anchor.nodeId) ?? []), {
          start: Math.min(anchor.offset, focus.offset),
          end: Math.max(anchor.offset, focus.offset),
          rangeIndex,
          affinity: focus.affinity,
        }]);
      });
      const topology = richTextTopology(before);
      const operations: import("@interactive-os/json-document").JSONPatchOperation[] = [];
      for (const [nodeId, replacements] of grouped) {
        const located = topology.locate(nodeId);
        const currentNode = located === null ? null : nodeAtPath(before, located.path);
        if (located === null || currentNode === null || !isRichTextText(currentNode)) return failure("rich-text.point-not-found");
        let nextText = currentNode.text;
        for (const replacement of [...replacements].sort((left, right) => right.start - left.start)) {
          if (!validTextOffset(nextText, replacement.start) || !validTextOffset(nextText, replacement.end)) return failure("rich-text.invalid-offset");
          nextText = nextText.slice(0, replacement.start) + text + nextText.slice(replacement.end);
        }
        const nextNode = { ...currentNode, text: nextText };
        const validation = validateRichTextNodeAt(before, located.path, nextNode, { schema });
        if (!validation.ok) return failure(validation.code);
        operations.push({ op: "replace", path: absolutePath(pointer, [...contentSegments(located.path), "text"]), value: nextText });
        for (const replacement of replacements) {
          const shift = replacements
            .filter((candidate) => candidate.start < replacement.start)
            .reduce((total, candidate) => total + text.length - (candidate.end - candidate.start), 0);
          const point: RichTextPoint = {
            kind: "text",
            nodeId,
            offset: replacement.start + shift + text.length,
            affinity: replacement.affinity,
          };
          nextRanges[replacement.rangeIndex] = { anchor: point, focus: point };
        }
      }
      const selectionAfter = asRichTextSelection({ ...session.snapshot.selection, ranges: nextRanges } as RangeSelection<RichTextPoint>);
      return commitOperations(selectionAfter, "rich-text.text.insert", historyGroup, operations);
    }
    const removed = removeSelectedValue(value(), session.snapshot.selection, schema, createId);
    if (!removed.ok) return failure(removed.code);
    let next = removed.value;
    const nextRanges: SelectionRange<RichTextPoint>[] = [];
    const ordered = removed.selection.ranges.map((range, index) => ({ point: range.anchor, index })).reverse();
    for (const item of ordered) {
      const textNode: RichTextNode = { id: createId(), type: "text", text, marks: [] };
      const inserted = insertNodeAtPoint(next, item.point, textNode, createId);
      if (!inserted) return failure("rich-text.invalid-offset");
      next = inserted.value;
      const point: RichTextPoint = { kind: "text", nodeId: textNode.id, offset: text.length, affinity: item.point.affinity };
      nextRanges[item.index] = { anchor: point, focus: point };
    }
    return applyWhole(next, asRichTextSelection({ ...removed.selection, ranges: nextRanges } as RangeSelection<RichTextPoint>), "rich-text.text.insert", historyGroup);
  }

  function removeSelections(): EditingResult<RichTextSelection> {
    const removed = removeSelectedValue(value(), session.snapshot.selection, schema, createId);
    if (!removed.ok) return failure(removed.code);
    if (removed.value === value()) return success(session.snapshot);
    return applyWhole(removed.value, removed.selection, "rich-text.selection.remove");
  }

  function copySelection(): RichTextClipboard | null {
    const current = value();
    const slices = session.snapshot.selection.ranges
      .map((range) => sliceRange(current, range, schema))
      .filter((slice): slice is { readonly content: ReadonlyArray<RichTextNode>; readonly openStart: number; readonly openEnd: number } => slice !== null);
    if (slices.length === 0) return null;
    const allInline = slices.length === 1 && slices[0]!.openStart === 1;
    const content = allInline
      ? slices[0]!.content
      : slices.flatMap((slice) => slice.openStart === 0 ? slice.content : [{ id: createId(), type: "paragraph", content: slice.content } as RichTextNode]);
    const text = richTextPlainText(content);
    return {
      type: RICH_TEXT_CLIPBOARD_MIME,
      slice: {
        profile: current.profile,
        content,
        openStart: allInline ? 1 : 0,
        openEnd: allInline ? 1 : 0,
      },
      text,
      html: "",
    };
  }

  function pasteClipboard(clipboard: RichTextClipboard): EditingResult<RichTextSelection> {
    if (clipboard.type !== RICH_TEXT_CLIPBOARD_MIME || clipboard.slice.profile !== schema.profile) {
      return failure("rich-text.clipboard-invalid");
    }
    const ranges = session.snapshot.selection.ranges;
    if (
      clipboard.slice.openStart === 1 && clipboard.slice.openEnd === 1
      && ranges.length === 1 && pointsEqual(ranges[0]!.anchor, ranges[0]!.focus)
    ) {
      const remapped = remapSliceNodeIds(clipboard.slice.content, schema, createId);
      if (remapped.length === 1) {
        return insertNode(ranges[0]!.anchor, remapped[0] as RichTextContentNode);
      }
    }
    const removed = removeSelectedValue(value(), session.snapshot.selection, schema, createId);
    if (!removed.ok) return failure(removed.code);
    let next = removed.value;
    const nextRanges: SelectionRange<RichTextPoint>[] = [];
    const order = logicalPointOrder(next);
    const points = removed.selection.ranges.map((range, index) => ({ point: range.anchor, index }))
      .sort((left, right) => order(right.point) - order(left.point));
    for (const item of points) {
      const pasted = pasteSliceAtPoint(next, item.point, clipboard.slice.content, clipboard.slice.openStart, clipboard.slice.openEnd, schema, createId);
      if (!pasted.ok) return failure(pasted.code);
      next = pasted.value;
      nextRanges[item.index] = { anchor: pasted.point, focus: pasted.point };
    }
    return applyWhole(next, asRichTextSelection({ ...removed.selection, ranges: nextRanges } as RangeSelection<RichTextPoint>), "rich-text.clipboard.paste", "rich-text.clipboard.paste");
  }

  function splitBlock(): EditingResult<RichTextSelection> {
    const originalRange = primaryRange(session.snapshot.selection);
    if (!originalRange) return failure("rich-text.selection-empty");
    let current = value();
    let selection = session.snapshot.selection;
    if (!pointsEqual(originalRange.anchor, originalRange.focus)) {
      const removed = removeSelectedValue(current, selection, schema, createId);
      if (!removed.ok) return failure(removed.code);
      current = removed.value;
      selection = removed.selection;
    }
    const range = primaryRange(selection);
    if (!range) return failure("rich-text.invalid-offset");
    const block = findPointBlock(current, range.anchor);
    if (!block) return failure("rich-text.point-not-found");
    if (range.anchor.kind === "child") {
      if (range.anchor.nodeId !== block.node.id || range.anchor.offset < 0 || range.anchor.offset > block.node.content.length) {
        return failure("rich-text.invalid-offset");
      }
      const right = splitBlockShell(block.node, createId(), block.node.content.slice(range.anchor.offset));
      const left = { ...block.node, content: block.node.content.slice(0, range.anchor.offset) } as RichTextBlock;
      return applySiblings(current, block.node.id, [left, right], collapsedAtPoint({ kind: "child", nodeId: right.id, offset: 0, affinity: "forward" }), "rich-text.block.split");
    }
    const textIndex = block.node.content.findIndex((node) => node.id === range.anchor.nodeId);
    const text = block.node.content[textIndex];
    if (!text || !isRichTextText(text) || !validTextOffset(text.text, range.anchor.offset)) return failure("rich-text.invalid-offset");
    const leftValue = text.text.slice(0, range.anchor.offset);
    const rightValue = text.text.slice(range.anchor.offset);
    const rightText = rightValue.length === 0 ? null : { ...text, id: createId(), text: rightValue };
    const leftContent = [
      ...block.node.content.slice(0, textIndex),
      ...(leftValue.length === 0 ? [] : [{ ...text, text: leftValue }]),
    ];
    const rightContent = [
      ...(rightText === null ? [] : [rightText]),
      ...block.node.content.slice(textIndex + 1),
    ];
    const left = { ...block.node, content: leftContent };
    const right = splitBlockShell(block.node, createId(), rightContent);
    const point: RichTextPoint = rightText === null
      ? { kind: "child", nodeId: right.id, offset: 0, affinity: "forward" }
      : { kind: "text", nodeId: rightText.id, offset: 0, affinity: "forward" };
    return applySiblings(current, block.node.id, [left as RichTextBlock, right], collapsedAtPoint(point), "rich-text.block.split");
  }

  function toggleMark(mark: RichTextMark): EditingResult<RichTextSelection> {
    if (schema.marks[mark.type] === undefined) return failure("rich-text.schema-violation");
    const targets = selectedTextIntervals(value(), session.snapshot.selection);
    if (targets.length === 0) return success(session.snapshot);
    const currentMarks = value();
    const markTopology = richTextTopology(currentMarks);
    const remove = targets.every((target) => {
      const located = markTopology.locate(target.nodeId);
      return located !== null && isRichTextText(located.node) && located.node.marks.some((candidate) => candidate.type === mark.type);
    });
    const before = value();
    const topology = richTextTopology(before);
    const operations: import("@interactive-os/json-document").JSONPatchOperation[] = [];
    const groups = [...groupIntervals(targets)].sort((left, right) => {
      const leftPath = topology.locate(left.nodeId)?.path ?? [];
      const rightPath = topology.locate(right.nodeId)?.path ?? [];
      return compareKeys(rightPath, leftPath);
    });
    for (const group of groups) {
      const located = topology.locate(group.nodeId);
      if (located === null || !isRichTextText(located.node)) return failure("rich-text.point-not-found");
      const replacements = markedSegments(located.node, group.intervals, mark, remove, schema, createId);
      if (replacements.length === 0) continue;
      const sibling = siblingReplacementOps(before, located, replacements, pointer);
      if (sibling === null) return failure("rich-text.point-not-found");
      operations.push(...sibling);
    }
    if (operations.length === 0) return success(session.snapshot);
    return commitOperations(session.snapshot.selection, "rich-text.mark.toggle", undefined, operations);
  }

  function setBlockType(
    nodeType: "paragraph" | "heading",
    attrs?: Readonly<Record<string, import("@interactive-os/json-document").JSONValue>>,
  ): EditingResult<RichTextSelection> {
    if (nodeType === "heading" && (!attrs || !Number.isInteger(attrs.level) || Number(attrs.level) < 1 || Number(attrs.level) > 6)) {
      return failure("rich-text.schema-violation");
    }
    const current = value();
    const topology = richTextTopology(current);
    const blockIds = selectedTextBlockIds(current, session.snapshot.selection);
    if (blockIds.length === 0) return failure("rich-text.point-not-found");
    const operations: import("@interactive-os/json-document").JSONPatchOperation[] = [];
    for (const blockId of blockIds) {
      const located = topology.locate(blockId);
      if (located === null) return failure("rich-text.point-not-found");
      const node = located.node;
      if (node.type !== "paragraph" && node.type !== "heading") continue;
      const nextNode = (nodeType === "paragraph"
        ? { id: node.id, type: "paragraph", content: node.content }
        : { id: node.id, type: "heading", attrs: { level: Number(attrs!.level) as 1 | 2 | 3 | 4 | 5 | 6 }, content: node.content }) as RichTextNode;
      const validation = validateRichTextNodeAt(current, located.path, nextNode, { schema });
      if (!validation.ok) return failure(validation.code);
      operations.push({ op: "replace", path: absolutePath(pointer, contentSegments(located.path)), value: detachedValue(nextNode) });
    }
    if (operations.length === 0) return success(session.snapshot);
    return commitOperations(session.snapshot.selection, "rich-text.block.set-type", undefined, operations);
  }

  function insertNode(point: RichTextPoint, node: RichTextNode): EditingResult<RichTextSelection> {
    const current = value();
    const topology = richTextTopology(current);
    if (locateContainer(current, topology, node.id) !== null) return failure("rich-text.duplicate-id");
    const planned = planInsertNode(current, topology, point, node, pointer, createId);
    if (planned === null) return failure("rich-text.invalid-offset");
    for (const candidate of planned.nodes) {
      const validation = validateRichTextNodeAt(current, planned.parentPath.concat(0), candidate, { schema });
      if (!validation.ok) return failure(validation.code);
    }
    return commitOperations(planned.selection, "rich-text.node.insert", undefined, planned.operations);
  }

  function removeNode(nodeId: string): EditingResult<RichTextSelection> {
    const current = value();
    const topology = richTextTopology(current);
    const located = topology.locate(nodeId);
    if (located === null || located.path.length === 0) return failure("rich-text.point-not-found");
    const parentPath = located.path.slice(0, -1);
    const index = located.path[located.path.length - 1]!;
    const parent = nodeAtPath(current, parentPath);
    if (parent === null || !hasRichTextContent(parent)) return failure("rich-text.point-not-found");
    const contentPath = absolutePath(pointer, containerContentSegments(parentPath));
    const before = parent.content[index - 1];
    const after = parent.content[index + 1];
    const operations: import("@interactive-os/json-document").JSONPatchOperation[] = [];
    if (
      before !== undefined && after !== undefined
      && isRichTextText(before) && isRichTextText(after)
      && JSON.stringify(before.marks) === JSON.stringify(after.marks)
    ) {
      operations.push({ op: "replace", path: `${contentPath}/${index - 1}/text`, value: before.text + after.text });
      operations.push({ op: "remove", path: `${contentPath}/${index + 1}` });
    }
    operations.push({ op: "remove", path: `${contentPath}/${index}` });
    const caret: RichTextPoint = before && isRichTextText(before)
      ? { kind: "text", nodeId: before.id, offset: before.text.length, affinity: "forward" }
      : after && isRichTextText(after)
        ? { kind: "text", nodeId: after.id, offset: 0, affinity: "forward" }
        : { kind: "child", nodeId: parent.id, offset: Math.min(index, parent.content.length - 1), affinity: "forward" };
    return commitOperations(collapsedAtPoint(caret), "rich-text.node.remove", undefined, operations);
  }

  function moveNode(nodeId: string, point: RichTextPoint): EditingResult<RichTextSelection> {
    const current = value();
    const topology = richTextTopology(current);
    const located = topology.locate(nodeId);
    const destination = point.kind === "child" ? locateContainer(current, topology, point.nodeId) : null;
    if (
      located === null || located.path.length === 0 || destination === null
      || !hasRichTextContent(destination.node)
      || pathStartsWith(destination.path, located.path)
    ) {
      return failure("rich-text.invalid-offset");
    }
    if (point.offset < 0 || point.offset > destination.node.content.length) return failure("rich-text.invalid-offset");
    const sourceParent = located.path.slice(0, -1);
    const sourceIndex = located.path[located.path.length - 1]!;
    let destParent = destination.path;
    let destIndex = point.offset;
    if (sameNumberPath(sourceParent, destParent) && sourceIndex < destIndex) destIndex -= 1;
    destParent = shiftPathAfterRemove(destParent, sourceParent, sourceIndex);
    const sourcePath = absolutePath(pointer, [...containerContentSegments(sourceParent), sourceIndex]);
    const destPath = absolutePath(pointer, [...containerContentSegments(destParent), destIndex]);
    const operations: import("@interactive-os/json-document").JSONPatchOperation[] = [
      { op: "remove", path: sourcePath },
      { op: "add", path: destPath, value: detachedValue(located.node) },
    ];
    return commitOperations(session.snapshot.selection, "rich-text.node.move", undefined, operations);
  }

  function setNodeAttrs(
    nodeId: string,
    attrs: Readonly<Record<string, import("@interactive-os/json-document").JSONValue>>,
  ): EditingResult<RichTextSelection> {
    const current = value();
    const located = richTextTopology(current).locate(nodeId);
    if (located === null) return failure("rich-text.point-not-found");
    const nextNode = { ...located.node, attrs } as RichTextNode;
    const validation = validateRichTextNodeAt(current, located.path, nextNode, { schema });
    if (!validation.ok) return failure(validation.code);
    return commitOperations(
      session.snapshot.selection,
      "rich-text.node.set-attrs",
      undefined,
      [{ op: "replace", path: absolutePath(pointer, [...contentSegments(located.path), "attrs"]), value: detachedValue(attrs) }],
    );
  }

  function deleteCharacter(direction: "backward" | "forward"): EditingResult<RichTextSelection> {
    const range = primaryRange(session.snapshot.selection);
    if (!range) return failure("rich-text.selection-empty");
    if (!pointsEqual(range.anchor, range.focus)) return removeSelections();
    const resolved = resolveDeletionPoint(value(), range.anchor, direction);
    if (resolved?.kind === "node") return removeNode(resolved.nodeId);
    if (!resolved) {
      const block = findPointBlock(value(), range.anchor);
      const atJoinBoundary = range.anchor.kind === "child"
        && block?.node.id === range.anchor.nodeId
        && (direction === "backward"
          ? range.anchor.offset === 0
          : range.anchor.offset === block.node.content.length);
      return atJoinBoundary ? joinBlock(direction) : success(session.snapshot);
    }
    const current = value();
    const located = richTextTopology(current).locate(resolved.nodeId);
    if (located === null || !isRichTextText(located.node)) return failure("rich-text.point-not-found");
    const offset = resolved.offset;
    const boundary = direction === "backward"
      ? previousScalarOffset(located.node.text, offset)
      : nextScalarOffset(located.node.text, offset);
    if (boundary === offset) return joinBlock(direction);
    const from = Math.min(offset, boundary);
    const to = Math.max(offset, boundary);
    const nextText = located.node.text.slice(0, from) + located.node.text.slice(to);
    if (nextText.length > 0) {
      const nextNode = { ...located.node, text: nextText };
      const validation = validateRichTextNodeAt(current, located.path, nextNode, { schema });
      if (!validation.ok) return failure(validation.code);
      return commitOperations(
        collapsedAt(resolved.nodeId, from),
        "rich-text.text.delete",
        "rich-text.typing",
        [{ op: "replace", path: absolutePath(pointer, [...contentSegments(located.path), "text"]), value: nextText }],
      );
    }
    const parentPath = located.path.slice(0, -1);
    const index = located.path[located.path.length - 1]!;
    const parent = nodeAtPath(current, parentPath);
    if (parent === null || !hasRichTextContent(parent)) return failure("rich-text.point-not-found");
    const content = mergeAdjacentEquivalentText(parent.content.filter((_, childIndex) => childIndex !== index));
    const next = replaceContentAtPath(current, parentPath, content);
    const after = content[index];
    const before = content[index - 1];
    const caret: RichTextPoint = after && isRichTextText(after)
      ? { kind: "text", nodeId: after.id, offset: 0, affinity: "forward" }
      : before && isRichTextText(before)
        ? { kind: "text", nodeId: before.id, offset: before.text.length, affinity: "forward" }
        : { kind: "child", nodeId: parent.id, offset: Math.min(index, content.length), affinity: "forward" };
    return applyChange(
      next,
      collapsedAtPoint(caret),
      "rich-text.text.delete",
      "rich-text.typing",
      [{ op: "replace", path: absolutePath(pointer, containerContentSegments(parentPath)), value: detachedValue(content) }],
      { path: parentPath },
    );
  }

  function joinBlock(direction: "backward" | "forward"): EditingResult<RichTextSelection> {
    const range = primaryRange(session.snapshot.selection);
    if (!range) return failure("rich-text.invalid-offset");
    const current = value();
    const block = findPointBlock(current, range.anchor);
    if (!block) return failure("rich-text.point-not-found");
    const locatedBlock = findNode(current, block.node.id);
    if (!locatedBlock?.parent) return failure("rich-text.point-not-found");
    const blockIndex = locatedBlock.index;
    const adjacentIndex = direction === "backward" ? blockIndex - 1 : blockIndex + 1;
    const adjacent = locatedBlock.parent.content[adjacentIndex];
    if (!adjacent) return success(session.snapshot);
    if (!isJoinableBlock(adjacent) || !blocksCanJoin(block.node, adjacent)) {
      return failure("rich-text.intent-unsupported");
    }
    const adjacentBlock = adjacent as RichTextBlock;
    const first = direction === "backward" ? adjacentBlock : block.node;
    const second = direction === "backward" ? block.node : adjacentBlock;
    const lastInline = first.content.at(-1);
    const firstInline = second.content[0];
    const canMergeText = lastInline !== undefined && firstInline !== undefined
      && isRichTextText(lastInline) && isRichTextText(firstInline)
      && JSON.stringify(lastInline.marks) === JSON.stringify(firstInline.marks);
    const joinOffset = first.content.length;
    if (lastInline === undefined && firstInline === undefined) {
      return applySiblings(
        current,
        first.id,
        [joinedEmptyBlocks(first, second)],
        collapsedAtPoint({ kind: "child", nodeId: first.id, offset: 0, affinity: "forward" }),
        "rich-text.block.join",
        second.id,
      );
    }
    const content = canMergeText
      ? [
          ...first.content.slice(0, -1),
          { ...lastInline, text: lastInline.text + firstInline.text },
          ...second.content.slice(1),
        ]
      : [...first.content, ...second.content];
    const joined = { ...first, content } as RichTextBlock;
    const caret = canMergeText
      ? { kind: "text" as const, nodeId: lastInline.id, offset: lastInline.text.length, affinity: "forward" as const }
      : { kind: "child" as const, nodeId: first.id, offset: joinOffset, affinity: "forward" as const };
    return applySiblings(current, first.id, [joined], collapsedAtPoint(caret), "rich-text.block.join", second.id);
  }

  function applySiblings(
    current: RichTextDocument,
    nodeId: string,
    replacements: ReadonlyArray<RichTextNode>,
    selectionAfter: RichTextSelection,
    origin: string,
    removeId?: string,
  ): EditingResult<RichTextSelection> {
    const located = richTextTopology(current).locate(nodeId);
    if (located === null || replacements.length === 0) return failure("rich-text.point-not-found");
    const parentPath = located.path.slice(0, -1);
    const parent = nodeAtPath(current, parentPath);
    if (parent === null || !hasRichTextContent(parent)) return failure("rich-text.point-not-found");
    const index = located.path[located.path.length - 1]!;
    const removeIndex = removeId === undefined ? -1 : parent.content.findIndex((child) => child.id === removeId);
    if (removeId !== undefined && removeIndex < 0) return failure("rich-text.point-not-found");
    for (const node of replacements) {
      const validation = validateRichTextNodeAt(current, located.path, node, { schema });
      if (!validation.ok) return failure(validation.code);
    }
    const contentPath = absolutePath(pointer, containerContentSegments(parentPath));
    const operations: import("@interactive-os/json-document").JSONPatchOperation[] = [];
    const first = replacements[0];
    if (first === undefined) return failure("rich-text.point-not-found");
    if (removeIndex >= 0 && removeIndex < index) {
      operations.push({ op: "remove", path: `${contentPath}/${removeIndex}` });
      operations.push({ op: "replace", path: `${contentPath}/${index - 1}`, value: detachedValue(first) });
      for (let offset = 1; offset < replacements.length; offset += 1) {
        const added = replacements[offset];
        if (added === undefined) continue;
        operations.push({ op: "add", path: `${contentPath}/${index - 1 + offset}`, value: detachedValue(added) });
      }
    } else {
      if (removeIndex > index) operations.push({ op: "remove", path: `${contentPath}/${removeIndex}` });
      operations.push({ op: "replace", path: `${contentPath}/${index}`, value: detachedValue(first) });
      for (let offset = 1; offset < replacements.length; offset += 1) {
        const added = replacements[offset];
        if (added === undefined) continue;
        operations.push({ op: "add", path: `${contentPath}/${index + offset}`, value: detachedValue(added) });
      }
    }
    return commitOperations(selectionAfter, origin, undefined, operations);
  }

  function applyChange(
    next: RichTextDocument,
    selectionAfter: RichTextSelection,
    origin: string,
    historyGroup: string | undefined,
    operations: ReadonlyArray<import("@interactive-os/json-document").JSONPatchOperation>,
    incremental?: { readonly path: ReadonlyArray<number> },
  ): EditingResult<RichTextSelection> {
    const validation = incremental === undefined
      ? validateRichText(next, { schema })
      : validateLocalOrFallback(next, incremental.path, schema);
    if (!validation.ok) return failure(validation.code);
    return commitOperations(selectionAfter, origin, historyGroup, operations);
  }

  function commitOperations(
    selectionAfter: RichTextSelection,
    origin: string,
    historyGroup: string | undefined,
    operations: ReadonlyArray<import("@interactive-os/json-document").JSONPatchOperation>,
  ): EditingResult<RichTextSelection> {
    return session.apply({
      operations,
      selectionAfter,
      origin,
      ...(historyGroup === undefined ? {} : { historyGroup }),
    });
  }

  function applyWhole(
    next: RichTextDocument,
    selectionAfter: RichTextSelection,
    origin: string,
    historyGroup?: string,
  ): EditingResult<RichTextSelection> {
    const operations = diffRichText(value(), next, pointer);
    const whole = operations.some((operation) => {
      const path = operation.path === pointer || operation.path === `${pointer}/content` || operation.path === "/content";
      return path && operation.op === "replace";
    });
    return whole
      ? applyChange(next, selectionAfter, origin, historyGroup, operations)
      : commitOperations(selectionAfter, origin, historyGroup, operations);
  }
}

function mergeAdjacentEquivalentText(content: ReadonlyArray<RichTextNode>): RichTextNode[] {
  const merged: RichTextNode[] = [];
  for (const child of content) {
    const previous = merged.at(-1);
    if (previous && isRichTextText(previous) && isRichTextText(child) && JSON.stringify(previous.marks) === JSON.stringify(child.marks)) {
      merged[merged.length - 1] = { ...previous, text: previous.text + child.text };
    } else {
      merged.push(child);
    }
  }
  return merged;
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

type RichTextBlock = Extract<RichTextNode, { readonly type: "paragraph" | "heading" | "codeBlock" }>;

function findTextBlock(
  document: RichTextDocument,
  textId: string,
): { readonly node: RichTextBlock } | null {
  const node = findAncestors(document, textId).reverse()
    .find(isJoinableBlock);
  return node ? { node: node as RichTextBlock } : null;
}

function findPointBlock(document: RichTextDocument, point: RichTextPoint): { readonly node: RichTextBlock } | null {
  if (point.kind === "text") return findTextBlock(document, point.nodeId);
  const direct = findNode(document, point.nodeId)?.node;
  if (direct && isJoinableBlock(direct)) return { node: direct };
  const ancestor = findAncestors(document, point.nodeId).reverse().find(isJoinableBlock);
  return ancestor ? { node: ancestor } : null;
}

function isJoinableBlock(node: RichTextNode | RichTextDocument): node is RichTextBlock {
  return node.type === "paragraph" || node.type === "heading" || node.type === "codeBlock";
}

function blocksCanJoin(left: RichTextBlock, right: RichTextBlock): boolean {
  const leftInline = left.type === "paragraph" || left.type === "heading";
  const rightInline = right.type === "paragraph" || right.type === "heading";
  return (leftInline && rightInline) || (left.type === "codeBlock" && right.type === "codeBlock");
}

function splitBlockShell(block: RichTextBlock, id: string, content: RichTextBlock["content"]): RichTextBlock {
  if (block.type === "heading") return { id, type: "paragraph", content } as RichTextBlock;
  return { ...block, id, content } as RichTextBlock;
}

function collectTexts(nodes: ReadonlyArray<RichTextNode>): ReadonlyArray<Extract<RichTextNode, { readonly type: "text" }>> {
  const texts: Array<Extract<RichTextNode, { readonly type: "text" }>> = [];
  for (const node of nodes) {
    if (isRichTextText(node)) texts.push(node);
    else if (hasRichTextContent(node)) texts.push(...collectTexts(node.content));
  }
  return texts;
}

function remapSliceNodeIds(
  nodes: ReadonlyArray<RichTextNode>,
  schema: RichTextSchema,
  createId: () => string,
): RichTextNode[] {
  const ids = new Map<string, string>();
  const collect = (node: RichTextNode) => {
    ids.set(node.id, createId());
    if (hasRichTextContent(node)) node.content.forEach(collect);
  };
  nodes.forEach(collect);
  return nodes.map(remap);

  function remap(node: RichTextNode): RichTextNode {
    const spec = schema.nodes[node.type];
    const record = node as RichTextNode & { readonly attrs?: Readonly<Record<string, JSONValue>> };
    const attrs = record.attrs === undefined ? undefined : Object.fromEntries(Object.entries(record.attrs).map(([name, value]) => {
      const mapped = spec?.attrs[name]?.nodeReference === true && typeof value === "string" ? ids.get(value) ?? value : value;
      return [name, mapped];
    }));
    return {
      ...node,
      id: ids.get(node.id)!,
      ...(attrs === undefined ? {} : { attrs }),
      ...(hasRichTextContent(node) ? { content: node.content.map(remap) } : {}),
    } as RichTextNode;
  }
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

interface LocatedRichTextNode {
  readonly node: RichTextNode;
  readonly parent: (RichTextNode | RichTextDocument) & { readonly content: ReadonlyArray<RichTextNode> } | null;
  readonly index: number;
}

interface TextInterval {
  readonly nodeId: string;
  readonly from: number;
  readonly to: number;
}

function findNode(
  document: RichTextDocument,
  nodeId: string,
): LocatedRichTextNode | null {
  return visit(document, null, -1);

  function visit(
    node: RichTextNode | RichTextDocument,
    parent: LocatedRichTextNode["parent"],
    index: number,
  ): LocatedRichTextNode | null {
    if (node.id === nodeId && node.type !== "doc") return { node: node as RichTextNode, parent, index };
    if (!hasRichTextContent(node)) return null;
    for (let childIndex = 0; childIndex < node.content.length; childIndex += 1) {
      const found = visit(node.content[childIndex]!, node, childIndex);
      if (found) return found;
    }
    return null;
  }
}

function replaceNode(
  document: RichTextDocument,
  nodeId: string,
  replacement: (node: RichTextNode) => RichTextNode,
): RichTextDocument {
  return visit(document) as RichTextDocument;
  function visit(node: RichTextNode | RichTextDocument): RichTextNode | RichTextDocument {
    if (node.type !== "doc" && node.id === nodeId) return replacement(node);
    if (!hasRichTextContent(node)) return node;
    return { ...node, content: node.content.map(visit) } as RichTextNode | RichTextDocument;
  }
}

function replaceNodeWithMany(
  document: RichTextDocument,
  nodeId: string,
  replacement: ReadonlyArray<RichTextNode>,
): RichTextDocument {
  return visit(document) as RichTextDocument;
  function visit(node: RichTextNode | RichTextDocument): RichTextNode | RichTextDocument {
    if (!hasRichTextContent(node)) return node;
    const children: RichTextNode[] = [];
    for (const child of node.content) {
      if (child.id === nodeId) children.push(...replacement);
      else children.push(visit(child) as RichTextNode);
    }
    return { ...node, content: children } as RichTextNode | RichTextDocument;
  }
}

function removeNodeById(document: RichTextDocument, nodeId: string): RichTextDocument {
  return replaceNodeWithMany(document, nodeId, []);
}

function insertNodeAtPoint(
  document: RichTextDocument,
  point: RichTextPoint,
  node: RichTextNode,
  createId: () => string,
): { readonly value: RichTextDocument } | null {
  if (point.kind === "child") {
    const container = point.nodeId === document.id ? document : findNode(document, point.nodeId)?.node;
    if (!container || !hasRichTextContent(container) || point.offset < 0 || point.offset > container.content.length) return null;
    const value = replaceContainerContent(document, container.id, [
      ...container.content.slice(0, point.offset),
      node,
      ...container.content.slice(point.offset),
    ]);
    return { value };
  }
  const located = findNode(document, point.nodeId);
  if (!located || !isRichTextText(located.node) || located.parent === null || !validTextOffset(located.node.text, point.offset)) return null;
  if (point.offset === 0) return { value: replaceNodeWithMany(document, located.node.id, [node, located.node]) };
  if (point.offset === located.node.text.length) return { value: replaceNodeWithMany(document, located.node.id, [located.node, node]) };
  return {
    value: replaceNodeWithMany(document, located.node.id, [
      { ...located.node, text: located.node.text.slice(0, point.offset) },
      node,
      { ...located.node, id: createId(), text: located.node.text.slice(point.offset) },
    ]),
  };
}

function replaceContainerContent(
  document: RichTextDocument,
  containerId: string,
  content: ReadonlyArray<RichTextNode>,
): RichTextDocument {
  if (document.id === containerId) return { ...document, content: content as RichTextDocument["content"] };
  return replaceNode(document, containerId, (node) => ({ ...node, content } as RichTextNode));
}

function pointAfterInsertedNode(document: RichTextDocument, nodeId: string, affinity: RichTextPoint["affinity"]): RichTextSelection {
  const located = findNode(document, nodeId);
  if (!located) return firstSelection(document);
  if (isRichTextText(located.node)) return collapsedAtPoint({ kind: "text", nodeId, offset: located.node.text.length, affinity });
  if (located.parent === null) return firstSelection(document);
  return collapsedAtPoint({ kind: "child", nodeId: located.parent.id, offset: located.index + 1, affinity });
}

function selectedTextIntervals(document: RichTextDocument, selection: RichTextSelection): TextInterval[] {
  const topology = richTextTopology(document);
  return selection.ranges.flatMap((range) => {
    if (range.anchor.kind === "text" && range.focus.kind === "text" && range.anchor.nodeId === range.focus.nodeId) {
      const from = Math.min(range.anchor.offset, range.focus.offset);
      const to = Math.max(range.anchor.offset, range.focus.offset);
      return from < to ? [{ nodeId: range.anchor.nodeId, from, to }] : [];
    }
    return topology.interval(range.anchor, range.focus)
      .filter((target): target is Extract<RichTextTarget, { readonly kind: "text" }> => target.kind === "text" && target.from < target.to)
      .map((target) => ({ nodeId: target.nodeId, from: target.from, to: target.to }));
  });
}

function groupIntervals(intervals: ReadonlyArray<TextInterval>): ReadonlyArray<{
  readonly nodeId: string;
  readonly intervals: ReadonlyArray<{ readonly from: number; readonly to: number }>;
}> {
  const grouped = new Map<string, Array<{ from: number; to: number }>>();
  for (const interval of intervals) grouped.set(interval.nodeId, [...(grouped.get(interval.nodeId) ?? []), { from: interval.from, to: interval.to }]);
  return [...grouped].map(([nodeId, values]) => {
    const sorted = values.sort((left, right) => left.from - right.from || left.to - right.to);
    const merged: Array<{ from: number; to: number }> = [];
    for (const interval of sorted) {
      const previous = merged.at(-1);
      if (previous && interval.from <= previous.to) previous.to = Math.max(previous.to, interval.to);
      else merged.push({ ...interval });
    }
    return { nodeId, intervals: merged };
  });
}

function markedSegments(
  node: Extract<RichTextNode, { readonly type: "text" }>,
  intervals: ReadonlyArray<{ readonly from: number; readonly to: number }>,
  mark: RichTextMark,
  remove: boolean,
  schema: RichTextSchema,
  createId: () => string,
): ReadonlyArray<RichTextNode> {
  const boundaries = [...new Set([0, node.text.length, ...intervals.flatMap((interval) => [interval.from, interval.to])])].sort((a, b) => a - b);
  const nodes: RichTextNode[] = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const from = boundaries[index]!;
    const to = boundaries[index + 1]!;
    if (from === to) continue;
    const selected = intervals.some((interval) => from >= interval.from && to <= interval.to);
    let marks = [...node.marks];
    if (selected) {
      marks = marks.filter((candidate) => candidate.type !== mark.type);
      if (!remove) {
        if (mark.type === "code") marks = [];
        else marks = marks.filter((candidate) => candidate.type !== "code");
        marks.push(mark);
      }
      marks.sort((left, right) => compareRichTextMarks(schema, left.type, right.type));
    }
    nodes.push({ ...node, id: nodes.length === 0 ? node.id : createId(), text: node.text.slice(from, to), marks });
  }
  return nodes;
}

function selectedTextBlockIds(document: RichTextDocument, selection: RichTextSelection): ReadonlyArray<string> {
  const ids = new Set<string>();
  const topology = richTextTopology(document);
  const points = selection.ranges.flatMap((range) => [range.anchor, range.focus]);
  for (const point of points) rememberBlock(point.nodeId);
  for (const target of selectedTextIntervals(document, selection)) rememberBlock(target.nodeId);
  return [...ids];

  function rememberBlock(nodeId: string): void {
    const located = locateContainer(document, topology, nodeId);
    if (located === null) return;
    let path = located.path;
    while (true) {
      const node = nodeAtPath(document, path);
      if (node && (node.type === "paragraph" || node.type === "heading")) {
        ids.add(node.id);
        return;
      }
      if (path.length === 0) return;
      path = path.slice(0, -1);
    }
  }
}

function findAncestors(document: RichTextDocument, nodeId: string): Array<RichTextNode | RichTextDocument> {
  const path: Array<RichTextNode | RichTextDocument> = [];
  return visit(document) ? path : [];
  function visit(node: RichTextNode | RichTextDocument): boolean {
    path.push(node);
    if (node.id === nodeId) return true;
    if (hasRichTextContent(node)) for (const child of node.content) if (visit(child)) return true;
    path.pop();
    return false;
  }
}

function isDescendant(document: RichTextDocument, nodeId: string, possibleDescendantId: string): boolean {
  const located = findNode(document, nodeId);
  if (!located || !hasRichTextContent(located.node)) return false;
  return findNode({ profile: document.profile, id: "probe", type: "doc", content: located.node.content as RichTextDocument["content"] }, possibleDescendantId) !== null;
}

type RemoveSelectedResult =
  | { readonly ok: true; readonly value: RichTextDocument; readonly selection: RichTextSelection }
  | { readonly ok: false; readonly code: string };

function removeSelectedValue(
  document: RichTextDocument,
  selection: RichTextSelection,
  schema: RichTextSchema,
  createId: () => string,
): RemoveSelectedResult {
  const topology = richTextTopology(document);
  const targets = selection.ranges.flatMap((range) => topology.interval(range.anchor, range.focus));
  const intervals = groupIntervals(targets
    .filter((target): target is Extract<RichTextTarget, { readonly kind: "text" }> => target.kind === "text" && target.from < target.to)
    .map((target) => ({ nodeId: target.nodeId, from: target.from, to: target.to })));
  const atoms = [...new Set(targets.filter((target) => target.kind === "node").map((target) => target.nodeId))];
  if (intervals.length === 0 && atoms.length === 0) return { ok: true, value: document, selection };
  let next = document;
  for (const group of intervals) {
    const located = findText(next, group.nodeId);
    if (!located) continue;
    let text = located.node.text;
    for (const interval of [...group.intervals].sort((left, right) => right.from - left.from)) {
      text = text.slice(0, interval.from) + text.slice(interval.to);
    }
    next = replaceText(next, group.nodeId, text);
  }
  for (const nodeId of atoms) next = removeNodeById(next, nodeId);
  const normalized = normalizeRichText(next, {
    schema,
    createId,
    inputOwnership: "borrowed",
  });
  if (!normalized.ok) return { ok: false, code: normalized.code };
  const ranges = selection.ranges.map((range) => {
    const start = earlierPoint(document, range.anchor, range.focus);
    const point = mapPointAfterRemoval(document, normalized.value, start, intervals);
    return { anchor: point, focus: point };
  });
  return { ok: true, value: normalized.value, selection: { ...selection, ranges } as RichTextSelection };
}

function earlierPoint(document: RichTextDocument, left: RichTextPoint, right: RichTextPoint): RichTextPoint {
  const order = logicalPointOrder(document);
  return (order(left) <= order(right)) ? left : right;
}

function logicalPointOrder(document: RichTextDocument): (point: RichTextPoint) => number {
  const positions = new Map<string, number>();
  let sequence = 0;
  visit(document);
  return (point) => (positions.get(point.nodeId) ?? Number.MAX_SAFE_INTEGER) * 1_000_000 + point.offset;
  function visit(node: RichTextNode | RichTextDocument): void {
    positions.set(node.id, sequence++);
    if (hasRichTextContent(node)) node.content.forEach(visit);
  }
}

function mapPointAfterRemoval(
  before: RichTextDocument,
  after: RichTextDocument,
  point: RichTextPoint,
  groups: ReadonlyArray<{ readonly nodeId: string; readonly intervals: ReadonlyArray<{ readonly from: number; readonly to: number }> }>,
): RichTextPoint {
  if (point.kind === "child") return reconcileOrFirst(after, point);
  const group = groups.find((candidate) => candidate.nodeId === point.nodeId);
  let offset = point.offset;
  if (group) {
    for (const interval of group.intervals) {
      if (offset > interval.to) offset -= interval.to - interval.from;
      else if (offset >= interval.from) offset = interval.from;
    }
  }
  const direct: RichTextPoint = { ...point, offset };
  const reconciled = richTextTopology(after).reconcilePoint(direct);
  if (reconciled) return reconciled;
  const located = findNode(before, point.nodeId);
  if (located?.parent) {
    return reconcileOrFirst(after, {
      kind: "child",
      nodeId: located.parent.id,
      offset: located.index,
      affinity: point.affinity,
    });
  }
  return firstSelection(after).ranges[0]!.anchor;
}

function pointsEqual(left: RichTextPoint, right: RichTextPoint): boolean {
  return left.kind === right.kind && left.nodeId === right.nodeId && left.offset === right.offset;
}

function resolveDeletionPoint(
  document: RichTextDocument,
  point: RichTextPoint,
  direction: "backward" | "forward",
): Extract<RichTextPoint, { readonly kind: "text" }> | { readonly kind: "node"; readonly nodeId: string } | null {
  if (point.kind === "text") {
    const located = findNode(document, point.nodeId);
    if (!located || !isRichTextText(located.node)) return null;
    const atBoundary = direction === "backward"
      ? point.offset === 0
      : point.offset === located.node.text.length;
    if (!atBoundary) return point;
    if (!located.parent) return null;
    return resolveDeletionPoint(document, {
      kind: "child",
      nodeId: located.parent.id,
      offset: direction === "backward" ? located.index : located.index + 1,
      affinity: point.affinity,
    }, direction) ?? point;
  }
  const container = point.nodeId === document.id ? document : findNode(document, point.nodeId)?.node;
  if (!container || !hasRichTextContent(container)) return null;
  const index = direction === "backward" ? point.offset - 1 : point.offset;
  const adjacent = container.content[index];
  if (!adjacent) return null;
  if (isRichTextText(adjacent)) {
    return {
      kind: "text",
      nodeId: adjacent.id,
      offset: direction === "backward" ? adjacent.text.length : 0,
      affinity: point.affinity,
    };
  }
  if (!hasRichTextContent(adjacent)) return { kind: "node", nodeId: adjacent.id };
  const texts = allTextNodes({
    profile: document.profile,
    id: "deletion-probe",
    type: "doc",
    content: adjacent.content as RichTextDocument["content"],
  });
  const text = direction === "backward" ? texts.at(-1) : texts[0];
  return text ? {
    kind: "text",
    nodeId: text.id,
    offset: direction === "backward" ? text.text.length : 0,
    affinity: point.affinity,
  } : { kind: "node", nodeId: adjacent.id };
}

function joinedEmptyBlocks(first: RichTextBlock, second: RichTextBlock): RichTextBlock {
  return { ...first, content: [...first.content, ...second.content] } as RichTextBlock;
}

function sliceRange(
  document: RichTextDocument,
  range: SelectionRange<RichTextPoint>,
  schema: RichTextSchema,
): { readonly content: ReadonlyArray<RichTextNode>; readonly openStart: number; readonly openEnd: number } | null {
  if (pointsEqual(range.anchor, range.focus)) return null;
  if (range.anchor.kind === "child" && range.focus.kind === "child" && range.anchor.nodeId === range.focus.nodeId) {
    const container = range.anchor.nodeId === document.id ? document : findNode(document, range.anchor.nodeId)?.node;
    if (!container || !hasRichTextContent(container)) return null;
    const from = Math.min(range.anchor.offset, range.focus.offset);
    const to = Math.max(range.anchor.offset, range.focus.offset);
    const content = container.content.slice(from, to).map((node) => detachedNode(node));
    const isBlock = content.every((node) => schema.nodes[node.type]?.group === "block");
    return content.length === 0 ? null : { content, openStart: isBlock ? 0 : 1, openEnd: isBlock ? 0 : 1 };
  }
  const targets = richTextTopology(document).interval(range.anchor, range.focus);
  const inlineByBlock = new Map<string, { block: RichTextNode; content: RichTextNode[] }>();
  for (const target of targets) {
    const located = findNode(document, target.nodeId);
    if (!located) continue;
    const block = findContainingTextBlock(document, target.nodeId, schema);
    if (!block) continue;
    const entry = inlineByBlock.get(block.id) ?? { block, content: [] };
    if (target.kind === "text" && isRichTextText(located.node) && target.from < target.to) {
      entry.content.push({ ...located.node, text: located.node.text.slice(target.from, target.to) });
    } else if (target.kind === "node") {
      entry.content.push(detachedNode(located.node));
    }
    inlineByBlock.set(block.id, entry);
  }
  const entries = [...inlineByBlock.values()].filter((entry) => entry.content.length > 0);
  if (entries.length === 0) return null;
  if (entries.length === 1) return { content: entries[0]!.content, openStart: 1, openEnd: 1 };
  return {
    content: entries.map(({ block, content }) => ({ ...block, content } as RichTextNode)),
    openStart: 0,
    openEnd: 0,
  };
}

function findContainingTextBlock(document: RichTextDocument, nodeId: string, schema: RichTextSchema): RichTextNode | null {
  return findAncestors(document, nodeId).reverse().find((node) => {
    if (node.type === "doc") return false;
    const spec = schema.nodes[node.type];
    return spec?.group === "block" && hasRichTextContent(node)
      && node.content.every((child) => schema.nodes[child.type]?.group === "inline");
  }) as RichTextNode | undefined ?? null;
}

function detachedNode(node: RichTextNode): RichTextNode {
  return JSON.parse(JSON.stringify(node)) as RichTextNode;
}

type PasteAtPointResult =
  | { readonly ok: true; readonly value: RichTextDocument; readonly point: RichTextPoint }
  | { readonly ok: false; readonly code: string };

function pasteSliceAtPoint(
  document: RichTextDocument,
  point: RichTextPoint,
  content: ReadonlyArray<RichTextNode>,
  openStart: number,
  openEnd: number,
  schema: RichTextSchema,
  createId: () => string,
): PasteAtPointResult {
  if (!Number.isInteger(openStart) || !Number.isInteger(openEnd) || openStart < 0 || openEnd < 0 || openStart !== openEnd || openStart > 1) {
    return { ok: false, code: "rich-text.clipboard-invalid" };
  }
  const remapped = remapSliceNodeIds(content, schema, createId);
  if (remapped.length === 0) return { ok: false, code: "rich-text.clipboard-invalid" };
  if (openStart === 1) {
    const inserted = insertManyAtPoint(document, point, remapped, createId);
    if (!inserted) return { ok: false, code: "rich-text.clipboard-invalid" };
    const last = remapped.at(-1)!;
    return { ok: true, value: inserted, point: pointAfterNode(inserted, last.id, point.affinity) };
  }
  const allBlocks = remapped.every((node) => schema.nodes[node.type]?.group === "block");
  if (!allBlocks) return { ok: false, code: "rich-text.clipboard-invalid" };
  if (point.kind === "child") {
    const container = point.nodeId === document.id ? document : findNode(document, point.nodeId)?.node;
    if (!container || !hasRichTextContent(container)) return { ok: false, code: "rich-text.invalid-offset" };
    const spec = schema.nodes[container.type]!;
    if (remapped.every((node) => spec.content?.allowedTypes.includes(node.type))) {
      const next = replaceContainerContent(document, container.id, [
        ...container.content.slice(0, point.offset),
        ...remapped,
        ...container.content.slice(point.offset),
      ]);
      return { ok: true, value: next, point: pointAfterNode(next, remapped.at(-1)!.id, point.affinity) };
    }
    const block = (container.type === "paragraph" || container.type === "heading") ? container as RichTextBlock : null;
    if (!block) return { ok: false, code: "rich-text.clipboard-invalid" };
    return pasteBlocksAroundInlineBlock(document, block, point.offset, remapped, createId, point.affinity);
  }
  const block = findTextBlock(document, point.nodeId);
  const located = findText(document, point.nodeId);
  if (!block || !located) return { ok: false, code: "rich-text.point-not-found" };
  const textIndex = block.node.content.findIndex((node) => node.id === point.nodeId);
  const prefix = [
    ...block.node.content.slice(0, textIndex),
    ...(point.offset > 0 ? [{ ...located.node, text: located.node.text.slice(0, point.offset) }] : []),
  ];
  const suffixText = located.node.text.slice(point.offset);
  const suffix = [
    ...(suffixText.length > 0 ? [{ ...located.node, id: createId(), text: suffixText }] : []),
    ...block.node.content.slice(textIndex + 1),
  ];
  const replacement: RichTextNode[] = [
    ...(prefix.length > 0 ? [{ ...block.node, content: prefix } as RichTextNode] : []),
    ...remapped,
    ...(suffix.length > 0 ? [{ id: createId(), type: "paragraph", content: suffix } as RichTextNode] : []),
  ];
  const next = replaceNodeWithMany(document, block.node.id, replacement);
  return { ok: true, value: next, point: pointAfterNode(next, remapped.at(-1)!.id, point.affinity) };
}

function insertManyAtPoint(
  document: RichTextDocument,
  point: RichTextPoint,
  nodes: ReadonlyArray<RichTextNode>,
  createId: () => string,
): RichTextDocument | null {
  if (point.kind === "child") {
    const container = point.nodeId === document.id ? document : findNode(document, point.nodeId)?.node;
    if (!container || !hasRichTextContent(container) || point.offset < 0 || point.offset > container.content.length) return null;
    return replaceContainerContent(document, container.id, [
      ...container.content.slice(0, point.offset),
      ...nodes,
      ...container.content.slice(point.offset),
    ]);
  }
  const located = findText(document, point.nodeId);
  if (!located || !validTextOffset(located.node.text, point.offset)) return null;
  const before = located.node.text.slice(0, point.offset);
  const after = located.node.text.slice(point.offset);
  return replaceNodeWithMany(document, located.node.id, [
    ...(before.length > 0 ? [{ ...located.node, text: before }] : []),
    ...nodes,
    ...(after.length > 0 ? [{ ...located.node, id: createId(), text: after }] : []),
  ]);
}

function pasteBlocksAroundInlineBlock(
  document: RichTextDocument,
  block: RichTextBlock,
  offset: number,
  blocks: ReadonlyArray<RichTextNode>,
  createId: () => string,
  affinity: RichTextPoint["affinity"],
): PasteAtPointResult {
  if (offset < 0 || offset > block.content.length) return { ok: false, code: "rich-text.invalid-offset" };
  const prefix = block.content.slice(0, offset);
  const suffix = block.content.slice(offset);
  const replacement: RichTextNode[] = [
    ...(prefix.length > 0 ? [{ ...block, content: prefix } as RichTextNode] : []),
    ...blocks,
    ...(suffix.length > 0 ? [{ id: createId(), type: "paragraph", content: suffix } as RichTextNode] : []),
  ];
  const next = replaceNodeWithMany(document, block.id, replacement);
  return { ok: true, value: next, point: pointAfterNode(next, blocks.at(-1)!.id, affinity) };
}

function pointAfterNode(document: RichTextDocument, nodeId: string, affinity: RichTextPoint["affinity"]): RichTextPoint {
  const located = findNode(document, nodeId);
  if (!located) return firstSelection(document).ranges[0]!.anchor;
  const lastText = isRichTextText(located.node) ? located.node : hasRichTextContent(located.node) ? allTextNodes({
    profile: document.profile,
    id: "point-probe",
    type: "doc",
    content: located.node.content as RichTextDocument["content"],
  }).at(-1) : undefined;
  if (lastText) return { kind: "text", nodeId: lastText.id, offset: lastText.text.length, affinity };
  return located.parent
    ? { kind: "child", nodeId: located.parent.id, offset: located.index + 1, affinity }
    : firstSelection(document).ranges[0]!.anchor;
}

function siblingReplacementOps(
  current: RichTextDocument,
  located: { readonly node: RichTextDocument | RichTextNode; readonly path: ReadonlyArray<number> },
  replacements: ReadonlyArray<RichTextNode>,
  rootPointer: Pointer,
): import("@interactive-os/json-document").JSONPatchOperation[] | null {
  if (located.path.length === 0 || replacements.length === 0) return null;
  const parentPath = located.path.slice(0, -1);
  const index = located.path[located.path.length - 1]!;
  const parent = nodeAtPath(current, parentPath);
  if (parent === null || !hasRichTextContent(parent)) return null;
  const contentPath = absolutePath(rootPointer, containerContentSegments(parentPath));
  const first = replacements[0]!;
  const operations: import("@interactive-os/json-document").JSONPatchOperation[] = [
    { op: "replace", path: `${contentPath}/${index}`, value: detachedValue(first) },
  ];
  for (let offset = 1; offset < replacements.length; offset += 1) {
    operations.push({ op: "add", path: `${contentPath}/${index + offset}`, value: detachedValue(replacements[offset]!) });
  }
  return operations;
}

function compareKeys(left: ReadonlyArray<number>, right: ReadonlyArray<number>): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] === right[index]) continue;
    if (left[index] === undefined) return -1;
    if (right[index] === undefined) return 1;
    return left[index]! - right[index]!;
  }
  return 0;
}

function locateContainer(
  document: RichTextDocument,
  topology: RichTextTopology,
  nodeId: string,
): { readonly node: RichTextDocument | RichTextNode; readonly path: ReadonlyArray<number> } | null {
  if (nodeId === document.id) return { node: document, path: [] };
  return topology.locate(nodeId);
}

function planInsertNode(
  document: RichTextDocument,
  topology: RichTextTopology,
  point: RichTextPoint,
  node: RichTextNode,
  rootPointer: Pointer,
  createId: () => string,
): {
  readonly operations: import("@interactive-os/json-document").JSONPatchOperation[];
  readonly nodes: ReadonlyArray<RichTextNode>;
  readonly parentPath: ReadonlyArray<number>;
  readonly selection: RichTextSelection;
} | null {
  if (point.kind === "child") {
    const container = locateContainer(document, topology, point.nodeId);
    if (container === null || !hasRichTextContent(container.node) || point.offset < 0 || point.offset > container.node.content.length) {
      return null;
    }
    return {
      operations: [{
        op: "add",
        path: absolutePath(rootPointer, [...containerContentSegments(container.path), point.offset]),
        value: detachedValue(node),
      }],
      nodes: [node],
      parentPath: container.path,
      selection: pointAfterInsertedAt(container.node.id, point.offset, node, point.affinity),
    };
  }
  const located = topology.locate(point.nodeId);
  if (located === null || !isRichTextText(located.node) || !validTextOffset(located.node.text, point.offset)) return null;
  const parentPath = located.path.slice(0, -1);
  const index = located.path[located.path.length - 1]!;
  const contentPath = absolutePath(rootPointer, containerContentSegments(parentPath));
  if (point.offset === 0) {
    return {
      operations: [{ op: "add", path: `${contentPath}/${index}`, value: detachedValue(node) }],
      nodes: [node],
      parentPath,
      selection: pointAfterInsertedAt(parentIdFromPath(document, parentPath), index, node, point.affinity),
    };
  }
  if (point.offset === located.node.text.length) {
    return {
      operations: [{ op: "add", path: `${contentPath}/${index + 1}`, value: detachedValue(node) }],
      nodes: [node],
      parentPath,
      selection: pointAfterInsertedAt(parentIdFromPath(document, parentPath), index + 1, node, point.affinity),
    };
  }
  const left = { ...located.node, text: located.node.text.slice(0, point.offset) };
  const right = { ...located.node, id: createId(), text: located.node.text.slice(point.offset) };
  return {
    operations: [
      { op: "replace", path: `${contentPath}/${index}`, value: detachedValue(left) },
      { op: "add", path: `${contentPath}/${index + 1}`, value: detachedValue(node) },
      { op: "add", path: `${contentPath}/${index + 2}`, value: detachedValue(right) },
    ],
    nodes: [left, node, right],
    parentPath,
    selection: pointAfterInsertedAt(parentIdFromPath(document, parentPath), index + 1, node, point.affinity),
  };
}

function pointAfterInsertedAt(
  parentId: string,
  index: number,
  node: RichTextNode,
  affinity: RichTextPoint["affinity"],
): RichTextSelection {
  if (isRichTextText(node)) return collapsedAtPoint({ kind: "text", nodeId: node.id, offset: node.text.length, affinity });
  return collapsedAtPoint({ kind: "child", nodeId: parentId, offset: index + 1, affinity });
}

function parentIdFromPath(document: RichTextDocument, path: ReadonlyArray<number>): string {
  const parent = nodeAtPath(document, path);
  return parent?.id ?? document.id;
}

function pathStartsWith(path: ReadonlyArray<number>, prefix: ReadonlyArray<number>): boolean {
  return prefix.length <= path.length && prefix.every((value, index) => value === path[index]);
}

function sameNumberPath(left: ReadonlyArray<number>, right: ReadonlyArray<number>): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function shiftPathAfterRemove(
  path: ReadonlyArray<number>,
  removeParent: ReadonlyArray<number>,
  removeIndex: number,
): number[] {
  if (path.length <= removeParent.length || !pathStartsWith(path, removeParent)) return [...path];
  const index = path[removeParent.length]!;
  if (index <= removeIndex) return [...path];
  const next = [...path];
  next[removeParent.length] = index - 1;
  return next;
}

function absolutePath(pointer: Pointer, segments: ReadonlyArray<string | number>): Pointer {
  return buildPointer([...parsePointer(pointer), ...segments]);
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
