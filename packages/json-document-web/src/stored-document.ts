import type {JSONValue} from "@interactive-os/json-document";

export interface WebStoredDocumentSource {
  readonly snapshot: {readonly value: JSONValue};
  subscribe(listener: () => void): () => void;
}
export type WebDocumentSaveState = "saved" | "unsaved" | "load-error" | "save-error";
export interface WebStoredDocumentOptions<Source extends WebStoredDocumentSource> {
  readonly key: string;
  /** Lazy access also captures browsers that deny access to localStorage itself. */
  readonly storage: () => {getItem(key: string): string | null; setItem(key: string, value: string): void};
  /** Validate and construct the canonical document/editor, or throw on invalid stored data. */
  readonly restore: (value: unknown) => Source;
  readonly create: () => Source;
}
export interface WebStoredDocument<Source extends WebStoredDocumentSource> {
  readonly source: Source;
  readonly state: WebDocumentSaveState;
  subscribe(listener: () => void): () => void;
  /** Observe value changes only. Returns cleanup; selection movement never writes storage. */
  connect(): () => void;
  save(): void;
}

/** Browser persistence for one canonical source. History and selection remain with the source. */
export function createWebStoredDocument<Source extends WebStoredDocumentSource>(options: WebStoredDocumentOptions<Source>): WebStoredDocument<Source> {
  let source: Source;
  let state: WebDocumentSaveState = "unsaved";
  try {
    const stored = options.storage().getItem(options.key);
    if (stored === null) source = options.create();
    else {source = options.restore(JSON.parse(stored)); state = "saved";}
  } catch {source = options.create(); state = "load-error";}
  const listeners = new Set<() => void>();
  let observed = source.snapshot.value;
  const publish = (next: WebDocumentSaveState) => {if (state !== next) {state = next; for (const listener of listeners) listener();}};
  const save = () => {
    try {options.storage().setItem(options.key, JSON.stringify(source.snapshot.value)); publish("saved");}
    catch {publish("save-error");}
  };
  return {
    source, get state() {return state;}, save,
    subscribe(listener) {listeners.add(listener); return () => {listeners.delete(listener);};},
    connect() {
      if (state === "unsaved") save();
      return source.subscribe(() => {
        const value = source.snapshot.value;
        if (value === observed) return;
        observed = value; save();
      });
    },
  };
}
