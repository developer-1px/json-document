import { lineBoundary, moveLinePoint } from "@interactive-os/json-document-web";
import { applyAffordance } from "./result.js";
import { focusAffordance, renameAffordance, typeaheadAffordance } from "./select.js";

export interface TypeaheadSessionSnapshot {
  readonly buffer: string;
  readonly at: number;
}

export interface TypeaheadSessionInput<Key> {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly timeStamp: number;
  readonly items: ReadonlyArray<{ readonly key: Key; readonly name: string }>;
  readonly fromKey: Key | null;
}

export interface TypeaheadSession<Key> {
  getSnapshot(): TypeaheadSessionSnapshot;
  handle(input: TypeaheadSessionInput<Key>): boolean;
  reset(): void;
}

export function createTypeaheadSession<Key>(options: {
  readonly onMatch: (key: Key) => void;
  readonly onSnapshot?: (snapshot: TypeaheadSessionSnapshot) => void;
}): TypeaheadSession<Key> {
  let snapshot: TypeaheadSessionSnapshot = { buffer: "", at: 0 };
  function publish(next: TypeaheadSessionSnapshot) {
    snapshot = next;
    options.onSnapshot?.(snapshot);
  }
  return {
    getSnapshot: () => snapshot,
    handle(input) {
      const from = input.items.find((item) => Object.is(item.key, input.fromKey))?.name ?? null;
      const result = typeaheadAffordance({
        buffer: snapshot.buffer,
        key: input.key,
        metaKey: input.metaKey,
        ctrlKey: input.ctrlKey,
        altKey: input.altKey,
        elapsedMs: input.timeStamp - snapshot.at,
        names: input.items.map((item) => item.name),
        from,
      });
      let consumed = false;
      applyAffordance(result, {
        hand(hand) {
          if (hand.type !== "typeahead") return;
          consumed = true;
          publish({ buffer: hand.buffer, at: input.timeStamp });
          const item = input.items.find((candidate) => candidate.name === hand.name);
          if (item !== undefined) options.onMatch(item.key);
        },
      });
      return consumed;
    },
    reset() {
      publish({ buffer: "", at: 0 });
    },
  };
}

export interface RenameSessionSnapshot<Key> {
  readonly key: Key;
  readonly draft: string;
}

export interface RenameSession<Key> {
  getSnapshot(): RenameSessionSnapshot<Key> | null;
  begin(key: Key, label: string): void;
  update(draft: string): void;
  handleKey(key: string): boolean;
  handlePointer(key: Key, label: string, detail: number, timeStamp: number): boolean;
  commit(): void;
  cancel(): void;
}

export function createRenameSession<Key>(options: {
  readonly onCommit: (key: Key, draft: string) => void;
  readonly onFinish?: (key: Key) => void;
  readonly onSnapshot?: (snapshot: RenameSessionSnapshot<Key> | null) => void;
}): RenameSession<Key> {
  let snapshot: RenameSessionSnapshot<Key> | null = null;
  let lastClick: { readonly key: Key; readonly at: number } | null = null;
  function publish(next: RenameSessionSnapshot<Key> | null) {
    snapshot = next;
    options.onSnapshot?.(snapshot);
  }
  function finish(commit: boolean) {
    if (snapshot === null) return;
    const finished = snapshot;
    if (commit) options.onCommit(finished.key, finished.draft);
    publish(null);
    options.onFinish?.(finished.key);
  }
  return {
    getSnapshot: () => snapshot,
    begin(key, label) {
      publish({ key, draft: label });
    },
    update(draft) {
      if (snapshot !== null) publish({ ...snapshot, draft });
    },
    handleKey(key) {
      if (snapshot === null) return false;
      const result = renameAffordance({ key });
      let consumed = false;
      applyAffordance(result, {
        hand(hand) {
          if (hand.type !== "rename") return;
          consumed = true;
          if (hand.action === "commit") finish(true);
          if (hand.action === "cancel") finish(false);
        },
      });
      return consumed;
    },
    handlePointer(key, label, detail, timeStamp) {
      const intervalMs = lastClick !== null && Object.is(lastClick.key, key) ? timeStamp - lastClick.at : 0;
      lastClick = { key, at: timeStamp };
      const result = renameAffordance({ type: "pointer", detail, intervalMs });
      let consumed = false;
      applyAffordance(result, {
        hand(hand) {
          if (hand.type === "rename" && hand.action === "begin") {
            consumed = true;
            publish({ key, draft: label });
          }
        },
      });
      return consumed;
    },
    commit: () => finish(true),
    cancel: () => finish(false),
  };
}

export interface LineFocusSession<Key extends string> {
  getFocusKey(): Key | null;
  setFocus(key: Key | null): void;
  handle(input: { readonly key: string; readonly shiftKey: boolean }, keys: ReadonlyArray<Key>): boolean;
}

export function createLineFocusSession<Key extends string>(options: {
  readonly initialKey?: Key | null;
  readonly onFocus: (key: Key | null) => void;
}): LineFocusSession<Key> {
  let focusKey = options.initialKey ?? null;
  function setFocus(key: Key | null) {
    focusKey = key;
    options.onFocus(key);
  }
  return {
    getFocusKey: () => focusKey,
    setFocus,
    handle(input, keys) {
      const result = focusAffordance(input);
      let consumed = false;
      applyAffordance(result, {
        hand(hand) {
          if (hand.type === "move") {
            consumed = true;
            const from = focusKey ?? keys[0];
            setFocus(from === undefined ? null : moveLinePoint(keys, from, hand.direction) as Key | null);
          }
          if (hand.type === "boundary") {
            consumed = true;
            setFocus(lineBoundary(keys, hand.edge) as Key | null);
          }
        },
      });
      return consumed;
    },
  };
}
