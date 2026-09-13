import { useMemo, useRef, useSyncExternalStore } from "react";
import { createRenameSession, type RenameSession, type RenameSessionSnapshot } from "@interactive-os/json-document-affordance";

export interface UseRenameSessionOptions<Key> {
  /** Replacing the owner discards the old owner's draft. */
  readonly owner: object;
  readonly tryCommit: (key: Key, draft: string) => boolean;
  readonly onFinish?: (key: Key) => void;
}
export interface RenameSessionBinding<Key> {
  readonly snapshot: RenameSessionSnapshot<Key> | null;
  readonly session: RenameSession<Key>;
}

/** Bind the canonical draft session to React observation and owner replacement. */
export function useRenameSession<Key>(options: UseRenameSessionOptions<Key>): RenameSessionBinding<Key> {
  const current = useRef(options); current.current = options;
  const store = useMemo(() => {
    const owner = options.owner;
    const listeners = new Set<() => void>();
    const session = createRenameSession<Key>({
      tryCommit: (key, draft) => current.current.owner === owner && current.current.tryCommit(key, draft),
      onFinish: key => {if (current.current.owner === owner) current.current.onFinish?.(key);},
      onSnapshot: () => listeners.forEach(listener => listener()),
    });
    return {session, subscribe(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};}};
  }, [options.owner]);
  const snapshot = useSyncExternalStore(store.subscribe, store.session.getSnapshot, store.session.getSnapshot);
  return {snapshot, session: store.session};
}
