import { createHash } from "node:crypto";

import { describe, expect, test, vi } from "vitest";

import {
  compactCollaborationCheckpoint,
  createCollaborationRuntime,
  restoreCollaborationRuntime,
  type CollaborationBundle,
  type CollaborationCheckpoint,
  type CollaborationMembership,
  type CollaborationRulesetIdentity,
  type CollaborationRuntime,
  type CollaborationRuntimeOptions,
} from "../../src/index.js";
import {
  createHistoryRuntime,
  restoreHistoryRuntime,
} from "../../src/history-index.js";

const ruleset: CollaborationRulesetIdentity = {
  id: "test/checkpoint-json-tree",
  digest: "test/checkpoint-json-tree/v1",
};

function membership(...actorIds: string[]): CollaborationMembership {
  return {
    version: 1,
    members: actorIds.map((actorId) => ({ actorId })),
  };
}

function options(
  actorId: string,
  epochId: string,
  members: CollaborationMembership | undefined,
  overrides: Partial<CollaborationRuntimeOptions> = {},
): CollaborationRuntimeOptions {
  return {
    actorId,
    epochId,
    ruleset,
    ...(members === undefined ? {} : { membership: members }),
    ...overrides,
  };
}

function restoredRuntime(
  result: ReturnType<typeof restoreCollaborationRuntime>,
): CollaborationRuntime {
  if (!result.ok) {
    throw new Error(`checkpoint restore failed: ${result.code}: ${result.reason}`);
  }
  return result.runtime;
}

function changeBundle(
  bundle: CollaborationBundle,
  actorId: string,
  counter: number,
): CollaborationBundle {
  const change = bundle.changes.find((candidate) => (
    candidate.changeId.actorId === actorId
    && candidate.changeId.counter === counter
  ));
  if (change === undefined) {
    throw new Error(`missing Change ${actorId}:${counter}`);
  }
  return {
    epoch: bundle.epoch,
    changes: [change],
  };
}

function checkpointWithIntegrity(
  payload: CollaborationCheckpoint["payload"],
): CollaborationCheckpoint {
  return {
    payload,
    integrity: {
      algorithm: "sha-256",
      digest: `sha256:${createHash("sha256")
        .update(canonicalJSON(payload), "utf8")
        .digest("hex")}`,
    },
  };
}

function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new TypeError("checkpoint payload must contain only JSON values");
    }
    return serialized;
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJSON).join(",")}]`;
  }
  return `{${Object.entries(value)
    .sort(([left], [right]) => (
      left < right ? -1 : left > right ? 1 : 0
    ))
    .map(([key, child]) => (
      `${JSON.stringify(key)}:${canonicalJSON(child)}`
    ))
    .join(",")}}`;
}

describe("@interactive-os/json-document-collaboration checkpoints", () => {
  test("round-trips the complete same-epoch causal state", () => {
    const members = membership("actor-a", "actor-b");
    const source = createCollaborationRuntime(
      { title: "Draft", done: false },
      options("actor-a", "checkpoint-roundtrip/v1", members),
    );
    const remote = createCollaborationRuntime(
      { title: "Draft", done: false },
      options("actor-b", "checkpoint-roundtrip/v1", members),
    );

    expect(source.document.commit([{
      op: "replace",
      path: "/title",
      value: "Local",
    }])).toMatchObject({ ok: true });
    expect(remote.document.commit([{
      op: "replace",
      path: "/done",
      value: true,
    }])).toMatchObject({ ok: true });
    expect(source.replica.ingest(remote.replica.exportBundle()))
      .toMatchObject({ ok: true });

    const checkpoint = source.replica.exportCheckpoint();
    const restored = restoredRuntime(restoreCollaborationRuntime(checkpoint, {
      actorId: "actor-a",
      ruleset,
    }));

    expect(restored.document.value).toEqual(source.document.value);
    expect(restored.replica.status()).toEqual(
      source.replica.status(),
    );
    expect(restored.replica.exportBundle()).toEqual(
      source.replica.exportBundle(),
    );

    expect(restored.document.commit([{
      op: "replace",
      path: "/title",
      value: "Restored",
    }])).toMatchObject({ ok: true });
    expect(
      restored.replica.exportBundle().changes.at(-1)?.changeId,
    ).toEqual({
      actorId: "actor-a",
      counter: 2,
    });
  });

  test("restores pending causal input and later releases it identically", () => {
    const members = membership("actor-a", "receiver");
    const initial = { title: "Draft" };
    const author = createCollaborationRuntime(
      initial,
      options("actor-a", "checkpoint-pending/v1", members),
    );
    expect(author.document.commit([{
      op: "replace",
      path: "/title",
      value: "First",
    }])).toMatchObject({ ok: true });
    expect(author.document.commit([{
      op: "replace",
      path: "/title",
      value: "Second",
    }])).toMatchObject({ ok: true });

    const complete = author.replica.exportBundle();
    const first = changeBundle(complete, "actor-a", 1);
    const second = changeBundle(complete, "actor-a", 2);
    const receiver = createCollaborationRuntime(
      initial,
      options("receiver", "checkpoint-pending/v1", members),
    );
    expect(receiver.replica.ingest(second)).toMatchObject({
      ok: true,
      pending: [{ actorId: "actor-a", counter: 2 }],
    });

    const restored = restoredRuntime(restoreCollaborationRuntime(
      receiver.replica.exportCheckpoint(),
      { actorId: "receiver", ruleset },
    ));
    expect(restored.replica.status().pending).toEqual([
      {
        changeId: { actorId: "actor-a", counter: 2 },
        missing: [{ actorId: "actor-a", counter: 1 }],
      },
    ]);

    expect(restored.replica.ingest(first)).toMatchObject({
      ok: true,
      pending: [],
    });
    const reference = createCollaborationRuntime(
      initial,
      options("receiver", "checkpoint-pending/v1", members),
    );
    expect(reference.replica.ingest(complete)).toMatchObject({ ok: true });
    expect(restored.document.value).toEqual(reference.document.value);
    expect(restored.replica.status()).toEqual(
      reference.replica.status(),
    );
    expect(restored.replica.exportBundle()).toEqual(
      reference.replica.exportBundle(),
    );
  });

  test("preserves concurrent conflicts and authored history controls", () => {
    const members = membership("actor-a", "actor-b");
    const initial = {
      title: "Draft",
      flag: false,
    };
    const left = createHistoryRuntime(
      initial,
      options("actor-a", "checkpoint-history/v1", members),
    );
    const right = createCollaborationRuntime(
      initial,
      options("actor-b", "checkpoint-history/v1", members),
    );

    expect(left.document.commit([{
      op: "replace",
      path: "/title",
      value: "Left",
    }])).toMatchObject({ ok: true });
    expect(right.document.commit([{
      op: "replace",
      path: "/title",
      value: "Right",
    }])).toMatchObject({ ok: true });
    expect(left.replica.ingest(right.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(left.document.commit([{
      op: "replace",
      path: "/flag",
      value: true,
    }])).toMatchObject({ ok: true });
    expect(left.history.undo()).toMatchObject({
      ok: true,
      target: { actorId: "actor-a", counter: 2 },
    });
    expect(left.replica.status().conflicts).not.toEqual([]);
    expect(left.history.status().redoTarget).toEqual({
      actorId: "actor-a",
      counter: 2,
    });

    const restored = restoredRuntime(restoreCollaborationRuntime(
      left.replica.exportCheckpoint(),
      { actorId: "actor-a", ruleset },
    ));

    expect(restored.document.value).toEqual(left.document.value);
    expect(restored.replica.status()).toEqual(
      left.replica.status(),
    );
    expect(restored.replica.exportBundle()).toEqual(
      left.replica.exportBundle(),
    );
    expect(
      restored.replica.exportBundle().changes.some((change) => (
        change.ops.some((operation) => operation.kind === "undo-change")
      )),
    ).toBe(true);

    const restoredHistory = restoreHistoryRuntime(
      left.replica.exportCheckpoint(),
      { actorId: "actor-a", ruleset },
    );
    if (!restoredHistory.ok) {
      throw new Error(
        `history restore failed: ${restoredHistory.code}: ${restoredHistory.reason}`,
      );
    }
    expect(restoredHistory.runtime.history.status().redoTarget).toEqual({
      actorId: "actor-a",
      counter: 2,
    });
    const beforeRedo = restoredHistory.runtime.document.value as {
      readonly title: unknown;
      readonly flag: unknown;
    };
    expect(restoredHistory.runtime.history.redo()).toMatchObject({
      ok: true,
      target: { actorId: "actor-a", counter: 2 },
    });
    expect(restoredHistory.runtime.document.value).toEqual({
      title: beforeRedo.title,
      flag: true,
    });
  });

  test("re-derives the same suppressed changes when restoring", () => {
    const members = membership("author", "receiver");
    const initial = { value: 0 };
    const author = createCollaborationRuntime(
      initial,
      options("author", "checkpoint-suppressed/v1", members),
    );
    expect(author.document.commit([{
      op: "replace",
      path: "/value",
      value: 2,
    }])).toMatchObject({ ok: true });

    const validate: CollaborationRuntimeOptions["validate"] = (candidate) => {
      const object = candidate as { readonly value?: unknown };
      return typeof object.value === "number" && object.value <= 1
        ? { ok: true }
        : {
            ok: false,
            code: "maximum_exceeded",
            reason: "value must be at most one",
            pointer: "/value",
          };
    };
    const receiver = createCollaborationRuntime(
      initial,
      options("receiver", "checkpoint-suppressed/v1", members, { validate }),
    );
    const untrusted = author.replica.exportBundle();
    expect(receiver.replica.ingest({
      epoch: receiver.replica.epoch,
      changes: untrusted.changes,
    }))
      .toMatchObject({ ok: true });
    expect(receiver.document.value).toEqual(initial);
    expect(receiver.replica.status().suppressed).toEqual([{
      changeId: { actorId: "author", counter: 1 },
      code: "maximum_exceeded",
      reason: "value must be at most one",
      pointer: "/value",
    }]);

    const checkpoint = receiver.replica.exportCheckpoint();
    expect(restoreCollaborationRuntime(checkpoint, {
      actorId: "receiver",
      ruleset,
    })).toMatchObject({
      ok: false,
      code: "acceptance_required",
    });
    expect(compactCollaborationCheckpoint(checkpoint, {
      mode: "new-epoch",
      nextEpochId: "checkpoint-suppressed/missing-validation/v3",
      nextRuleset: ruleset,
    })).toMatchObject({
      ok: false,
      code: "acceptance_required",
    });

    const restored = restoredRuntime(restoreCollaborationRuntime(
      checkpoint,
      { actorId: "receiver", ruleset, validate },
    ));
    expect(restored.document.value).toEqual(receiver.document.value);
    expect(restored.replica.status()).toEqual(
      receiver.replica.status(),
    );
    expect(restored.replica.exportBundle()).toEqual(
      receiver.replica.exportBundle(),
    );
  });

  test("rejects an unknown member transactionally", () => {
    const members = membership("allowed", "receiver");
    const receiver = createCollaborationRuntime(
      { value: 0 },
      options("receiver", "checkpoint-membership/v1", members),
    );
    const beforeValue = receiver.document.value;
    const beforeSnapshot = receiver.replica.status();
    const listener = vi.fn();
    receiver.replica.subscribe(listener);

    const result = receiver.replica.ingest({
      epoch: receiver.replica.epoch,
      changes: [
        {
          changeId: { actorId: "allowed", counter: 1 },
          deps: [],
          ops: [],
        },
        {
          changeId: { actorId: "intruder", counter: 1 },
          deps: [],
          ops: [],
        },
      ],
    });

    expect(result).toMatchObject({ ok: false });
    expect(receiver.document.value).toBe(beforeValue);
    expect(receiver.replica.status()).toEqual(beforeSnapshot);
    expect(receiver.replica.exportBundle().changes).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
  });

  test.each([
    {
      name: "dependency",
      deps: [{ actorId: "intruder", counter: 1 }],
      ops: [],
    },
    {
      name: "history target",
      deps: [],
      ops: [{
        kind: "undo-change" as const,
        target: { actorId: "intruder", counter: 1 },
      }],
    },
  ])("rejects an unknown member referenced by a $name transactionally", ({
    deps,
    ops,
  }) => {
    const members = membership("allowed", "receiver");
    const receiver = createCollaborationRuntime(
      { value: 0 },
      options("receiver", "checkpoint-member-reference/v1", members),
    );
    const before = receiver.replica.status();

    expect(receiver.replica.ingest({
      epoch: receiver.replica.epoch,
      changes: [{
        changeId: { actorId: "allowed", counter: 1 },
        deps,
        ops,
      }],
    })).toMatchObject({
      ok: false,
      code: "membership_violation",
      changeId: { actorId: "allowed", counter: 1 },
    });
    expect(receiver.document.value).toEqual({ value: 0 });
    expect(receiver.replica.status()).toEqual(before);
    expect(receiver.replica.exportBundle().changes).toEqual([]);
  });

  test("refuses to compact a checkpoint with pending causal history", () => {
    const members = membership("author", "receiver");
    const initial = { title: "Draft" };
    const author = createCollaborationRuntime(
      initial,
      options("author", "checkpoint-pending-compaction/v1", members),
    );
    expect(author.document.commit([{
      op: "replace",
      path: "/title",
      value: "First",
    }])).toMatchObject({ ok: true });
    expect(author.document.commit([{
      op: "replace",
      path: "/title",
      value: "Second",
    }])).toMatchObject({ ok: true });
    const complete = author.replica.exportBundle();
    const receiver = createCollaborationRuntime(
      initial,
      options("receiver", "checkpoint-pending-compaction/v1", members),
    );
    expect(receiver.replica.ingest(
      changeBundle(complete, "author", 2),
    )).toMatchObject({ ok: true });

    expect(compactCollaborationCheckpoint(
      receiver.replica.exportCheckpoint(),
      {
        mode: "new-epoch",
        nextEpochId: "checkpoint-pending-compaction/v3",
        nextRuleset: ruleset,
      },
    )).toMatchObject({
      ok: false,
      code: "pending_changes",
    });
  });

  test("does not launder a non-member Change through compaction", () => {
    const members = membership("allowed");
    const initial = { value: 0 };
    const allowed = createCollaborationRuntime(
      initial,
      options("allowed", "checkpoint-member-laundering/v1", members),
    );
    const intruder = createCollaborationRuntime(
      initial,
      options("intruder", "checkpoint-member-laundering/v1", undefined),
    );
    expect(intruder.document.commit([{
      op: "replace",
      path: "/value",
      value: 1,
    }])).toMatchObject({ ok: true });

    const original = allowed.replica.exportCheckpoint();
    const forged = checkpointWithIntegrity({
      ...original.payload,
      changes: intruder.replica.exportBundle().changes,
    });
    expect(compactCollaborationCheckpoint(forged, {
      mode: "new-epoch",
      nextEpochId: "checkpoint-member-laundering/v3",
      nextRuleset: ruleset,
    })).toMatchObject({
      ok: false,
      code: "membership_violation",
    });
  });

  test.each([
    {
      name: "dependency",
      deps: [{ actorId: "intruder", counter: 1 }],
      ops: [],
    },
    {
      name: "undo target",
      deps: [],
      ops: [{
        kind: "undo-change" as const,
        target: { actorId: "intruder", counter: 1 },
      }],
    },
    {
      name: "redo target",
      deps: [],
      ops: [{
        kind: "redo-change" as const,
        undo: { actorId: "intruder", counter: 1 },
      }],
    },
  ])("does not compact a non-member $name reference", ({
    name,
    deps,
    ops,
  }) => {
    const source = createCollaborationRuntime(
      { value: 0 },
      options(
        "allowed",
        "checkpoint-member-reference-compaction/v1",
        membership("allowed"),
      ),
    );
    const original = source.replica.exportCheckpoint();
    const forged = checkpointWithIntegrity({
      ...original.payload,
      changes: [{
        changeId: { actorId: "allowed", counter: 1 },
        deps,
        ops,
      }],
    });

    expect(compactCollaborationCheckpoint(forged, {
      mode: "new-epoch",
      nextEpochId: `checkpoint-member-reference-compaction/v3/${name}`,
      nextRuleset: ruleset,
    })).toMatchObject({
      ok: false,
      code: "membership_violation",
    });
  });

  test("rejects conflicting duplicate Change ids before compaction", () => {
    const source = createCollaborationRuntime(
      { value: 0 },
      options("actor-a", "checkpoint-duplicate/v1", undefined),
    );
    expect(source.document.commit([{
      op: "replace",
      path: "/value",
      value: 1,
    }])).toMatchObject({ ok: true });
    const original = source.replica.exportCheckpoint();
    const change = original.payload.changes[0];
    if (change === undefined) throw new Error("missing authored Change");
    const forged = checkpointWithIntegrity({
      ...original.payload,
      changes: [
        change,
        {
          ...change,
          ops: [],
        },
      ],
    });

    expect(compactCollaborationCheckpoint(forged, {
      mode: "new-epoch",
      nextEpochId: "checkpoint-duplicate/v3",
      nextRuleset: ruleset,
    })).toMatchObject({ ok: false });
  });

  test("rejects a checksum-valid checkpoint with non-canonical Change order", () => {
    const source = createCollaborationRuntime(
      { value: 0 },
      options("actor-a", "checkpoint-change-order/v1", undefined),
    );
    expect(source.document.commit([{
      op: "replace",
      path: "/value",
      value: 1,
    }])).toMatchObject({ ok: true });
    expect(source.document.commit([{
      op: "replace",
      path: "/value",
      value: 2,
    }])).toMatchObject({ ok: true });
    const original = source.replica.exportCheckpoint();
    const reordered = checkpointWithIntegrity({
      ...original.payload,
      changes: [...original.payload.changes].reverse(),
    });

    expect(restoreCollaborationRuntime(reordered, {
      actorId: "actor-a",
      ruleset,
    })).toMatchObject({
      ok: false,
      code: "invalid_checkpoint",
    });
    expect(compactCollaborationCheckpoint(reordered, {
      mode: "new-epoch",
      nextEpochId: "checkpoint-change-order/v3",
      nextRuleset: ruleset,
    })).toMatchObject({
      ok: false,
      code: "invalid_checkpoint",
    });
  });

  test("rejects a checksum-valid checkpoint with a duplicate Change id", () => {
    const source = createCollaborationRuntime(
      { value: 0 },
      options("actor-a", "checkpoint-change-duplicate/v1", undefined),
    );
    expect(source.document.commit([{
      op: "replace",
      path: "/value",
      value: 1,
    }])).toMatchObject({ ok: true });
    const original = source.replica.exportCheckpoint();
    const change = original.payload.changes[0];
    if (change === undefined) throw new Error("missing authored Change");
    const duplicated = checkpointWithIntegrity({
      ...original.payload,
      changes: [change, change],
    });

    expect(restoreCollaborationRuntime(duplicated, {
      actorId: "actor-a",
      ruleset,
    })).toMatchObject({
      ok: false,
      code: "invalid_checkpoint",
    });
    expect(compactCollaborationCheckpoint(duplicated, {
      mode: "new-epoch",
      nextEpochId: "checkpoint-change-duplicate/v3",
      nextRuleset: ruleset,
    })).toMatchObject({
      ok: false,
      code: "invalid_checkpoint",
    });
  });

  test("compacts only into a new epoch and rejects old-epoch bundles", () => {
    const members = membership("actor-a");
    const source = createCollaborationRuntime(
      { title: "Draft" },
      options("actor-a", "checkpoint-compaction/v1", members),
    );
    expect(source.document.commit([{
      op: "replace",
      path: "/title",
      value: "Compacted",
    }])).toMatchObject({ ok: true });
    const oldBundle = source.replica.exportBundle();
    const compacted = compactCollaborationCheckpoint(
      source.replica.exportCheckpoint(),
      {
        mode: "new-epoch",
        nextEpochId: "checkpoint-compaction/v3",
        nextRuleset: ruleset,
      },
    );
    if (!compacted.ok) {
      throw new Error(`checkpoint compaction failed: ${compacted.code}: ${compacted.reason}`);
    }

    const restored = restoredRuntime(restoreCollaborationRuntime(
      compacted.checkpoint,
      { actorId: "actor-a", ruleset },
    ));
    expect(restored.document.value).toEqual(source.document.value);
    expect(restored.replica.epoch.epochId).toBe(
      "checkpoint-compaction/v3",
    );
    expect(restored.replica.exportBundle().changes).toEqual([]);

    const before = restored.replica.status();
    expect(restored.replica.ingest(oldBundle)).toMatchObject({
      ok: false,
      code: "epoch_mismatch",
    });
    expect(restored.document.value).toEqual(source.document.value);
    expect(restored.replica.status()).toEqual(before);
    expect(restored.replica.exportBundle().changes).toEqual([]);
  });
});
