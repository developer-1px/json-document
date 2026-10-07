import { recordingTarget, recordingDOMSnapshot, recordingEventData, RECORDING_EVENTS } from "./interaction-recording-dom.js";

export interface WebInteractionRecord {
  readonly sequence: number;
  readonly milliseconds: number;
  readonly path: string;
  readonly kind: string;
  readonly eventId: number | null;
  readonly targetId: number | null;
  readonly detail: unknown;
}
export interface WebInteractionRecording {
  readonly version: 1;
  readonly id: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly reason: string | null;
  readonly environment: Readonly<Record<string, unknown>>;
  readonly records: readonly WebInteractionRecord[];
}
export interface WebInteractionRecorder {
  start(): void;
  stop(reason?: string): WebInteractionRecording | null;
  snapshot(): WebInteractionRecording | null;
  readonly recording: boolean;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}
type Sink = (root: HTMLElement, kind: string, read: () => unknown, event?: Event) => void;
const sinks = new WeakMap<Document, Set<Sink>>();
const sources = new WeakMap<Document, Map<HTMLElement, Map<string, () => unknown>>>();

/** No snapshot work or event dispatch occurs when no recorder is active. */
export function traceWebInteraction(root: HTMLElement, kind: string, read: () => unknown, event?: Event): void {
  if (!sinks.get(root.ownerDocument)?.size || !recordingTarget(root)) return;
  for (const sink of sinks.get(root.ownerDocument) ?? []) {
    try { sink(root, kind, read, event); } catch { /* Diagnostics must not change editing behavior. */ }
  }
}

/** Register a canonical owner's state for the initial REC snapshot. */
export function registerWebInteractionSource(root: HTMLElement, name: string, read: () => unknown): () => void {
  let roots = sources.get(root.ownerDocument);
  if (!roots) sources.set(root.ownerDocument, roots = new Map());
  let readers = roots.get(root);
  if (!readers) roots.set(root, readers = new Map());
  readers.set(name, read);
  return () => {
    if (readers.get(name) === read) readers.delete(name);
    if (!readers.size) roots.delete(root);
  };
}

/** Event and DOM evidence for any screen in one document; never cancels an input. */
export function createWebInteractionRecorder(options: {
  document: Document;
  maxBytes?: number;
  maxRecords?: number;
}): WebInteractionRecorder {
  const doc = options.document;
  const win = doc.defaultView!;
  let session: WebInteractionRecording | null = null;
  let active = false;
  let startTime = 0;
  let bytes = 0;
  let events = new WeakMap<Event, number>();
  let targets = new WeakMap<Element, number>();
  let nextEvent = 0;
  let nextTarget = 0;
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of listeners) { try { listener(); } catch { /* Observer isolation. */ } } };
  const eventId = (event?: Event) => {
    if (!event) return null;
    let id = events.get(event);
    if (!id) events.set(event, id = ++nextEvent);
    return id;
  };
  const targetId = (root: Element | null) => {
    if (!root) return null;
    let id = targets.get(root);
    if (!id) targets.set(root, id = ++nextTarget);
    return id;
  };
  const append = (kind: string, root: HTMLElement | null, detail: unknown, event?: Event) => {
    if (!active || !session) return;
    // Copy at observation time. A later DOM/model mutation must not rewrite evidence.
    const copied = JSON.parse(JSON.stringify(detail, (_key, value: unknown) =>
      typeof value === "string" && value.length > 8192
        ? { truncated: true, length: value.length, prefix: value.slice(0, 8192) } : value));
    const entry: WebInteractionRecord = {
      sequence: session.records.length + 1, milliseconds: win.performance.now() - startTime,
      path: win.location.pathname, kind, eventId: eventId(event), targetId: targetId(root), detail: copied,
    };
    bytes += new TextEncoder().encode(JSON.stringify(entry)).length;
    if (bytes > (options.maxBytes ?? 4_000_000) || session.records.length >= (options.maxRecords ?? 10000)) {
      stop("limit");
      return;
    }
    (session.records as WebInteractionRecord[]).push(entry);
  };
  const sink: Sink = (root, kind, read, event) => append(kind, root, read(), event);
  const observeEvent = (event: Event) => {
    const rawTarget = event.type === "selectionchange" ? doc.activeElement : event.composedPath()[0] ?? event.target;
    const root = recordingTarget(rawTarget);
    if (!root) return;
    const current = session;
    append("event.capture", root, { ...recordingEventData(event), dom: recordingDOMSnapshot(root) }, event);
    win.queueMicrotask(() => {
      if (active && session === current) append("event.after-dispatch", root, {
        ...recordingEventData(event), dom: recordingDOMSnapshot(root),
      }, event);
    });
  };
  const observer = new win.MutationObserver((mutations) => {
    const roots = new Set<HTMLElement>();
    for (const mutation of mutations) {
      const root = recordingTarget(mutation.target);
      if (root && root.matches('input, textarea, [contenteditable]:not([contenteditable="false"])')) roots.add(root);
    }
    for (const root of roots) append("dom.mutation", root, recordingDOMSnapshot(root));
  });
  const onPageHide = () => stop("pagehide");
  function detach() {
    for (const type of RECORDING_EVENTS) win.removeEventListener(type, observeEvent, true);
    win.removeEventListener("pagehide", onPageHide);
    observer.disconnect();
    sinks.get(doc)?.delete(sink);
  }
  function stop(reason = "user"): WebInteractionRecording | null {
    if (!active || !session) return session;
    active = false;
    detach();
    session = { ...session, endedAt: new Date().toISOString(), reason };
    notify();
    return session;
  }
  return {
    get recording() { return active; },
    start() {
      if (active) return;
      bytes = 0; nextEvent = 0; nextTarget = 0;
      events = new WeakMap(); targets = new WeakMap();
      startTime = win.performance.now();
      session = {
        version: 1, id: win.crypto.randomUUID(), startedAt: new Date().toISOString(), endedAt: null, reason: null,
        environment: { userAgent: win.navigator.userAgent, language: win.navigator.language,
          platform: win.navigator.platform, timeOrigin: win.performance.timeOrigin,
          viewport: { width: win.innerWidth, height: win.innerHeight }, initialPath: win.location.pathname }, records: [],
      };
      active = true;
      let currentSinks = sinks.get(doc);
      if (!currentSinks) sinks.set(doc, currentSinks = new Set());
      currentSinks.add(sink);
      for (const type of RECORDING_EVENTS) win.addEventListener(type, observeEvent, true);
      win.addEventListener("pagehide", onPageHide);
      observer.observe(doc.documentElement, { subtree: true, childList: true, characterData: true });
      for (const root of Array.from(doc.querySelectorAll<HTMLElement>('input, textarea, [contenteditable]:not([contenteditable="false"])'))) {
        if (recordingTarget(root)) append("dom.initial", root, recordingDOMSnapshot(root));
      }
      for (const [root, readers] of sources.get(doc) ?? []) {
        if (root.isConnected && recordingTarget(root)) {
          for (const [name, read] of readers) {
            try { append(`${name}.initial`, root, read()); } catch { /* Faulty sources cannot block REC. */ }
          }
        }
      }
      notify();
    },
    stop,
    snapshot: () => session && { ...session, records: [...session.records] },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose() { stop("dispose"); listeners.clear(); },
  };
}

export function serializeWebInteractionRecording(recording: WebInteractionRecording): string {
  return JSON.stringify(recording, null, 2);
}
