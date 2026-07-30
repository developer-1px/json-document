import { describe, expect, test, vi } from "vitest";

import {
  createCollaborationRuntime,
  type CollaborationRuntimeOptions,
} from "../src/index.js";
import {
  restoreHistoryRuntime,
} from "../src/history-index.js";
import {
  createTextRuntime,
  restoreTextRuntime,
} from "../src/text-index.js";

const baseOptions = {
  epochId: "shared-text-authoring/v1",
  ruleset: {
    id: "test/json-tree-text-authoring",
    digest: "test/json-tree-text-authoring/v1",
  },
} as const;

function textRuntime(
  actorId: string,
  initial: unknown = { title: "ab" },
  overrides: Partial<CollaborationRuntimeOptions> = {},
) {
  return createTextRuntime(initial, {
    ...baseOptions,
    actorId,
    ...overrides,
  });
}

describe("@interactive-os/json-document-collaboration/text", () => {
  test("adds text authoring beside the canonical JSON Document", () => {
    const shared = textRuntime("actor-a");

    expect(Object.keys(shared).sort()).toEqual([
      "document",
      "history",
      "replica",
      "text",
    ]);
    expect(Object.keys(shared.document).sort()).toEqual([
      "at",
      "commit",
      "query",
      "subscribe",
      "validatePatch",
      "value",
    ]);
    expect(Object.keys(shared.text).sort()).toEqual([
      "capture",
      "commit",
      "plan",
    ]);
  });

  test("keeps root string replace atomic and opts text runtime into splice", () => {
    const atomic = createCollaborationRuntime(
      { title: "ab" },
      { ...baseOptions, actorId: "atomic" },
    );
    const collaborative = textRuntime("text");

    expect(atomic.document.commit([{
      op: "replace",
      path: "/title",
      value: "aXb",
    }])).toMatchObject({ ok: true });
    expect(collaborative.document.commit([{
      op: "replace",
      path: "/title",
      value: "aXb",
    }])).toMatchObject({ ok: true });

    expect(atomic.replica.exportBundle().changes[0]?.ops)
      .toMatchObject([{ kind: "set" }]);
    expect(collaborative.replica.exportBundle().changes[0]?.ops)
      .toMatchObject([{ kind: "text-splice" }]);
  });

  test("merges concurrent document string replaces and lets a base peer relay", () => {
    const left = textRuntime("actor-a");
    const right = textRuntime("actor-b");
    const relay = createCollaborationRuntime(
      { title: "ab" },
      { ...baseOptions, actorId: "relay" },
    );

    expect(left.document.commit([{
      op: "replace",
      path: "/title",
      value: "aXb",
    }])).toMatchObject({ ok: true });
    expect(right.document.commit([{
      op: "replace",
      path: "/title",
      value: "aYb",
    }])).toMatchObject({ ok: true });

    expect(left.replica.ingest(right.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(right.replica.ingest(left.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(left.document.value).toEqual({ title: "aXYb" });
    expect(right.document.value).toEqual(left.document.value);

    expect(relay.replica.ingest(left.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(relay.document.value).toEqual(left.document.value);
  });

  test("authors from the capture frontier while merging remote input", () => {
    const local = textRuntime("actor-a");
    const remote = textRuntime("actor-b");
    const captured = local.text.capture("/title");
    if (!captured.ok) throw new Error(captured.reason);

    expect(remote.document.commit([{
      op: "replace",
      path: "/title",
      value: "aXb",
    }])).toMatchObject({ ok: true });
    expect(local.replica.ingest(remote.replica.exportBundle()))
      .toMatchObject({ ok: true });

    const planned = local.text.plan(captured.capture, {
      value: "aYb",
      selection: { anchor: 2, focus: 2 },
    });
    if (!planned.ok) throw new Error(planned.reason);
    const documentListener = vi.fn();
    const collaborationListener = vi.fn();
    local.document.subscribe(documentListener);
    local.replica.subscribe(collaborationListener);

    expect(local.text.commit(planned.plan)).toMatchObject({
      ok: true,
      didChangeDocument: true,
      value: "aYXb",
      selection: { anchor: 2, focus: 2 },
    });
    const localChange = local.replica.exportBundle().changes.find(
      (change) => change.changeId.actorId === "actor-a",
    );
    expect(localChange?.deps).toEqual([]);
    expect(localChange?.ops).toMatchObject([{ kind: "text-splice" }]);
    expect(documentListener).toHaveBeenCalledTimes(1);
    expect(collaborationListener).toHaveBeenCalledTimes(1);

    expect(remote.replica.ingest(local.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(remote.document.value).toEqual(local.document.value);
  });

  test("does not make a capture stale on remote ingest but rejects graph changes after plan", () => {
    const local = textRuntime("actor-a");
    const firstRemote = textRuntime("actor-b");
    const secondRemote = textRuntime("actor-c");
    const captured = local.text.capture("/title");
    if (!captured.ok) throw new Error(captured.reason);

    firstRemote.document.commit([{
      op: "replace",
      path: "/title",
      value: "aXb",
    }]);
    local.replica.ingest(firstRemote.replica.exportBundle());
    const planned = local.text.plan(captured.capture, { value: "aYb" });
    if (!planned.ok) throw new Error(planned.reason);

    secondRemote.document.commit([{
      op: "replace",
      path: "/title",
      value: "aZb",
    }]);
    local.replica.ingest(secondRemote.replica.exportBundle());
    expect(local.text.commit(planned.plan)).toMatchObject({
      ok: false,
      code: "stale_text_plan",
    });
    expect(
      local.replica.exportBundle().changes.some(
        (change) => change.changeId.actorId === "actor-a",
      ),
    ).toBe(false);
  });

  test("rejects a capture after the same actor authors another Change", () => {
    const shared = textRuntime("actor-a");
    const captured = shared.text.capture("/title");
    if (!captured.ok) throw new Error(captured.reason);

    shared.document.commit([{
      op: "add",
      path: "/done",
      value: true,
    }]);
    expect(shared.text.plan(captured.capture, { value: "aXb" }))
      .toMatchObject({
        ok: false,
        code: "stale_text_capture",
      });
  });

  test("fails closed when a remote atomic reset changes the text generation", () => {
    const local = textRuntime("actor-a");
    const resetter = createCollaborationRuntime(
      { title: "ab" },
      { ...baseOptions, actorId: "actor-b" },
    );
    const captured = local.text.capture("/title");
    if (!captured.ok) throw new Error(captured.reason);

    resetter.document.commit([{
      op: "replace",
      path: "/title",
      value: "reset",
    }]);
    local.replica.ingest(resetter.replica.exportBundle());

    expect(local.text.plan(captured.capture, { value: "aXb" }))
      .toMatchObject({
        ok: false,
        code: "text_generation_mismatch",
      });
    expect(local.document.value).toEqual({ title: "reset" });
  });

  test("rejects selection offsets inside a surrogate pair", () => {
    const shared = textRuntime("actor-a", { title: "A😀B" });
    const captured = shared.text.capture("/title");
    if (!captured.ok) throw new Error(captured.reason);

    expect(shared.text.plan(captured.capture, {
      value: "A😀B",
      selection: { anchor: 2, focus: 2 },
    })).toMatchObject({
      ok: false,
      code: "invalid_text_offset",
    });
  });

  test("maps a no-op capture selection through a remote insertion without authoring", () => {
    const local = textRuntime("actor-a");
    const remote = textRuntime("actor-b");
    const captured = local.text.capture("/title");
    if (!captured.ok) throw new Error(captured.reason);
    remote.document.commit([{
      op: "replace",
      path: "/title",
      value: "aXb",
    }]);
    local.replica.ingest(remote.replica.exportBundle());

    const planned = local.text.plan(captured.capture, {
      value: "ab",
      selection: { anchor: 1, focus: 1 },
    });
    if (!planned.ok) throw new Error(planned.reason);
    const listener = vi.fn();
    local.replica.subscribe(listener);
    expect(local.text.commit(planned.plan)).toMatchObject({
      ok: true,
      change: { applied: [] },
      changeId: null,
      didChangeDocument: false,
      value: "aXb",
      selection: { anchor: 1, focus: 1 },
    });
    expect(listener).not.toHaveBeenCalled();
  });

  test("publishes owned editor metadata and fails before causal mutation when metadata is invalid", () => {
    const shared = textRuntime("actor-a");
    const captured = shared.text.capture("/title");
    if (!captured.ok) throw new Error(captured.reason);
    const planned = shared.text.plan(captured.capture, {
      value: "aXb",
      selection: { anchor: 2, focus: 2 },
    });
    if (!planned.ok) throw new Error(planned.reason);

    const metadata = {
      editor: {
        transactionId: "editor-1",
      },
    };
    const listener = vi.fn();
    shared.document.subscribe(listener);
    const committed = shared.text.commit(planned.plan, { metadata });
    expect(committed).toMatchObject({
      ok: true,
      change: {
        metadata,
      },
    });
    if (!committed.ok) throw new Error(committed.reason);
    expect(Object.isFrozen(committed.change.metadata)).toBe(true);
    expect(listener).toHaveBeenCalledWith(committed.change);

    const nextCapture = shared.text.capture("/title");
    if (!nextCapture.ok) throw new Error(nextCapture.reason);
    const nextPlan = shared.text.plan(nextCapture.capture, {
      value: "aXYb",
    });
    if (!nextPlan.ok) throw new Error(nextPlan.reason);
    const before = shared.replica.exportBundle();
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(shared.text.commit(nextPlan.plan, {
      metadata: circular as never,
    })).toMatchObject({
      ok: false,
      code: "not_serializable",
    });
    expect(shared.replica.exportBundle()).toEqual(before);
    expect(shared.document.value).toEqual({ title: "aXb" });
  });

  test("restores text authoring and selective history from the same checkpoint", () => {
    const local = textRuntime("actor-a");
    const remote = textRuntime("actor-b");
    local.document.commit([{
      op: "replace",
      path: "/title",
      value: "aXb",
    }]);
    remote.document.commit([{
      op: "replace",
      path: "/title",
      value: "aYb",
    }]);
    local.replica.ingest(remote.replica.exportBundle());
    const checkpoint = local.replica.exportCheckpoint();

    const textRestored = restoreTextRuntime(checkpoint, {
      actorId: "actor-a",
      ruleset: baseOptions.ruleset,
    });
    if (!textRestored.ok) throw new Error(textRestored.reason);
    expect(textRestored.runtime.text.capture("/title"))
      .toMatchObject({ ok: true });

    const historyRestored = restoreHistoryRuntime(checkpoint, {
      actorId: "actor-a",
      ruleset: baseOptions.ruleset,
    });
    if (!historyRestored.ok) throw new Error(historyRestored.reason);
    expect(historyRestored.runtime.history.undo()).toMatchObject({
      ok: true,
      target: { actorId: "actor-a", counter: 1 },
    });
    expect(historyRestored.runtime.document.value).toEqual({ title: "aYb" });
    expect(historyRestored.runtime.history.redo()).toMatchObject({ ok: true });
    expect(historyRestored.runtime.document.value).toEqual(local.document.value);
  });
});
