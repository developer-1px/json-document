import { useMemo, useSyncExternalStore } from "react";
import type { JSONValue } from "@interactive-os/json-document";
import type { EditingSnapshot } from "@interactive-os/json-document-editing";

export interface EditingSnapshotSource<Selection extends JSONValue> {
  readonly snapshot: EditingSnapshot<Selection>;
  subscribe(listener: (snapshot: EditingSnapshot<Selection>) => void): () => void;
}

export function useEditingSnapshot<Selection extends JSONValue>(
  source: EditingSnapshotSource<Selection>,
): EditingSnapshot<Selection> {
  const store = useMemo(() => createSnapshotStore(source), [source]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
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
