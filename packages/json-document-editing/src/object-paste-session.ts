import type { EditingResult } from "./session.js";
import type { ObjectClipboard, ObjectEditor, ObjectPastePlacement, ObjectSelection } from "./object.js";

export type ObjectPastePreparation =
  | { readonly ok: true; readonly clipboard: ObjectClipboard }
  | { readonly ok: false; readonly code: string; readonly reason?: string };

export interface ObjectPasteSession {
  readonly pending: boolean;
  enqueue(prepare: () => ObjectPastePreparation | Promise<ObjectPastePreparation>, cancelPreparation?: () => void): Promise<EditingResult<ObjectSelection>>;
  /** Cancels queued work and releases subscriptions. The session can be reused. */
  cancel(): void;
}

/** Ordered, atomic paste adoption. External document/selection changes invalidate pending work. */
export function createObjectPasteSession(editor: ObjectEditor, options: {
  readonly placement?: ObjectPastePlacement;
  readonly onResult?: (result: EditingResult<ObjectSelection>) => void;
  readonly onPendingChange?: (pending: boolean) => void;
} = {}): ObjectPasteSession {
  type Job = { result?: ObjectPastePreparation; resolve: (result: EditingResult<ObjectSelection>) => void; cancel?: () => void };
  let queue: Job[] = [];
  let release: (() => void) | undefined;
  let applying = false;
  let draining = false;
  let publishedPending = false;

  function publishPending(pending: boolean) {
    if (publishedPending === pending) return;
    publishedPending = pending;
    try { options.onPendingChange?.(pending); } catch { /* Observers cannot interrupt adoption or cleanup. */ }
  }
  function idle() {
    release?.(); release = undefined;
    publishPending(false);
  }
  function cancel() {
    const cancelled = queue;
    queue = [];
    if (cancelled.length === 0) return;
    idle();
    for (const job of cancelled) {
      job.resolve({ ok: false, code: "clipboard.cancelled" });
      try { job.cancel?.(); } catch { /* Other preparations must still be cancelled. */ }
    }
  }
  function drain() {
    if (draining) return;
    draining = true;
    try {
      while (queue[0]?.result) {
        const job = queue.shift()!;
        const prepared = job.result!;
        applying = true;
        let result: EditingResult<ObjectSelection>;
        try {
          result = prepared.ok ? editor.dispatch({ type: "clipboard.paste", clipboard: prepared.clipboard, ...(options.placement ? { placement: options.placement } : {}) }) : prepared;
        } catch (error) {
          result = { ok: false, code: "clipboard.invalid", reason: error instanceof Error ? error.message : String(error) };
        } finally { applying = false; }
        job.resolve(result);
        try { options.onResult?.(result); } catch { /* A completed edit cannot be rejected by an observer. */ }
        if (result.ok && (editor.snapshot.value !== result.snapshot.value || editor.snapshot.selection !== result.snapshot.selection)) cancel();
      }
    } finally {
      draining = false;
      if (queue.length === 0) idle();
    }
  }
  function ready(job: Job, result: ObjectPastePreparation) {
    if (!queue.includes(job)) return;
    job.result = result;
    drain();
  }
  return {
    get pending() { return queue.length > 0; },
    cancel,
    enqueue(prepare, cancelPreparation) {
      return new Promise((resolve) => {
        const job: Job = { resolve, ...(cancelPreparation ? { cancel: cancelPreparation } : {}) };
        if (!release) {
          let base = editor.snapshot;
          release = editor.subscribe((next) => {
            if (!applying && (base.value !== next.value || base.selection !== next.selection)) cancel();
            base = next;
          });
        }
        const wasIdle = queue.length === 0;
        queue.push(job);
        if (wasIdle) publishPending(true);
        if (!queue.includes(job)) return;
        try {
          const result = prepare();
          if ("ok" in result) ready(job, result);
          else void Promise.resolve(result).then((value) => ready(job, value), (error: unknown) => ready(job, { ok: false, code: "clipboard.invalid", reason: error instanceof Error ? error.message : String(error) }));
        } catch (error) { ready(job, { ok: false, code: "clipboard.invalid", reason: error instanceof Error ? error.message : String(error) }); }
      });
    },
  };
}
