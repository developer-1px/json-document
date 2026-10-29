import { expect, test } from "vitest";
import { createHistoryRuntime, restoreHistoryRuntime, forkHistoryRuntime } from "../src/history-index.js";

test("repeated undo/redo reuses accepted states and matches checkpoint replay", () => {
  let validations = 0;
  const options = { actorId: "a", epochId: "history-perf", ruleset: { id: "counter", digest: "1" },
    validate: () => { validations++; return { ok: true as const }; } };
  const runtime = createHistoryRuntime({ n: 0 }, options);
  for (let n = 1; n <= 20; n++) expect(runtime.document.commit([{ op: "replace", path: "/n", value: n }]).ok).toBe(true);
  expect(runtime.history.undo().ok).toBe(true);
  expect(runtime.history.redo().ok).toBe(true);
  validations = 0;
  for (let i = 0; i < 30; i++) {
    expect(runtime.history.canUndo().ok).toBe(true);
    expect(runtime.history.undo().ok).toBe(true);
    expect(runtime.document.value).toEqual({ n: 19 });
    expect(runtime.history.redo().ok).toBe(true);
    expect(runtime.document.value).toEqual({ n: 20 });
  }
  expect(validations).toBe(0);
  const restored = restoreHistoryRuntime(runtime.replica.exportCheckpoint(), options);
  expect(restored.ok).toBe(true);
  if (!restored.ok) throw Error(restored.reason);
  expect(restored.runtime.document.value).toEqual(runtime.document.value);
  expect(restored.runtime.replica.status().suppressed).toEqual(runtime.replica.status().suppressed);
  // A new data change invalidates the derived states and still validates.
  validations = 0;
  runtime.document.commit([{ op: "replace", path: "/n", value: 99 }]);
  expect(validations).toBeGreaterThan(0);
  expect(runtime.history.undo().ok).toBe(true);
  expect(runtime.document.value).toEqual({ n: 20 });
});

test("data appended after repeated history validates only new data and matches cold replay", () => {
  let validations = 0;
  const options = { actorId: "a", epochId: "append-perf", ruleset: { id: "counter", digest: "1" },
    validate: () => { validations++; return { ok: true as const }; } };
  const runtime = createHistoryRuntime({ n: 0 }, options);
  for (let n = 1; n <= 20; n++) runtime.document.commit([{ op: "replace", path: "/n", value: n }]);
  for (let i = 0; i < 20; i++) { runtime.history.undo(); runtime.history.redo(); }
  for (let n = 21; n <= 23; n++) {
    validations = 0;
    expect(runtime.document.commit([{ op: "replace", path: "/n", value: n }]).ok).toBe(true);
    expect(validations).toBeLessThan(10);
    const restored = restoreHistoryRuntime(runtime.replica.exportCheckpoint(), options);
    expect(restored.ok).toBe(true);
    if (!restored.ok) throw Error(restored.reason);
    expect(restored.runtime.document.value).toEqual(runtime.document.value);
    expect(restored.runtime.replica.status().suppressed).toEqual(runtime.replica.status().suppressed);
  }
  expect(runtime.history.undo().ok).toBe(true);
  expect(runtime.document.value).toEqual({ n: 22 });
});

test("long accepted histories do not revalidate old controls for a new edit", () => {
  let validations = 0;
  const options = { actorId: "human", epochId: "long-append", ruleset: { id: "counter", digest: "1" },
    validate: () => { validations++; return { ok: true as const }; } };
  const runtime = createHistoryRuntime({ n: 0 }, options);
  for (let n = 1; n <= 100; n++) {
    runtime.document.commit([{ op: "replace", path: "/n", value: n }]);
    if (n % 5 === 0) { runtime.history.undo(); runtime.history.redo(); }
  }
  validations = 0;
  expect(runtime.document.commit([{ op: "replace", path: "/n", value: 101 }]).ok).toBe(true);
  expect(validations).toBeLessThan(5);
  const restored = restoreHistoryRuntime(runtime.replica.exportCheckpoint(), options);
  expect(restored.ok).toBe(true);
  if (!restored.ok) throw Error(restored.reason);
  expect(restored.runtime.document.value).toEqual(runtime.document.value);
  expect(restored.runtime.replica.status()).toEqual(runtime.replica.status());
});


test("live forks preserve history while keeping documents and actor counters independent", () => {
  let validations = 0;
  const options = { actorId: "human", epochId: "fork-perf", ruleset: { id: "counter", digest: "1" },
    validate: () => { validations++; return { ok: true as const }; } };
  const runtime = createHistoryRuntime({ a: 0, b: 0 }, options);
  for (let a = 1; a <= 30; a++) runtime.document.commit([{ op: "replace", path: "/a", value: a }]);
  runtime.history.undo();
  validations = 0;
  const agent = forkHistoryRuntime(runtime, "agent");
  expect(validations).toBeLessThan(3);
  expect(agent.document.value).toEqual(runtime.document.value);
  expect(agent.history.canUndo().ok).toBe(false);
  expect(agent.document.commit([{ op: "replace", path: "/b", value: 1 }]).ok).toBe(true);
  expect(runtime.document.value).toEqual({ a: 29, b: 0 });
  expect(runtime.history.redo().ok).toBe(true);
  expect(agent.document.value).toEqual({ a: 29, b: 1 });
  expect(runtime.replica.ingest(agent.replica.exportBundle()).ok).toBe(true);
  expect(runtime.document.value).toEqual({ a: 30, b: 1 });
  const resumed = forkHistoryRuntime(runtime, "agent");
  expect(resumed.document.commit([{ op: "replace", path: "/b", value: 2 }]).ok).toBe(true);
  expect(resumed.replica.exportBundle().changes.filter(change => change.changeId.actorId === "agent").map(change => change.changeId.counter)).toEqual([1, 2]);
  expect(() => forkHistoryRuntime(runtime, "human")).toThrow("distinct actorId");
  const restored = restoreHistoryRuntime(resumed.replica.exportCheckpoint(), { ...options, actorId: "agent" });
  expect(restored.ok).toBe(true);
  if (!restored.ok) throw Error(restored.reason);
  expect(restored.runtime.document.value).toEqual(resumed.document.value);
  expect(restored.runtime.replica.status()).toEqual(resumed.replica.status());
});

test("old concurrent branches beyond retained prefixes converge through cold fallback", () => {
  const options = { actorId: "human", epochId: "old-branch", ruleset: { id: "counter", digest: "1" },
    validate: (value: unknown) => (value as { n: number }).n >= 0 ? { ok: true as const } : { ok: false as const, code: "negative" } };
  const runtime = createHistoryRuntime({ n: 0, other: 0 }, options);
  const agent = forkHistoryRuntime(runtime, "agent");
  agent.document.commit([{ op: "replace", path: "/other", value: 1 }]);
  for (let n = 1; n <= 20; n++) {
    runtime.document.commit([{ op: "replace", path: "/n", value: n }]);
    if (n % 3 === 0) { runtime.history.undo(); runtime.history.redo(); }
  }
  expect(runtime.replica.ingest(agent.replica.exportBundle()).ok).toBe(true);
  expect(runtime.document.value).toEqual({ n: 20, other: 1 });
  expect(runtime.history.undo().ok).toBe(true);
  const restored = restoreHistoryRuntime(runtime.replica.exportCheckpoint(), options);
  expect(restored.ok).toBe(true);
  if (!restored.ok) throw Error(restored.reason);
  expect(restored.runtime.document.value).toEqual(runtime.document.value);
  expect(restored.runtime.replica.status()).toEqual(runtime.replica.status());
});
