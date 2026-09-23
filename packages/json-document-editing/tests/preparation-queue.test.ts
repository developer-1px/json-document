import { expect, test, vi } from "vitest";
import { createEditingPreparationQueue, type EditingPreparation } from "../src/index.js";

function deferred<Value>() {
  let resolve!: (value: EditingPreparation<Value>) => void;
  const promise = new Promise<EditingPreparation<Value>>((done) => { resolve = done; });
  return { promise, resolve };
}

test("PI-ORDER: preparation order is independent of completion; each value applies once", async () => {
  const applied: string[] = [];
  const onPendingChange = vi.fn();
  const queue = createEditingPreparationQueue({ apply: (value: string) => { applied.push(value); return { ok: true as const }; }, onPendingChange });
  const first = deferred<string>(), second = deferred<string>();
  const a = queue.enqueue(() => first.promise), b = queue.enqueue(() => second.promise);
  second.resolve({ ok: true, value: "B" }); await Promise.resolve();
  expect(applied).toEqual([]);
  first.resolve({ ok: true, value: "A" }); await Promise.all([a, b]);
  expect(applied).toEqual(["A", "B"]); expect(queue.isPending).toBe(false);
  expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
});

test("PI-CANCEL: cancellation settles every job, aborts preparation, and ignores late results", async () => {
  const apply = vi.fn((value: string) => ({ ok: true as const, value })), onResult = vi.fn();
  const queue = createEditingPreparationQueue({ apply, onResult });
  const waiting = deferred<string>(), abort = vi.fn();
  const a = queue.enqueue(() => waiting.promise, abort), b = queue.enqueue(() => ({ ok: true, value: "B" }));
  queue.cancel();
  expect(await a).toMatchObject({ ok: false, code: "editing.preparation-cancelled" });
  expect(await b).toMatchObject({ ok: false });
  waiting.resolve({ ok: true, value: "late" }); await Promise.resolve();
  expect(apply).not.toHaveBeenCalled(); expect(onResult).not.toHaveBeenCalled(); expect(abort).toHaveBeenCalledOnce();
  await queue.enqueue(() => ({ ok: true, value: "fresh" })); expect(apply).toHaveBeenCalledWith("fresh");
});

test("failed preparation and reentrant observers cannot poison later edits", async () => {
  const values: string[] = [];
  const queue = createEditingPreparationQueue({
    apply(value: string) { values.push(value); return { ok: true as const }; },
    onResult() { if (values.length === 1) void queue.enqueue(() => ({ ok: true, value: "nested" })); throw new Error("observer"); },
  });
  expect(await queue.enqueue(() => Promise.reject(new Error("read")))).toMatchObject({ ok: false, reason: "read" });
  await queue.enqueue(() => ({ ok: true, value: "first" })); expect(values).toEqual(["first", "nested"]);
});

test("pending observer cancellation prevents preparation and leaves a reusable queue", async () => {
  const prepare = vi.fn(() => ({ ok: true as const, value: "never" }));
  let shouldCancel = true;
  const queue = createEditingPreparationQueue({
    apply: (value: string) => ({ ok: true as const, value }),
    onPendingChange(pending) { if (pending && shouldCancel) queue.cancel(); },
  });
  expect((await queue.enqueue(prepare)).ok).toBe(false); expect(prepare).not.toHaveBeenCalled();
  shouldCancel = false;
  expect((await queue.enqueue(prepare)).ok).toBe(true);
});
