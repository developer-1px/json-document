import { type JSONPatchOperation, type JSONValue } from "@interactive-os/json-document";
import { resolveDocumentSource, type EditingDocumentSource } from "./document-source.js";
import { cutEditingClipboard, isClipboardRecord } from "./clipboard.js";
import { createEditingSession, type EditingResult, type EditingSession, type EditingSnapshot } from "./session.js";
import {
  collapsedRangeSelection,
  emptyRangeSelection,
  selectRangePoint,
} from "./range-selection.js";
import { lineInterval, lineTopology } from "./topology.js";

export interface DocumentBlock extends Record<string, JSONValue> {
  readonly id: string;
  readonly text: string;
}

export interface BlockDocument extends Record<string, JSONValue> {
  readonly blocks: ReadonlyArray<DocumentBlock>;
}

export interface DocumentPoint extends Record<string, JSONValue> {
  readonly blockId: string;
  readonly offset: number;
}

export interface DocumentRange extends Record<string, JSONValue> {
  readonly anchor: DocumentPoint;
  readonly focus: DocumentPoint;
}

export interface DocumentSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly ranges: ReadonlyArray<DocumentRange>;
  readonly primaryIndex: number | null;
}

/** Returns the focus point of the primary Document range. */
export function documentSelectionFocus(selection: DocumentSelection): DocumentPoint | null {
  if (selection.primaryIndex === null) return null;
  return selection.ranges[selection.primaryIndex]?.focus ?? null;
}

export interface DocumentClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.blocks+json";
  readonly blocks: ReadonlyArray<DocumentBlock>;
  readonly text: string;
}

export const documentClipboardFormat = {
  mimeType: "application/vnd.interactive-os.blocks+json" as const,
  parse(value: unknown): DocumentClipboard | null {
    return isClipboardRecord(value)
      && value.type === this.mimeType
      && typeof value.text === "string"
      && Array.isArray(value.blocks)
      && value.blocks.every((block) => isClipboardRecord(block) && typeof block.id === "string" && typeof block.text === "string")
      ? value as DocumentClipboard : null;
  },
};

export type DocumentIntent =
  | { readonly type: "selection.set"; readonly blockId: string; readonly mode?: "replace" | "extend" | "toggle"; readonly offset?: number }
  | { readonly type: "text.replace"; readonly blockId: string; readonly text: string; readonly offset?: number }
  | { readonly type: "block.insert"; readonly afterId?: string; readonly text?: string }
  | { readonly type: "selection.remove" }
  | { readonly type: "selection.move"; readonly direction: -1 | 1 }
  | { readonly type: "selection.duplicate" }
  | { readonly type: "clipboard.paste"; readonly clipboard: DocumentClipboard; readonly afterId?: string };

export interface DocumentEditor {
  readonly snapshot: EditingSnapshot<DocumentSelection>;
  readonly selectedBlockIds: ReadonlyArray<string>;
  dispatch(intent: DocumentIntent): EditingResult<DocumentSelection>;
  copy(): DocumentClipboard | null;
  cut(): { readonly clipboard: DocumentClipboard; readonly result: EditingResult<DocumentSelection> } | null;
  undo(): EditingResult<DocumentSelection>;
  redo(): EditingResult<DocumentSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<DocumentSelection>) => void): () => void;
}

export function createDocumentEditor(source: EditingDocumentSource<BlockDocument>, options: { readonly createId?: () => string } = {}): DocumentEditor {
  const document = resolveDocumentSource(source);
  const initial = document.value as BlockDocument;
  let sequence = 0;
  const createId = options.createId ?? (() => `block-${++sequence}`);
  const first = initial.blocks[0];
  const initialSelection = first ? collapsed(first.id, 0) : emptySelection();
  const session = createEditingSession({ document, selection: initialSelection });

  function value(): BlockDocument {
    return session.snapshot.value as BlockDocument;
  }

  function selectedIds(): string[] {
    const blocks = value().blocks;
    const visible = lineTopology(blocks.map((block) => block.id));
    const ids = new Set<string>();
    for (const range of session.snapshot.selection.ranges) {
      for (const id of lineInterval(visible, range.anchor.blockId, range.focus.blockId)) ids.add(id);
    }
    return blocks.filter((block) => ids.has(block.id)).map((block) => block.id);
  }

  function dispatch(intent: DocumentIntent): EditingResult<DocumentSelection> {
    const blocks = value().blocks;
    if (intent.type === "selection.set") {
      const index = blocks.findIndex((block) => block.id === intent.blockId);
      if (index < 0) return failure("selection.block-not-found");
      const point = pointAt(blocks[index]!, intent.offset);
      const selection = selectRangePoint(
        session.snapshot.selection,
        point,
        intent.mode ?? "replace",
        (left, right) => left.blockId === right.blockId,
      );
      return success(session.select(asDocumentSelection(selection)));
    }

    if (intent.type === "text.replace") {
      const index = blocks.findIndex((block) => block.id === intent.blockId);
      if (index < 0) return failure("text.block-not-found");
      const offset = Math.min(intent.text.length, Math.max(0, intent.offset ?? intent.text.length));
      return session.apply({
        operations: [{ op: "replace", path: `/blocks/${index}/text`, value: intent.text }],
        selectionAfter: collapsed(intent.blockId, offset),
        origin: intent.type,
        historyGroup: `text:${intent.blockId}`,
      });
    }

    if (intent.type === "block.insert") {
      const afterIndex = intent.afterId === undefined ? blocks.length - 1 : blocks.findIndex((block) => block.id === intent.afterId);
      if (intent.afterId !== undefined && afterIndex < 0) return failure("insert.target-not-found");
      const block: DocumentBlock = { id: createUniqueId(blocks, createId), text: intent.text ?? "" };
      const index = afterIndex + 1;
      return session.apply({
        operations: [{ op: "add", path: `/blocks/${index}`, value: block }],
        selectionAfter: collapsed(block.id, block.text.length),
        origin: intent.type,
      });
    }

    if (intent.type === "selection.remove") return removeSelected(session, blocks, selectedIds());

    if (intent.type === "selection.move") {
      const ids = selectedIds();
      if (ids.length === 0) return failure("selection.empty");
      const indices = ids.map((id) => blocks.findIndex((block) => block.id === id));
      const start = Math.min(...indices);
      const end = Math.max(...indices);
      if ((intent.direction < 0 && start === 0) || (intent.direction > 0 && end === blocks.length - 1)) return failure("move.boundary");
      const selected = blocks.filter((block) => ids.includes(block.id));
      const insertAt = intent.direction < 0 ? start - 1 : start + 1;
      const operations: JSONPatchOperation[] = [
        ...indices.sort((left, right) => right - left).map((index) => ({
          op: "remove" as const,
          path: `/blocks/${index}`,
        })),
        ...selected.map((block, offset) => ({
          op: "add" as const,
          path: `/blocks/${insertAt + offset}`,
          value: block,
        })),
      ];
      return session.apply({
        operations,
        selectionAfter: session.snapshot.selection,
        origin: intent.type,
      });
    }

    if (intent.type === "selection.duplicate") {
      const selected = blocks.filter((block) => selectedIds().includes(block.id));
      if (selected.length === 0) return failure("selection.empty");
      const lastIndex = Math.max(...selected.map((block) => blocks.findIndex((candidate) => candidate.id === block.id)));
      const copies = cloneBlocksWithUniqueIds(selected, blocks, createId);
      const operations: JSONPatchOperation[] = copies.map((block, offset) => ({ op: "add", path: `/blocks/${lastIndex + 1 + offset}`, value: block }));
      return session.apply({ operations, selectionAfter: rangesFor(copies), origin: intent.type });
    }

    const clipboard = intent.clipboard;
    const target = intent.afterId ?? selectedIds().at(-1);
    const targetIndex = target === undefined ? blocks.length - 1 : blocks.findIndex((block) => block.id === target);
    if (target !== undefined && targetIndex < 0) return failure("paste.target-not-found");
    const pasted = cloneBlocksWithUniqueIds(clipboard.blocks, blocks, createId);
    const operations: JSONPatchOperation[] = pasted.map((block, offset) => ({ op: "add", path: `/blocks/${targetIndex + 1 + offset}`, value: block }));
    return session.apply({ operations, selectionAfter: rangesFor(pasted), origin: intent.type });
  }

  function copy(): DocumentClipboard | null {
    const blocks = value().blocks.filter((block) => selectedIds().includes(block.id));
    if (blocks.length === 0) return null;
    return { type: "application/vnd.interactive-os.blocks+json", blocks, text: blocks.map((block) => block.text).join("\n") };
  }

  return {
    get snapshot() { return session.snapshot; },
    get selectedBlockIds() { return selectedIds(); },
    dispatch,
    copy,
    cut: () => cutEditingClipboard(copy, () => removeSelected(session, value().blocks, selectedIds())),
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

function removeSelected(session: EditingSession<DocumentSelection>, blocks: ReadonlyArray<DocumentBlock>, ids: ReadonlyArray<string>): EditingResult<DocumentSelection> {
  if (ids.length === 0) return failure("selection.empty");
  const indices = ids.map((id) => blocks.findIndex((block) => block.id === id)).filter((index) => index >= 0).sort((left, right) => right - left);
  const remaining = blocks.filter((block) => !ids.includes(block.id));
  const firstRemoved = Math.min(...indices);
  const next = remaining[Math.min(firstRemoved, remaining.length - 1)];
  return session.apply({
    operations: indices.map((index) => ({ op: "remove", path: `/blocks/${index}` })),
    selectionAfter: next ? collapsed(next.id, 0) : emptySelection(),
    origin: "selection.remove",
  });
}

function pointAt(block: DocumentBlock, offset = 0): DocumentPoint {
  return { blockId: block.id, offset: Math.min(block.text.length, Math.max(0, offset)) };
}

function collapsed(blockId: string, offset: number): DocumentSelection {
  const point: DocumentPoint = { blockId, offset };
  return asDocumentSelection(collapsedRangeSelection(point));
}

function emptySelection(): DocumentSelection {
  return asDocumentSelection(emptyRangeSelection());
}

function asDocumentSelection(
  selection: {
    readonly ranges: ReadonlyArray<{ readonly anchor: DocumentPoint; readonly focus: DocumentPoint }>;
    readonly kind: "range";
    readonly primaryIndex: number | null;
  },
): DocumentSelection {
  return {
    kind: "range",
    ranges: selection.ranges.map((range) => ({
      anchor: { ...range.anchor },
      focus: { ...range.focus },
    })),
    primaryIndex: selection.primaryIndex,
  };
}

function rangesFor(blocks: ReadonlyArray<DocumentBlock>): DocumentSelection {
  return { kind: "range", ranges: blocks.map((block) => ({ anchor: pointAt(block), focus: pointAt(block) })), primaryIndex: blocks.length === 0 ? null : 0 };
}

function createUniqueId(blocks: ReadonlyArray<DocumentBlock>, createId: () => string): string {
  const existing = new Set(blocks.map((block) => block.id));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = createId();
    if (!existing.has(id)) return id;
  }
  throw new Error("createId did not produce a unique block id");
}

function cloneBlocksWithUniqueIds(
  source: ReadonlyArray<DocumentBlock>,
  existing: ReadonlyArray<DocumentBlock>,
  createId: () => string,
): DocumentBlock[] {
  const occupied = [...existing];
  return source.map((block) => {
    const copy = { ...block, id: createUniqueId(occupied, createId) };
    occupied.push(copy);
    return copy;
  });
}

function success(snapshot: EditingSnapshot<DocumentSelection>): EditingResult<DocumentSelection> {
  return { ok: true, snapshot };
}

function failure(code: string): EditingResult<DocumentSelection> {
  return { ok: false, code };
}
