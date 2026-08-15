import {
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
    const nextIds = next.content.map((node) => node.id);
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
