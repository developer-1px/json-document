export type EditingPreparationFailure = { readonly ok: false; readonly code: string; readonly reason?: string };
export type EditingPreparation<Value> = { readonly ok: true; readonly value: Value } | EditingPreparationFailure;

export interface EditingPreparationQueue<Value, Result> {
  readonly isPending: boolean;
  enqueue(prepare: () => EditingPreparation<Value> | Promise<EditingPreparation<Value>>, cancelPreparation?: () => void): Promise<Result | EditingPreparationFailure>;
  cancel(): void;
}

/** Orders asynchronous preparation before synchronous edits. Targets and invalidation policy belong to the consumer. */
export function createEditingPreparationQueue<Value, Result extends { readonly ok: boolean }>(options: {
  readonly apply: (value: Value) => Result;
  readonly onResult?: (result: Result | EditingPreparationFailure) => void;
  readonly onPendingChange?: (pending: boolean) => void;
  readonly cancelCode?: string;
  readonly errorCode?: string;
}): EditingPreparationQueue<Value, Result> {
  type Job = { prepared?: EditingPreparation<Value>; resolve: (result: Result | EditingPreparationFailure) => void; cancel?: () => void };
  let queue: Job[] = [];
  let draining = false;
  let publishedPending = false;

  function publishPending(pending: boolean) {
    if (publishedPending === pending) return;
    publishedPending = pending;
    try { options.onPendingChange?.(pending); } catch { /* Observers do not own queue progress. */ }
  }
  function failure(error: unknown): EditingPreparationFailure {
    return { ok: false, code: options.errorCode ?? "editing.preparation-failed", reason: error instanceof Error ? error.message : String(error) };
  }
  function cancel() {
    const cancelled = queue;
    queue = [];
    publishPending(false);
    for (const job of cancelled) {
      job.resolve({ ok: false, code: options.cancelCode ?? "editing.preparation-cancelled" });
      try { job.cancel?.(); } catch { /* Every cancelled job must settle. */ }
    }
  }
  function drain() {
    if (draining) return;
    draining = true;
    try {
      while (queue[0]?.prepared) {
        const job = queue.shift()!;
        const prepared = job.prepared!;
        let result: Result | EditingPreparationFailure;
        try { result = prepared.ok ? options.apply(prepared.value) : prepared; }
        catch (error) { result = failure(error); }
        job.resolve(result);
        try { options.onResult?.(result); } catch { /* A committed edit remains committed. */ }
      }
    } finally {
      draining = false;
      if (queue.length === 0) publishPending(false);
    }
  }
  function ready(job: Job, prepared: EditingPreparation<Value>) {
    if (!queue.includes(job)) return;
    job.prepared = prepared;
    drain();
  }
  return {
    get isPending() { return queue.length > 0 || draining; },
    cancel,
    enqueue(prepare, cancelPreparation) {
      return new Promise((resolve) => {
        const job: Job = { resolve, ...(cancelPreparation ? { cancel: cancelPreparation } : {}) };
        queue.push(job);
        publishPending(true);
        if (!queue.includes(job)) return;
        try {
          const result = prepare();
          if ("ok" in result) ready(job, result);
          else void Promise.resolve(result).then((value) => ready(job, value), (error: unknown) => ready(job, failure(error)));
        } catch (error) { ready(job, failure(error)); }
      });
    },
  };
}
