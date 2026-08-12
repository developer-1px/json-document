import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { JSONDocument, JSONValue } from "@interactive-os/json-document";
import {
  createDocumentEditor,
  type BlockDocument,
  type DocumentEditor,
  type EditingSnapshot,
} from "@interactive-os/json-document-editing";

export interface EditingSnapshotSource<Selection extends JSONValue> {
  readonly snapshot: EditingSnapshot<Selection>;
  subscribe(listener: (snapshot: EditingSnapshot<Selection>) => void): () => void;
}

export function useJSONDocumentValue(document: JSONDocument): JSONValue {
  const subscribe = useCallback(
    (notify: () => void) => document.subscribe(() => notify()),
    [document],
  );
  const getSnapshot = useCallback(() => document.value, [document]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useEditingSnapshot<Selection extends JSONValue>(
  source: EditingSnapshotSource<Selection>,
): EditingSnapshot<Selection> {
  const store = useMemo(() => createSnapshotStore(source), [source]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export function useDocumentEditor(
  initial: BlockDocument,
  options: { readonly createId?: () => string } = {},
): DocumentEditor {
  const [editor] = useState(() => createDocumentEditor(initial, options));
  return editor;
}

function createSnapshotStore<Selection extends JSONValue>(
  source: EditingSnapshotSource<Selection>,
): {
  readonly getSnapshot: () => EditingSnapshot<Selection>;
  readonly subscribe: (notify: () => void) => () => void;
} {
  let current = source.snapshot;

  return {
    getSnapshot: () => current,
    subscribe(notify) {
      const latest = source.snapshot;
      if (latest.revision !== current.revision) current = latest;
      return source.subscribe((snapshot) => {
        current = snapshot;
        notify();
      });
    },
  };
}
