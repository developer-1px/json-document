import { describe, expect, test } from "vitest";
import { createCollaborationRuntime, restoreCollaborationRuntime, type CollaborationBundle } from "../../src/index.js";

const options = { epochId: "long-history/v1", ruleset: { id: "long-history", digest: "v1" } };

describe("editing after remote history", () => {
  test("a new actor can commit after a long causal chain and restore the same state", () => {
    const author = createCollaborationRuntime({ value: 0 }, { ...options, actorId: "author" });
    author.document.commit([{ op: "replace", path: "/value", value: 1 }]);
    const first = author.replica.exportBundle().changes[0]!;
    const operation = first.ops[0]!;
    if (operation.kind !== "set") throw new Error("expected scalar set");
    const bundle: CollaborationBundle = {
      epoch: author.replica.epoch,
      changes: Array.from({ length: 6000 }, (_, index) => ({
        changeId: { actorId: "author", counter: index + 1 },
        deps: index === 0 ? [] : [{ actorId: "author", counter: index }],
        ops: [{ ...operation, value: (index + 1) % 2 }],
      })),
    };
    const receiver = createCollaborationRuntime({ value: 0 }, { ...options, actorId: "receiver" });
    expect(receiver.replica.ingest(bundle).ok).toBe(true);
    for (const value of [2, 3]) {
      expect(receiver.document.commit([{ op: "replace", path: "/value", value }]).ok).toBe(true);
    }
    expect(receiver.document.value).toEqual({ value: 3 });
    const restored = restoreCollaborationRuntime(receiver.replica.exportCheckpoint(), { actorId: "receiver", ruleset: options.ruleset });
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.runtime.document.value).toEqual(receiver.document.value);
    expect(restored.runtime.replica.status()).toEqual(receiver.replica.status());
    expect(restored.runtime.document.commit([{ op: "replace", path: "/value", value: 4 }]).ok).toBe(true);
    expect(receiver.replica.ingest(restored.runtime.replica.exportBundle()).ok).toBe(true);
    expect(receiver.document.value).toEqual({ value: 4 });
  }, 30_000);
});
