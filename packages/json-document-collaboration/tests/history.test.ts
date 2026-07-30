import { describe, expect, test, vi } from "vitest";

import {
  createCollaborationRuntime,
  type CollaborationBundle,
  type CollaborationRuntimeOptions,
} from "../src/index.js";
import { createHistoryRuntime } from "../src/history-index.js";

const baseOptions = {
  epochId: "shared-history-document/v1",
  ruleset: {
    id: "test/json-tree-history",
    digest: "test/json-tree-history/v1",
  },
} as const;

function runtime(
  actorId: string,
  initial: unknown = {
    title: "Draft",
    done: false,
  },
  overrides: Partial<CollaborationRuntimeOptions> = {},
) {
  return createHistoryRuntime(initial, {
    ...baseOptions,
    actorId,
    ...overrides,
  });
}

function oneChangeBundle(
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

describe("@interactive-os/json-document-collaboration/history", () => {
  test("adds history outside the canonical JSON Document", () => {
    const shared = runtime("actor-a");

    expect(Object.keys(shared).sort()).toEqual([
      "collaboration",
      "document",
      "history",
      "replica",
    ]);
    expect(Object.keys(shared.document).sort()).toEqual([
      "at",
      "canPatch",
      "commit",
      "query",
      "subscribe",
      "validatePatch",
      "value",
    ]);
  });

  test("withdraws and reinstates only the local write behind a remote winner", () => {
    const left = runtime("actor-a");
    const right = runtime("actor-b");

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
    expect(left.document.value).toMatchObject({ title: "Right" });
    expect(left.history.status().undoTarget).toEqual({
      actorId: "actor-a",
      counter: 1,
    });

    const documentListener = vi.fn();
    const collaborationListener = vi.fn();
    left.document.subscribe(documentListener);
    left.replica.subscribe(collaborationListener);

    expect(left.history.canUndo()).toMatchObject({ ok: true });
    expect(left.history.undo()).toMatchObject({ ok: true });
    expect(left.document.value).toMatchObject({ title: "Right" });
    expect(left.history.status().redoTarget).toEqual({
      actorId: "actor-a",
      counter: 1,
    });
    expect(left.replica.exportBundle().changes).toHaveLength(3);
    expect(documentListener).not.toHaveBeenCalled();
    expect(collaborationListener).toHaveBeenCalledTimes(1);

    expect(left.history.canRedo()).toMatchObject({ ok: true });
    expect(left.history.redo()).toMatchObject({ ok: true });
    expect(left.document.value).toMatchObject({ title: "Right" });
    expect(left.replica.exportBundle().changes).toHaveLength(4);
    expect(documentListener).not.toHaveBeenCalled();
    expect(collaborationListener).toHaveBeenCalledTimes(2);

    expect(right.replica.ingest(left.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(right.document.value).toEqual(left.document.value);
  });

  test("rejects undo when a remote descendant edits an inserted identity", () => {
    const left = runtime("actor-a", { cards: {} });
    const right = runtime("actor-b", { cards: {} });

    expect(left.document.commit([{
      op: "add",
      path: "/cards/draft",
      value: { title: "Draft" },
    }])).toMatchObject({ ok: true });
    expect(right.replica.ingest(left.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(right.document.commit([{
      op: "replace",
      path: "/cards/draft/title",
      value: "Reviewed",
    }])).toMatchObject({ ok: true });
    expect(left.replica.ingest(right.replica.exportBundle()))
      .toMatchObject({ ok: true });

    const before = left.replica.exportBundle();
    expect(left.history.status().undoTarget).toEqual({
      actorId: "actor-a",
      counter: 1,
    });
    expect(left.history.canUndo()).toMatchObject({ ok: false });
    expect(left.history.undo()).toMatchObject({ ok: false });

    expect(left.replica.exportBundle()).toEqual(before);
    expect(left.history.status()).toMatchObject({
      undoTarget: { actorId: "actor-a", counter: 1 },
    });
    expect(left.history.status().redoTarget).toBeNull();
    expect(left.document.value).toEqual({
      cards: {
        draft: {
          title: "Reviewed",
        },
      },
    });
  });

  test("re-evaluates a schema-suppressed remote Change after undo", () => {
    const validate = (candidate: unknown) => {
      const value = candidate as {
        readonly local: boolean;
        readonly remote: boolean;
      };
      return value.local && value.remote
        ? {
            ok: false as const,
            code: "schema_violation",
            reason: "local and remote are mutually exclusive",
          }
        : { ok: true as const };
    };
    const overrides = {
      ruleset: {
        id: "test/exclusive-history-flags",
        digest: "test/exclusive-history-flags/v1",
      },
      validate,
    };
    const left = runtime(
      "actor-a",
      { local: false, remote: false },
      overrides,
    );
    const right = runtime(
      "actor-b",
      { local: false, remote: false },
      overrides,
    );

    expect(left.document.commit([{
      op: "replace",
      path: "/local",
      value: true,
    }])).toMatchObject({ ok: true });
    expect(right.document.commit([{
      op: "replace",
      path: "/remote",
      value: true,
    }])).toMatchObject({ ok: true });
    expect(left.replica.ingest(right.replica.exportBundle()))
      .toMatchObject({ ok: true });

    expect(left.document.value).toEqual({
      local: true,
      remote: false,
    });
    expect(left.replica.status().suppressed).toMatchObject([{
      changeId: { actorId: "actor-b", counter: 1 },
      code: "schema_violation",
    }]);

    expect(left.history.undo()).toMatchObject({ ok: true });
    expect(left.document.value).toEqual({
      local: false,
      remote: true,
    });
    expect(left.replica.status().suppressed).toEqual([]);

    expect(right.replica.ingest(left.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(right.document.value).toEqual(left.document.value);
    expect(right.replica.status()).toEqual(
      left.replica.status(),
    );
  });

  test("keeps an acknowledged undo-redo pair neutral when a concurrent edit arrives late", () => {
    const author = runtime("actor-a", { value: 0 });
    const remote = runtime("actor-b", { value: 0 });

    expect(author.document.commit([{
      op: "remove",
      path: "/value",
    }])).toMatchObject({ ok: true });
    expect(remote.document.commit([{
      op: "replace",
      path: "/value",
      value: 1,
    }])).toMatchObject({ ok: true });

    expect(author.history.undo()).toMatchObject({ ok: true });
    expect(author.history.redo()).toMatchObject({ ok: true });
    expect(author.document.value).toEqual({});

    expect(author.replica.ingest(remote.replica.exportBundle()))
      .toMatchObject({ ok: true });

    expect(author.document.value).toEqual({});
    expect(author.replica.status().suppressed).toMatchObject([{
      changeId: { actorId: "actor-b", counter: 1 },
      code: "target_not_found",
    }]);
    expect(author.history.status()).toEqual({
      undoTarget: { actorId: "actor-a", counter: 1 },
      redoTarget: null,
      undoDepth: 1,
      redoDepth: 0,
      revision: 4,
    });
  });

  test("does not reinterpret a late array anchor after its observed move is undone", () => {
    const author = runtime("actor-a", {
      items: ["A", "B", "C", "D"],
    });
    const remote = runtime("actor-b", {
      items: ["A", "B", "C", "D"],
    });

    expect(author.document.commit([{
      op: "move",
      from: "/items/1",
      path: "/items/3",
    }])).toMatchObject({ ok: true });
    expect(author.document.value).toEqual({
      items: ["A", "C", "D", "B"],
    });
    expect(remote.replica.ingest(author.replica.exportBundle()))
      .toMatchObject({ ok: true });

    expect(author.history.undo()).toMatchObject({ ok: true });
    expect(author.document.value).toEqual({
      items: ["A", "B", "C", "D"],
    });

    expect(remote.document.commit([{
      op: "add",
      path: "/items/3",
      value: "X",
    }])).toMatchObject({ ok: true });
    expect(remote.document.value).toEqual({
      items: ["A", "C", "D", "X", "B"],
    });

    expect(author.replica.ingest(remote.replica.exportBundle()))
      .toMatchObject({ ok: true });

    expect(author.document.value).toEqual({
      items: ["A", "B", "C", "D", "X"],
    });
    expect(author.replica.status().suppressed).toEqual([]);

    expect(remote.replica.ingest(author.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(remote.document.value).toEqual(author.document.value);
    expect(remote.replica.status()).toEqual(
      author.replica.status(),
    );
  });

  test("converges when an undo Change arrives before its causal dependencies", () => {
    const author = runtime("actor-a");
    const remote = runtime("actor-b");

    expect(author.document.commit([{
      op: "replace",
      path: "/title",
      value: "Local",
    }])).toMatchObject({ ok: true });
    expect(remote.document.commit([{
      op: "replace",
      path: "/done",
      value: true,
    }])).toMatchObject({ ok: true });
    expect(author.replica.ingest(remote.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(author.history.undo()).toMatchObject({ ok: true });

    const complete = author.replica.exportBundle();
    const localEdit = oneChangeBundle(complete, "actor-a", 1);
    const undo = oneChangeBundle(complete, "actor-a", 2);
    const remoteEdit = oneChangeBundle(complete, "actor-b", 1);
    const inOrder = runtime("receiver-a");
    const outOfOrder = runtime("receiver-b");

    expect(inOrder.replica.ingest(complete))
      .toMatchObject({ ok: true });
    expect(outOfOrder.replica.ingest(undo))
      .toMatchObject({
        ok: true,
        pending: [{ actorId: "actor-a", counter: 2 }],
      });
    expect(outOfOrder.replica.ingest(remoteEdit))
      .toMatchObject({ ok: true });
    expect(outOfOrder.replica.ingest(localEdit))
      .toMatchObject({ ok: true, pending: [] });

    expect(outOfOrder.document.value).toEqual(inOrder.document.value);
    expect(outOfOrder.replica.status()).toEqual(
      inOrder.replica.status(),
    );
    expect(outOfOrder.replica.exportBundle()).toEqual(
      inOrder.replica.exportBundle(),
    );
  });

  test("lets a base peer relay history wire operations without authoring them", () => {
    const author = runtime("actor-a");
    author.document.commit([{
      op: "replace",
      path: "/title",
      value: "Temporary",
    }]);
    author.history.undo();

    const relay = createCollaborationRuntime(
      { title: "Draft", done: false },
      { ...baseOptions, actorId: "relay" },
    );
    expect("history" in relay).toBe(false);
    expect(relay.replica.ingest(
      author.replica.exportBundle(),
    )).toMatchObject({ ok: true });
    expect(relay.document.value).toEqual(author.document.value);

    const receiver = runtime("receiver");
    expect(receiver.replica.ingest(
      relay.replica.exportBundle(),
    )).toMatchObject({ ok: true });
    expect(receiver.document.value).toEqual(author.document.value);
    expect(receiver.replica.status()).toEqual(
      author.replica.status(),
    );
  });

  test("publishes one document and collaboration event per visible undo or redo", () => {
    const shared = runtime("actor-a");
    expect(shared.document.commit([{
      op: "replace",
      path: "/title",
      value: "Published",
    }])).toMatchObject({ ok: true });

    const documentValues: unknown[] = [];
    const collaborationListener = vi.fn();
    shared.document.subscribe(() => {
      documentValues.push(shared.document.value);
    });
    shared.replica.subscribe(collaborationListener);

    expect(shared.history.canUndo()).toMatchObject({ ok: true });
    expect(shared.history.undo()).toMatchObject({ ok: true });
    expect(shared.history.canRedo()).toMatchObject({ ok: true });
    expect(shared.history.redo()).toMatchObject({ ok: true });

    expect(documentValues).toEqual([
      { title: "Draft", done: false },
      { title: "Published", done: false },
    ]);
    expect(collaborationListener).toHaveBeenCalledTimes(2);
  });

  test("clears redo when the same actor authors a new data Change", () => {
    const shared = runtime("actor-a");
    shared.document.commit([{
      op: "replace",
      path: "/title",
      value: "First",
    }]);
    expect(shared.history.undo()).toMatchObject({ ok: true });
    expect(shared.history.status().redoTarget).toEqual({
      actorId: "actor-a",
      counter: 1,
    });

    shared.document.commit([{
      op: "replace",
      path: "/done",
      value: true,
    }]);

    expect(shared.history.status().redoTarget).toBeNull();
    expect(shared.history.canRedo()).toMatchObject({
      ok: false,
      code: "nothing_to_redo",
    });
  });

  test("suppresses a forged redo that skips the latest effective undo", () => {
    const shared = runtime("actor-a", {
      first: 0,
      second: 0,
    });
    shared.document.commit([{
      op: "replace",
      path: "/first",
      value: 1,
    }]);
    shared.document.commit([{
      op: "replace",
      path: "/second",
      value: 1,
    }]);
    expect(shared.history.undo()).toMatchObject({ ok: true });
    expect(shared.history.undo()).toMatchObject({ ok: true });

    const epoch = shared.replica.epoch;
    expect(shared.replica.ingest({
      epoch,
      changes: [{
        changeId: { actorId: "actor-a", counter: 5 },
        deps: [{ actorId: "actor-a", counter: 4 }],
        ops: [{
          kind: "redo-change",
          undo: { actorId: "actor-a", counter: 3 },
        }],
      }],
    })).toMatchObject({
      ok: true,
      integrated: [{ actorId: "actor-a", counter: 5 }],
    });

    expect(shared.document.value).toEqual({
      first: 0,
      second: 0,
    });
    expect(shared.replica.status().suppressed).toMatchObject([{
      changeId: { actorId: "actor-a", counter: 5 },
      code: "redo_target_invalid",
    }]);
    expect(shared.history.status()).toEqual({
      undoTarget: null,
      redoTarget: { actorId: "actor-a", counter: 1 },
      undoDepth: 0,
      redoDepth: 2,
      revision: 5,
    });
  });
});
