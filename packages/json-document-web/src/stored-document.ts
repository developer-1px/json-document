import type {JSONValue} from "@interactive-os/json-document";

export interface WebStoredDocumentSource {
  readonly snapshot: {readonly value: JSONValue};
  subscribe(listener: () => void): () => void;
}
export type WebDocumentSaveState = "saved" | "saving" | "unsaved" | "load-error" | "save-error";
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
  save(): void | Promise<void>;
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
  return bindStoredDocument(source, state, value => options.storage().setItem(options.key, JSON.stringify(value)));
}

export interface WebAsyncDocumentStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export interface WebAsyncStoredDocumentOptions<Source extends WebStoredDocumentSource> extends Omit<WebStoredDocumentOptions<Source>, "storage"> {
  readonly storage: WebAsyncDocumentStorage;
  /** Migration fallback; only read when the primary store has no document. Never removes legacy data. */
  readonly legacyStorage?: () => {getItem(key: string): string | null};
}
/** Load before mounting an editor so a late disk read can never overwrite in-progress edits. */
export async function openWebStoredDocument<Source extends WebStoredDocumentSource>(options: WebAsyncStoredDocumentOptions<Source>): Promise<WebStoredDocument<Source>> {
  let source: Source;
  let state: WebDocumentSaveState = "unsaved";
  try {
    const stored = await options.storage.getItem(options.key);
    const legacy = stored === null ? options.legacyStorage?.().getItem(options.key) ?? null : null;
    source = stored !== null || legacy !== null ? options.restore(JSON.parse((stored ?? legacy)!)) : options.create();
    state = stored !== null ? "saved" : "unsaved";
  } catch {source = options.create(); state = "load-error";}
  let pending = Promise.resolve();
  return bindStoredDocument(source, state, value => {
    const text = JSON.stringify(value);
    const write = pending.then(() => options.storage.setItem(options.key, text));
    pending = write.catch(() => {});
    return write;
  });
}
function bindStoredDocument<Source extends WebStoredDocumentSource>(source: Source, initialState: WebDocumentSaveState, write: (value: JSONValue) => void | Promise<void>): WebStoredDocument<Source> {
  const listeners = new Set<() => void>();
  let state = initialState;
  let observed = source.snapshot.value;
  let revision = 0;
  const publish = (next: WebDocumentSaveState) => {if (state !== next) {state = next; for (const listener of listeners) listener();}};
  const save = () => {
    const current = ++revision;
    try {
      const result = write(source.snapshot.value);
      if (result) {
        publish("saving");
        return result.then(() => {if (current === revision) publish("saved");}, () => {if (current === revision) publish("save-error");});
      }
      publish("saved");
    } catch {publish("save-error");}
  };
  return {source, get state() {return state;}, save,
    subscribe(listener) {listeners.add(listener); return () => {listeners.delete(listener);};},
    connect() {
      if (state === "unsaved") void save();
      return source.subscribe(() => {const value = source.snapshot.value; if (value === observed) return; observed = value; void save();});
    },
  };
}
