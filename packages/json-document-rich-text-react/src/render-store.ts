import {
  appliedOperationsFor,
  hasRichTextContent,
  richTextTopology,
  type RichTextDocument,
  type RichTextEditor,
  type RichTextNode,
} from "@interactive-os/json-document-rich-text";
import { recordPlaceholderScan, recordRenderStoreBlockScan } from "./render-instrument.js";

export interface RichTextRenderStore {
  getBlockIds(): ReadonlyArray<string>;
  getDocumentId(): string;
  getNode(nodeId: string): RichTextNode | null;
  getPlaceholderBlockId(): string | null;
  subscribeNode(nodeId: string, notify: () => void): () => void;
  subscribePlaceholder(notify: () => void): () => void;
  subscribeStructure(notify: () => void): () => void;
}

const stores = new WeakMap<RichTextEditor, RichTextRenderStore>();

export function richTextRenderStore(editor: RichTextEditor): RichTextRenderStore {
  const cached = stores.get(editor);
  if (cached) return cached;
  const created = createRichTextRenderStore(editor);
  stores.set(editor, created);
  return created;
}

function createRichTextRenderStore(editor: RichTextEditor): RichTextRenderStore {
  const pointer = editor.pointer ?? "";
  let document = documentAtPointer(editor.snapshot.value, pointer);
  let blockIds: ReadonlyArray<string> = document.content.map((node) => node.id);
  let placeholderBlockId: string | null = null;
  let placeholderInitialized = false;
  let visibleBlocks = new Set<string>();
  const nodeListeners = new Map<string, Set<() => void>>();
  const placeholderListeners = new Set<() => void>();
  const structureListeners = new Set<() => void>();

  editor.subscribe((snapshot) => {
    const next = documentAtPointer(snapshot.value, pointer);
    if (next === document) return;
    const previous = document;
    document = next;
    const recorded = appliedOperationsFor(next);
    const applied = recorded === null ? null : relativeOperations(recorded, pointer);
    if (placeholderListeners.size > 0) {
      const nextPlaceholderBlockId = applied !== null && !contentStructureChanged(applied)
        ? updatePlaceholderFromApplied(previous, next, applied, visibleBlocks)
        : rebuildPlaceholderState(next, visibleBlocks);
      if (nextPlaceholderBlockId !== placeholderBlockId) {
        placeholderBlockId = nextPlaceholderBlockId;
        for (const notify of placeholderListeners) notify();
      }
    } else {
      recordPlaceholderScan(0);
      if (placeholderInitialized) {
        placeholderInitialized = false;
        visibleBlocks = new Set();
      }
    }
    if (applied !== null && !contentStructureChanged(applied)) {
      recordRenderStoreBlockScan(applied.length);
      for (const operation of applied) notifyAppliedPath(next, operation.path, nodeListeners);
      return;
    }
    const nextIds = next.content.map((node) => node.id);
    recordRenderStoreBlockScan(next.content.length);
    const structureChanged = nextIds.length !== blockIds.length
      || nextIds.some((id, index) => id !== blockIds[index]);
    const previousBlocks = previous.content;
    for (let index = 0; index < next.content.length; index += 1) {
      const block = next.content[index]!;
      if (previousBlocks[index] === block) continue;
      const listeners = nodeListeners.get(block.id);
      if (listeners) for (const notify of listeners) notify();
    }
    if (structureChanged) {
      blockIds = nextIds;
      for (const notify of structureListeners) notify();
    }
  });

  return {
    getBlockIds() { return blockIds; },
    getDocumentId() { return document.id; },
    getNode(nodeId) {
      const located = richTextTopology(document).locate(nodeId);
      return located && located.node.type !== "doc" ? located.node as RichTextNode : null;
    },
    getPlaceholderBlockId() {
      if (!placeholderInitialized) {
        placeholderBlockId = rebuildPlaceholderState(document, visibleBlocks);
        placeholderInitialized = true;
      }
      return placeholderBlockId;
    },
    subscribeNode(nodeId, notify) {
      const listeners = nodeListeners.get(nodeId) ?? new Set<() => void>();
      listeners.add(notify);
      nodeListeners.set(nodeId, listeners);
      return () => {
        listeners.delete(notify);
        if (listeners.size === 0) nodeListeners.delete(nodeId);
      };
    },
    subscribePlaceholder(notify) {
      if (placeholderListeners.size === 0) {
        placeholderBlockId = rebuildPlaceholderState(document, visibleBlocks);
        placeholderInitialized = true;
      }
      placeholderListeners.add(notify);
      return () => {
        placeholderListeners.delete(notify);
        if (placeholderListeners.size === 0) {
          visibleBlocks = new Set();
          placeholderInitialized = false;
        }
      };
    },
    subscribeStructure(notify) {
      structureListeners.add(notify);
      return () => { structureListeners.delete(notify); };
    },
  };
}

function rebuildPlaceholderState(document: RichTextDocument, visibleBlocks: Set<string>): string | null {
  visibleBlocks.clear();
  for (const block of document.content) if (hasVisibleContent(block)) visibleBlocks.add(block.id);
  recordPlaceholderScan(document.content.length);
  return placeholderBlockFor(document, visibleBlocks);
}

function updatePlaceholderFromApplied(
  previous: RichTextDocument,
  next: RichTextDocument,
  applied: ReadonlyArray<{ readonly path: string }>,
  visibleBlocks: Set<string>,
): string | null {
  const changedIndexes = new Set<number>();
  for (const operation of applied) {
    const match = /^\/content\/(\d+)/.exec(operation.path);
    if (match !== null) changedIndexes.add(Number(match[1]));
  }
  for (const index of changedIndexes) {
    const before = previous.content[index];
    const after = next.content[index];
    if (before !== undefined) visibleBlocks.delete(before.id);
    if (after !== undefined && hasVisibleContent(after)) visibleBlocks.add(after.id);
  }
  recordPlaceholderScan(changedIndexes.size);
  return placeholderBlockFor(next, visibleBlocks);
}

function placeholderBlockFor(document: RichTextDocument, visibleBlocks: ReadonlySet<string>): string | null {
  const first = document.content[0];
  if (first === undefined || !isPlaceholderBlock(first)) return null;
  return visibleBlocks.size === 0 ? first.id : null;
}

function hasVisibleContent(node: RichTextNode): boolean {
  if (node.type === "text" && "text" in node) return node.text.length > 0;
  if (node.type === "hardBreak" || !hasRichTextContent(node)) return true;
  return node.content.some(hasVisibleContent);
}

function isPlaceholderBlock(node: RichTextNode): boolean {
  return node.type === "paragraph" || node.type === "heading" || node.type === "codeBlock";
}

function relativeOperations(
  operations: ReadonlyArray<{ readonly op: string; readonly path: string }>,
  pointer: string,
): ReadonlyArray<{ readonly op: string; readonly path: string }> {
  if (pointer === "") return operations;
  return operations
    .filter((operation) => operation.path === pointer || operation.path.startsWith(`${pointer}/`))
    .map((operation) => ({ ...operation, path: operation.path.slice(pointer.length) }));
}

function documentAtPointer(value: unknown, pointer: string): RichTextDocument {
  if (pointer === "") return value as RichTextDocument;
  let current = value;
  for (const segment of pointer.slice(1).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (current === null || typeof current !== "object") throw new TypeError(`Rich Text document was not found at ${JSON.stringify(pointer)}.`);
    current = (current as Readonly<Record<string, unknown>>)[segment];
  }
  return current as RichTextDocument;
}

function contentStructureChanged(
  applied: ReadonlyArray<{ readonly op: string; readonly path: string }>,
): boolean {
  return applied.some((operation) => {
    if (operation.path === "" || operation.path === "/content") return true;
    return (operation.op === "add" || operation.op === "remove") && /^\/content\/\d+$/.test(operation.path);
  });
}

function notifyAppliedPath(
  document: RichTextDocument,
  path: string,
  nodeListeners: Map<string, Set<() => void>>,
): void {
  const match = /^\/content\/(\d+)(?:\/content\/(\d+))?/.exec(path);
  if (match === null) return;
  const block = document.content[Number(match[1])];
  if (block === undefined) return;
  notifyNode(block.id, nodeListeners);
  if (match[2] === undefined || !hasRichTextContent(block)) return;
  const child = block.content[Number(match[2])];
  if (child !== undefined) notifyNode(child.id, nodeListeners);
}

function notifyNode(nodeId: string, nodeListeners: Map<string, Set<() => void>>): void {
  const listeners = nodeListeners.get(nodeId);
  if (listeners === undefined) return;
  for (const notify of listeners) notify();
}
