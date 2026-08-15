import {
  appliedOperationsFor,
  hasRichTextContent,
  richTextTopology,
  type RichTextDocument,
  type RichTextEditor,
  type RichTextNode,
} from "@interactive-os/json-document-rich-text";

export interface RichTextRenderStore {
  getBlockIds(): ReadonlyArray<string>;
  getDocumentId(): string;
  getNode(nodeId: string): RichTextNode | null;
  subscribeNode(nodeId: string, notify: () => void): () => void;
  subscribeStructure(notify: () => void): () => void;
}

const stores = new WeakMap<RichTextEditor, RichTextRenderStore>();

let lastBlockScan = 0;

export function lastRenderStoreBlockScan(): number {
  return lastBlockScan;
}

export function richTextRenderStore(editor: RichTextEditor): RichTextRenderStore {
  const cached = stores.get(editor);
  if (cached) return cached;
  const created = createRichTextRenderStore(editor);
  stores.set(editor, created);
  return created;
}

function createRichTextRenderStore(editor: RichTextEditor): RichTextRenderStore {
  let document = editor.snapshot.value as RichTextDocument;
  let blockIds: ReadonlyArray<string> = document.content.map((node) => node.id);
  const nodeListeners = new Map<string, Set<() => void>>();
  const structureListeners = new Set<() => void>();

  editor.subscribe((snapshot) => {
    const next = snapshot.value as RichTextDocument;
    if (next === document) return;
    const previous = document;
    document = next;
    const applied = appliedOperationsFor(next);
    if (applied !== null && !contentStructureChanged(applied)) {
      lastBlockScan = applied.length;
      for (const operation of applied) notifyAppliedPath(next, operation.path, nodeListeners);
      return;
    }
    const nextIds = next.content.map((node) => node.id);
    lastBlockScan = next.content.length;
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
    subscribeNode(nodeId, notify) {
      const listeners = nodeListeners.get(nodeId) ?? new Set<() => void>();
      listeners.add(notify);
      nodeListeners.set(nodeId, listeners);
      return () => {
        listeners.delete(notify);
        if (listeners.size === 0) nodeListeners.delete(nodeId);
      };
    },
    subscribeStructure(notify) {
      structureListeners.add(notify);
      return () => { structureListeners.delete(notify); };
    },
  };
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
