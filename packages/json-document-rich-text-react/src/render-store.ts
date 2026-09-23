import { buildPointer, parsePointer, readPointer, type JSONValue } from "@interactive-os/json-document";
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
  setComposing(composing: boolean): void;
  getNodeVersion(nodeId: string): number;
  getRenderRevision(): number;
  getBlockIds(): ReadonlyArray<string>;
  getDocumentId(): string;
  getNode(nodeId: string): RichTextNode | null;
  getPlaceholderBlockId(): string | null;
  subscribeNode(nodeId: string, notify: () => void): () => void;
  subscribePlaceholder(notify: () => void): () => void;
  subscribeStructure(notify: () => void): () => void;
}

export function createRichTextRenderStore(editor: RichTextEditor): RichTextRenderStore {
  const pointer = buildPointer(parsePointer(editor.pointer ?? ""));
  let document = documentAtPointer(editor.snapshot.value, pointer);
  let blockIds: ReadonlyArray<string> = document.content.map((node) => node.id);
  let placeholderBlockId: string | null = null;
  let placeholderInitialized = false;
  let visibleBlocks = new Set<string>();
  const nodeListeners = new Map<string, Set<() => void>>();
  const placeholderListeners = new Set<() => void>();
  const structureListeners = new Set<() => void>();
  let unsubscribeEditor: (() => void) | null = null;
  let composing = false;
  let composingBlockId: string | undefined;
  const nodeVersions = new Map<string, number>();
  let renderRevision = 0;

  function synchronize(snapshot = editor.snapshot, catchUp = false): void {
    if (composing) return;
    const next = documentAtPointer(snapshot.value, pointer);
    if (next === document) return;
    const previous = document;
    document = next;
    // A disconnected store can have missed more than the latest change.
    const recorded = catchUp || unsubscribeEditor === null ? null : appliedOperationsFor(next);
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
  }

  function observe(): void {
    synchronize();
    unsubscribeEditor ??= editor.subscribe(synchronize);
  }

  function release(): void {
    if (nodeListeners.size || placeholderListeners.size || structureListeners.size) return;
    unsubscribeEditor?.();
    unsubscribeEditor = null;
  }

  return {
    setComposing(next) {
      if (composing === next) return;
      if (next) {
        synchronize();
        const selection = editor.snapshot.selection;
        const point = selection.primaryIndex === null ? undefined : selection.ranges[selection.primaryIndex]?.anchor;
        const path = point === undefined ? undefined : richTextTopology(document).locate(point.nodeId)?.path;
        const index = path?.[0] ?? (point?.kind === "child" && path?.length === 0 ? point.offset : undefined);
        composingBlockId = index === undefined ? undefined : document.content[index]?.id;
        composing = true;
        return;
      }
      composing = false;
      // More than one change may have arrived during this root's DOM lease.
      synchronize(editor.snapshot, true);
      renderRevision++;
      if (composingBlockId !== undefined) {
        // Native DOM can differ even after cancellation or a rejected commit.
        // Replace only its block's React boundary, not the whole document.
        nodeVersions.set(composingBlockId, renderRevision);
        notifyNode(composingBlockId, nodeListeners);
        composingBlockId = undefined;
      }
      for (const notify of structureListeners) notify();
    },
    getNodeVersion(nodeId) { return nodeVersions.get(nodeId) ?? 0; },
    getRenderRevision() { return renderRevision; },
    getBlockIds() { synchronize(); return blockIds; },
    getDocumentId() { synchronize(); return document.id; },
    getNode(nodeId) {
      synchronize();
      const located = richTextTopology(document).locate(nodeId);
      return located && located.node.type !== "doc" ? located.node as RichTextNode : null;
    },
    getPlaceholderBlockId() {
      synchronize();
      if (!placeholderInitialized) {
        placeholderBlockId = rebuildPlaceholderState(document, visibleBlocks);
        placeholderInitialized = true;
      }
      return placeholderBlockId;
    },
    subscribeNode(nodeId, notify) {
      observe();
      const listeners = nodeListeners.get(nodeId) ?? new Set<() => void>();
      listeners.add(notify);
      nodeListeners.set(nodeId, listeners);
      return () => {
        listeners.delete(notify);
        if (listeners.size === 0) nodeListeners.delete(nodeId);
        release();
      };
    },
    subscribePlaceholder(notify) {
      observe();
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
        release();
      };
    },
    subscribeStructure(notify) {
      observe();
      structureListeners.add(notify);
      return () => { structureListeners.delete(notify); release(); };
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
  operations: ReadonlyArray<{ readonly op: string; readonly path: string; readonly from?: string }>,
  pointer: string,
): ReadonlyArray<{ readonly op: string; readonly path: string }> {
  if (pointer === "") return operations;
  return operations.flatMap((operation) => {
    if (operation.path === pointer || operation.path.startsWith(`${pointer}/`)) {
      return [{ ...operation, path: operation.path.slice(pointer.length) }];
    }
    // A move out of the bound subtree still changes its source structure.
    return operation.op === "move" && (operation.from === pointer || operation.from?.startsWith(`${pointer}/`))
      ? [{ op: "move", path: "" }] : [];
  });
}

function documentAtPointer(value: JSONValue, pointer: string): RichTextDocument {
  const result = readPointer(value, pointer);
  if (!result.ok) throw new TypeError(`Rich Text document was not found at ${JSON.stringify(pointer)}.`);
  return result.value as RichTextDocument;
}

function contentStructureChanged(
  applied: ReadonlyArray<{ readonly op: string; readonly path: string }>,
): boolean {
  return applied.some((operation) => {
    if (operation.op === "move") return true;
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
