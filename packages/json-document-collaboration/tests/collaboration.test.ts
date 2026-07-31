import { describe, expect, test, vi } from "vitest";

import {
  createCollaborationRuntime,
  type CollaborationBundle,
  type CollaborationRuntimeOptions,
} from "../src/index.js";

const baseOptions = {
  epochId: "shared-document/v1",
  ruleset: {
    id: "test/json-tree",
    digest: "test/json-tree/v1",
  },
} as const;

function runtime(
  actorId: string,
  initial: unknown = {
    title: "Draft",
    done: false,
    items: ["a", "b"],
  },
  overrides: Partial<CollaborationRuntimeOptions> = {},
) {
  return createCollaborationRuntime(initial, {
    ...baseOptions,
    actorId,
    ...overrides,
  });
}

describe("@interactive-os/json-document-collaboration", () => {
  test("uses a canonical SHA-256 checkpoint fingerprint", () => {
    const shared = runtime("actor-a", null);

    expect(shared.replica.epoch.baseDigest).toBe(
      "sha256:74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b",
    );
  });

  test("exposes the canonical six-member JSON Document API", () => {
    const shared = runtime("actor-a");

    expect(Object.keys(shared).sort()).toEqual([
      "document",
      "replica",
    ]);
    expect(Object.keys(shared.document).sort()).toEqual([
      "at",
      "commit",
      "query",
      "subscribe",
      "validatePatch",
      "value",
    ]);
    expect("ingest" in shared.document).toBe(false);
    expect(typeof shared.replica.ingest).toBe("function");
  });

  test("merges concurrent edits to different members independent of arrival order", () => {
    const left = runtime("actor-a");
    const right = runtime("actor-b");

    expect(left.document.commit([
      { op: "replace", path: "/title", value: "Left" },
    ])).toMatchObject({ ok: true });
    expect(right.document.commit([
      { op: "replace", path: "/done", value: true },
    ])).toMatchObject({ ok: true });

    expect(left.replica.ingest(right.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(right.replica.ingest(left.replica.exportBundle()))
      .toMatchObject({ ok: true });

    expect(left.document.value).toEqual({
      title: "Left",
      done: true,
      items: ["a", "b"],
    });
    expect(right.document.value).toEqual(left.document.value);
    expect(left.replica.status().conflicts).toEqual([]);
  });

  test("keeps concurrent alternatives outside the ordinary JSON document", () => {
    const left = runtime("actor-a");
    const right = runtime("actor-b");

    left.document.commit([
      { op: "replace", path: "/title", value: "Left" },
    ]);
    right.document.commit([
      { op: "replace", path: "/title", value: "Right" },
    ]);

    left.replica.ingest(right.replica.exportBundle());
    right.replica.ingest(left.replica.exportBundle());

    expect(left.document.value).toEqual(right.document.value);
    expect(left.document.value).toMatchObject({ title: "Right" });
    expect(left.replica.status().conflicts).toMatchObject([
      {
        kind: "member-value",
        winner: { actorId: "actor-b", counter: 1 },
        alternatives: [{ actorId: "actor-a", counter: 1 }],
      },
    ]);
  });

  test("orders concurrent array insertions by causal change identity", () => {
    const left = runtime("actor-a");
    const right = runtime("actor-b");

    left.document.commit([
      { op: "add", path: "/items/1", value: "left" },
    ]);
    right.document.commit([
      { op: "add", path: "/items/1", value: "right" },
    ]);

    right.replica.ingest(left.replica.exportBundle());
    left.replica.ingest(right.replica.exportBundle());

    expect(left.document.value).toMatchObject({
      items: ["a", "left", "right", "b"],
    });
    expect(right.document.value).toEqual(left.document.value);
  });

  test("retains an array anchor when a concurrent move relocates that member", () => {
    const initial = {
      left: ["a", "b"],
      right: [] as string[],
    };
    const left = runtime("actor-a", initial);
    const right = runtime("actor-b", initial);

    left.document.commit([{
      op: "move",
      from: "/left/1",
      path: "/right/0",
    }]);
    right.document.commit([{
      op: "add",
      path: "/left/1",
      value: "x",
    }]);

    left.replica.ingest(right.replica.exportBundle());
    right.replica.ingest(left.replica.exportBundle());

    expect(left.document.value).toEqual({
      left: ["a", "x"],
      right: ["b"],
    });
    expect(right.document.value).toEqual(left.document.value);
    expect(left.replica.status().suppressed).toEqual([]);
  });

  test("retains start and end gap insertions when their only anchor moves away", () => {
    for (const path of ["/left/0", "/left/1"]) {
      const initial = {
        left: ["b"],
        right: [] as string[],
      };
      const mover = runtime("actor-a", initial);
      const inserter = runtime("actor-b", initial);

      expect(mover.document.commit([{
        op: "move",
        from: "/left/0",
        path: "/right/0",
      }])).toMatchObject({ ok: true });
      expect(inserter.document.commit([{
        op: "add",
        path,
        value: "x",
      }])).toMatchObject({ ok: true });

      expect(mover.replica.ingest(
        inserter.replica.exportBundle(),
      )).toMatchObject({ ok: true });
      expect(inserter.replica.ingest(
        mover.replica.exportBundle(),
      )).toMatchObject({ ok: true });

      expect(mover.document.value).toEqual({
        left: ["x"],
        right: ["b"],
      });
      expect(inserter.document.value).toEqual(mover.document.value);
      expect(mover.replica.status().suppressed).toEqual([]);
      expect(inserter.replica.status().suppressed).toEqual([]);
    }
  });

  test("keeps an old array position anchor after a same-array move", () => {
    const initial = { items: ["a", "b"] };
    const mover = runtime("actor-a", initial);
    const inserter = runtime("actor-b", initial);

    expect(mover.document.commit([{
      op: "move",
      from: "/items/1",
      path: "/items/0",
    }])).toMatchObject({ ok: true });
    expect(inserter.document.commit([{
      op: "add",
      path: "/items/2",
      value: "x",
    }])).toMatchObject({ ok: true });

    expect(mover.replica.ingest(
      inserter.replica.exportBundle(),
    )).toMatchObject({ ok: true });
    expect(inserter.replica.ingest(
      mover.replica.exportBundle(),
    )).toMatchObject({ ok: true });

    expect(mover.document.value).toEqual({ items: ["b", "a", "x"] });
    expect(inserter.document.value).toEqual(mover.document.value);
    expect(mover.replica.status().suppressed).toEqual([]);
  });

  test("preserves member identity across rename while merging a concurrent child edit", () => {
    const initial = {
      cards: {
        draft: {
          title: "Draft",
        },
      },
    };
    const left = runtime("actor-a", initial);
    const right = runtime("actor-b", initial);

    left.document.commit([{
      op: "move",
      from: "/cards/draft",
      path: "/cards/published",
    }]);
    right.document.commit([{
      op: "replace",
      path: "/cards/draft/title",
      value: "Ready",
    }]);

    left.replica.ingest(right.replica.exportBundle());
    right.replica.ingest(left.replica.exportBundle());

    expect(left.document.value).toEqual({
      cards: {
        published: {
          title: "Ready",
        },
      },
    });
    expect(right.document.value).toEqual(left.document.value);
  });

  test("gives copied subtrees fresh identities", () => {
    const initial = {
      cards: {
        source: {
          title: "Draft",
        },
      },
    };
    const left = runtime("actor-a", initial);
    const right = runtime("actor-b", initial);

    left.document.commit([{
      op: "copy",
      from: "/cards/source",
      path: "/cards/copy",
    }]);
    right.document.commit([{
      op: "replace",
      path: "/cards/source/title",
      value: "Changed",
    }]);

    left.replica.ingest(right.replica.exportBundle());
    right.replica.ingest(left.replica.exportBundle());

    expect(left.document.value).toEqual({
      cards: {
        copy: {
          title: "Draft",
        },
        source: {
          title: "Changed",
        },
      },
    });
    expect(right.document.value).toEqual(left.document.value);
  });

  test("does not retarget an edit across delete and same-key re-add", () => {
    const initial = {
      cards: {
        draft: {
          title: "Old",
        },
      },
    };
    const left = runtime("actor-a", initial);
    const right = runtime("actor-b", initial);

    left.document.commit([
      { op: "remove", path: "/cards/draft" },
      {
        op: "add",
        path: "/cards/draft",
        value: { title: "New" },
      },
    ]);
    right.document.commit([{
      op: "replace",
      path: "/cards/draft/title",
      value: "Edited old member",
    }]);

    left.replica.ingest(right.replica.exportBundle());
    right.replica.ingest(left.replica.exportBundle());

    expect(left.document.value).toEqual({
      cards: {
        draft: {
          title: "New",
        },
      },
    });
    expect(right.document.value).toEqual(left.document.value);
  });

  test("queues out-of-order changes and integrates the unlocked causal chain once", () => {
    const source = runtime("actor-a");
    const target = runtime("actor-b");

    source.document.commit([
      { op: "replace", path: "/title", value: "First" },
    ]);
    source.document.commit([
      { op: "replace", path: "/title", value: "Second" },
    ]);
    const exported = source.replica.exportBundle();
    const first = exported.changes[0];
    const second = exported.changes[1];
    if (first === undefined || second === undefined) {
      throw new Error("expected two changes");
    }

    const secondOnly: CollaborationBundle = {
      epoch: exported.epoch,
      changes: [second],
    };
    expect(target.replica.ingest(secondOnly)).toMatchObject({
      ok: true,
      integrated: [],
      pending: [{ actorId: "actor-a", counter: 2 }],
    });
    expect(target.document.value).toMatchObject({ title: "Draft" });

    const notifications: unknown[] = [];
    target.document.subscribe((change) => notifications.push(change));
    expect(target.replica.ingest({
      epoch: exported.epoch,
      changes: [first],
    })).toMatchObject({
      ok: true,
      integrated: [
        { actorId: "actor-a", counter: 1 },
        { actorId: "actor-a", counter: 2 },
      ],
      pending: [],
    });
    expect(target.document.value).toMatchObject({ title: "Second" });
    expect(notifications).toHaveLength(1);
  });

  test("publishes immutable collaboration snapshots once per state-adding ingest", () => {
    const source = runtime("actor-a");
    const target = runtime("actor-b");
    source.document.commit([
      { op: "replace", path: "/title", value: "First" },
    ]);
    source.document.commit([
      { op: "replace", path: "/title", value: "Second" },
    ]);
    const bundle = source.replica.exportBundle();
    const first = bundle.changes[0];
    const second = bundle.changes[1];
    if (first === undefined || second === undefined) {
      throw new Error("expected two changes");
    }

    const snapshots: ReturnType<typeof target.replica.status>[] = [];
    const unsubscribe = target.replica.subscribe((snapshot) => {
      snapshots.push(snapshot);
    });
    target.replica.ingest({
      epoch: bundle.epoch,
      changes: [second],
    });

    expect(snapshots).toHaveLength(1);
    const pendingSnapshot = snapshots[0];
    expect(Object.isFrozen(pendingSnapshot)).toBe(true);
    expect(Object.isFrozen(pendingSnapshot?.pending)).toBe(true);
    expect(Object.isFrozen(pendingSnapshot?.pending[0])).toBe(true);
    expect(Object.isFrozen(pendingSnapshot?.pending[0]?.missing)).toBe(true);

    target.replica.ingest({
      epoch: bundle.epoch,
      changes: [second],
    });
    expect(snapshots).toHaveLength(1);

    unsubscribe();
    target.replica.ingest({
      epoch: bundle.epoch,
      changes: [first],
    });
    expect(snapshots).toHaveLength(1);
    expect(target.document.value).toMatchObject({ title: "Second" });
  });

  test("queues reentrant collaboration notifications in causal order", () => {
    const source = runtime("actor-a");
    const target = runtime("actor-b");
    source.document.commit([
      { op: "replace", path: "/title", value: "Remote" },
    ]);

    let reentered = false;
    const publishedHeads: string[] = [];
    target.replica.subscribe(() => {
      if (reentered) return;
      reentered = true;
      expect(target.document.commit([
        { op: "replace", path: "/done", value: true },
      ])).toMatchObject({ ok: true });
    });
    target.replica.subscribe((snapshot) => {
      const head = snapshot.heads[0];
      if (head !== undefined) {
        publishedHeads.push(`${head.actorId}:${head.counter}`);
      }
    });

    expect(target.replica.ingest(
      source.replica.exportBundle(),
    )).toMatchObject({ ok: true });
    expect(publishedHeads).toEqual(["actor-a:1", "actor-b:1"]);
    expect(target.document.value).toMatchObject({
      title: "Remote",
      done: true,
    });
  });

  test("isolates collaboration listener failures after committing state", () => {
    const source = runtime("actor-a");
    const target = runtime("actor-b");
    source.document.commit([
      { op: "replace", path: "/title", value: "Integrated" },
    ]);

    let laterListenerCalls = 0;
    target.replica.subscribe(() => {
      throw new Error("listener failed");
    });
    target.replica.subscribe(() => {
      laterListenerCalls += 1;
    });

    expect(() => target.replica.ingest(
      source.replica.exportBundle(),
    )).not.toThrow();
    expect(laterListenerCalls).toBe(1);
    expect(target.document.value).toMatchObject({ title: "Integrated" });
  });

  test("skips a collaboration listener unsubscribed during notification", () => {
    const source = runtime("actor-a");
    const target = runtime("actor-b");
    source.document.commit([
      { op: "replace", path: "/title", value: "Integrated" },
    ]);

    const firstListener = vi.fn();
    const secondListener = vi.fn();
    let unsubscribeSecond = (): void => undefined;
    target.replica.subscribe((snapshot) => {
      firstListener(snapshot);
      unsubscribeSecond();
    });
    unsubscribeSecond = target.replica.subscribe(secondListener);

    expect(target.replica.ingest(
      source.replica.exportBundle(),
    )).toMatchObject({ ok: true });
    expect(firstListener).toHaveBeenCalledOnce();
    expect(secondListener).not.toHaveBeenCalled();
  });

  test("suppresses a whole concurrent Change when the combined document is invalid", () => {
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
            pointer: "/remote",
          }
        : { ok: true as const };
    };
    const options = {
      ruleset: {
        id: "test/exclusive-flags",
        digest: "test/exclusive-flags/v1",
      },
      validate,
    };
    const left = runtime(
      "actor-a",
      { local: false, remote: false },
      options,
    );
    const right = runtime(
      "actor-b",
      { local: false, remote: false },
      options,
    );

    left.document.commit([
      { op: "replace", path: "/local", value: true },
    ]);
    right.document.commit([
      { op: "replace", path: "/remote", value: true },
    ]);

    left.replica.ingest(right.replica.exportBundle());
    right.replica.ingest(left.replica.exportBundle());

    expect(left.document.value).toEqual({
      local: true,
      remote: false,
    });
    expect(right.document.value).toEqual(left.document.value);
    expect(left.replica.status().suppressed).toEqual([
      {
        changeId: { actorId: "actor-b", counter: 1 },
        code: "schema_violation",
        reason: "local and remote are mutually exclusive",
        pointer: "/remote",
      },
    ]);
  });

  test("preserves explicit test preconditions when an ancestor Change is suppressed", () => {
    const validate = (candidate: unknown) => {
      const value = candidate as {
        readonly local: boolean;
        readonly remote: boolean;
      };
      return value.local && value.remote
        ? { ok: false as const, code: "schema_violation" }
        : { ok: true as const };
    };
    const overrides = {
      ruleset: {
        id: "test/causal-precondition",
        digest: "test/causal-precondition/v1",
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

    left.document.commit([
      { op: "replace", path: "/local", value: true },
    ]);
    right.document.commit([
      { op: "replace", path: "/remote", value: true },
    ]);
    right.document.commit([
      { op: "test", path: "/remote", value: true },
      { op: "add", path: "/note", value: "ready" },
    ]);

    left.replica.ingest(right.replica.exportBundle());
    right.replica.ingest(left.replica.exportBundle());

    expect(left.document.value).toEqual({
      local: true,
      remote: false,
    });
    expect(right.document.value).toEqual(left.document.value);
    expect(left.replica.status().suppressed).toMatchObject([
      {
        changeId: { actorId: "actor-b", counter: 1 },
        code: "schema_violation",
      },
      {
        changeId: { actorId: "actor-b", counter: 2 },
        code: "test_failed",
      },
    ]);
  });

  test("isolates validation candidates from mutation during remote materialization", () => {
    const mutatingValidation = (candidate: unknown) => {
      const value = candidate as { readonly forbidden: boolean };
      if (value.forbidden) {
        Reflect.set(value, "forbidden", false);
      }
      return value.forbidden
        ? { ok: false as const, code: "schema_violation" }
        : { ok: true as const };
    };
    const overrides = {
      ruleset: {
        id: "test/immutable-validation",
        digest: "test/immutable-validation/v1",
      },
    };
    expect(() => runtime(
      "invalid-initial",
      { forbidden: true },
      { ...overrides, validate: mutatingValidation },
    )).toThrow("Initial document value was rejected");

    const source = runtime("actor-a", { forbidden: false }, overrides);
    const target = runtime("actor-b", { forbidden: false }, {
      ...overrides,
      validate: mutatingValidation,
    });
    source.document.commit([
      { op: "replace", path: "/forbidden", value: true },
    ]);

    const untrusted = source.replica.exportBundle();
    expect(target.replica.ingest({
      epoch: target.replica.epoch,
      changes: untrusted.changes,
    }))
      .toMatchObject({ ok: true });
    expect(target.document.value).toEqual({ forbidden: false });
    expect(target.replica.status().suppressed).toMatchObject([
      {
        changeId: { actorId: "actor-a", counter: 1 },
        code: "schema_violation",
      },
    ]);
  });

  test("retains both same-key insertions while projecting one deterministic winner", () => {
    const left = runtime("actor-a", { fields: {} });
    const right = runtime("actor-b", { fields: {} });

    left.document.commit([
      { op: "add", path: "/fields/name", value: "Left" },
    ]);
    right.document.commit([
      { op: "add", path: "/fields/name", value: "Right" },
    ]);

    left.replica.ingest(right.replica.exportBundle());
    right.replica.ingest(left.replica.exportBundle());

    expect(left.document.value).toEqual({ fields: { name: "Right" } });
    expect(right.document.value).toEqual(left.document.value);
    expect(left.replica.status().conflicts).toMatchObject([
      {
        kind: "object-key",
        key: "name",
      },
    ]);

    const removal = [{ op: "remove", path: "/fields/name" }] as const;
    expect(left.document.validatePatch(removal)).toEqual({ ok: true });
    expect(left.document.commit(removal)).toMatchObject({ ok: true });
    right.replica.ingest(left.replica.exportBundle());

    expect(left.document.value).toEqual({ fields: {} });
    expect(right.document.value).toEqual(left.document.value);
    expect(left.replica.status().conflicts).toEqual([]);
  });

  test("retains concurrent moves that replace the same destination member", () => {
    const initial = {
      x: "X",
      y: "Y",
      z: "Z",
    };
    const left = runtime("actor-a", initial);
    const right = runtime("actor-b", initial);

    left.document.commit([{
      op: "move",
      from: "/x",
      path: "/y",
    }]);
    right.document.commit([{
      op: "move",
      from: "/z",
      path: "/y",
    }]);

    left.replica.ingest(right.replica.exportBundle());
    right.replica.ingest(left.replica.exportBundle());

    expect(left.document.value).toEqual({ y: "Z" });
    expect(right.document.value).toEqual(left.document.value);
    expect(left.replica.status().suppressed).toEqual([]);
    expect(left.replica.status().conflicts).toMatchObject([
      {
        kind: "object-key",
        key: "y",
      },
    ]);
  });

  test("moves a projected object-key winner without revealing its hidden alternative", () => {
    const left = runtime("actor-a", { fields: {} });
    const right = runtime("actor-b", { fields: {} });
    left.document.commit([
      { op: "add", path: "/fields/name", value: "Left" },
    ]);
    right.document.commit([
      { op: "add", path: "/fields/name", value: "Right" },
    ]);
    left.replica.ingest(right.replica.exportBundle());
    right.replica.ingest(left.replica.exportBundle());

    const move = [{
      op: "move",
      from: "/fields/name",
      path: "/fields/other",
    }] as const;
    expect(left.document.validatePatch(move)).toEqual({ ok: true });
    expect(left.document.commit(move)).toMatchObject({ ok: true });
    right.replica.ingest(left.replica.exportBundle());

    expect(left.document.value).toEqual({
      fields: {
        other: "Right",
      },
    });
    expect(right.document.value).toEqual(left.document.value);
    expect(left.replica.status().conflicts).toEqual([]);
  });

  test("keeps conflict cleanup effective when an alternative was concurrently removed", () => {
    const initial = { fields: {}, sequence: 0 };
    const left = runtime("actor-a", initial);
    const right = runtime("actor-b", initial);
    const resolver = runtime("actor-c", initial);

    left.document.commit([
      { op: "add", path: "/fields/name", value: "Left" },
    ]);
    right.document.commit([
      { op: "add", path: "/fields/name", value: "Right" },
    ]);
    resolver.document.commit([
      { op: "replace", path: "/sequence", value: 1 },
    ]);
    resolver.document.commit([
      { op: "replace", path: "/sequence", value: 2 },
    ]);
    resolver.replica.ingest(left.replica.exportBundle());
    resolver.replica.ingest(right.replica.exportBundle());

    left.document.commit([
      { op: "remove", path: "/fields/name" },
    ]);
    resolver.document.commit([
      { op: "remove", path: "/fields/name" },
    ]);

    const receiver = runtime("receiver", initial);
    receiver.replica.ingest(left.replica.exportBundle());
    receiver.replica.ingest(right.replica.exportBundle());
    receiver.replica.ingest(resolver.replica.exportBundle());

    expect(receiver.document.value).toEqual({
      fields: {},
      sequence: 2,
    });
    expect(receiver.replica.status().suppressed).toEqual([]);
  });

  test("does not report causally superseded writes as concurrent conflicts", () => {
    const shared = runtime("actor-a");

    shared.document.commit([
      { op: "replace", path: "/title", value: "First" },
    ]);
    shared.document.commit([
      { op: "replace", path: "/title", value: "Second" },
    ]);

    expect(shared.document.value).toMatchObject({ title: "Second" });
    expect(shared.replica.status().conflicts).toEqual([]);
  });

  test("converges after receiving the same three branches in different orders", () => {
    const authors = ["actor-a", "actor-b", "actor-c"].map((actorId) => (
      runtime(actorId)
    ));
    authors[0]?.document.commit([
      { op: "replace", path: "/title", value: "A" },
    ]);
    authors[1]?.document.commit([
      { op: "add", path: "/items/1", value: "B" },
    ]);
    authors[2]?.document.commit([
      { op: "replace", path: "/done", value: true },
    ]);
    const bundles = authors.map((author) => author.replica.exportBundle());
    const first = runtime("receiver-a");
    const second = runtime("receiver-b");

    for (const index of [0, 1, 2]) {
      first.replica.ingest(bundles[index]);
    }
    for (const index of [2, 0, 1]) {
      second.replica.ingest(bundles[index]);
    }

    expect(first.document.value).toEqual(second.document.value);
    expect(first.replica.status()).toEqual(
      second.replica.status(),
    );
  });

  test("rejects a mismatched ruleset before changing causal or projected state", () => {
    const left = runtime("actor-a");
    const right = runtime("actor-b", undefined, {
      ruleset: {
        id: "test/other",
        digest: "test/other/v1",
      },
    });
    right.document.commit([
      { op: "replace", path: "/title", value: "Other" },
    ]);
    const before = left.replica.status();

    expect(left.replica.ingest(right.replica.exportBundle()))
      .toEqual({
        ok: false,
        code: "ruleset_mismatch",
        reason: "bundle ruleset does not match this document epoch",
      });
    expect(left.document.value).toMatchObject({ title: "Draft" });
    expect(left.replica.status()).toEqual(before);
  });

  test("treats identical delivery as idempotent and rejects changed duplicate payloads", () => {
    const source = runtime("actor-a");
    const target = runtime("actor-b");
    source.document.commit([
      { op: "replace", path: "/title", value: "Once" },
    ]);
    const bundle = source.replica.exportBundle();

    expect(target.replica.ingest(bundle)).toMatchObject({ ok: true });
    expect(target.replica.ingest(bundle)).toMatchObject({
      ok: true,
      duplicates: [{ actorId: "actor-a", counter: 1 }],
    });

    const change = bundle.changes[0];
    if (change === undefined) throw new Error("expected one change");
    expect(target.replica.ingest({
      epoch: bundle.epoch,
      changes: [{
        ...change,
        ops: [{
          kind: "set",
          target: change.ops[0]?.kind === "set"
            ? change.ops[0].target
            : "different",
          value: "tampered",
        }],
      }],
    })).toMatchObject({
      ok: false,
      code: "duplicate_mismatch",
      changeId: { actorId: "actor-a", counter: 1 },
    });
    expect(target.document.value).toMatchObject({ title: "Once" });
  });

  test("rejects a non-initial actor counter before it can poison history", () => {
    const shared = runtime("actor-a");
    const before = shared.replica.status();
    const exhausted: CollaborationBundle = {
      epoch: shared.replica.epoch,
      changes: [{
        changeId: {
          actorId: "actor-a",
          counter: Number.MAX_SAFE_INTEGER,
        },
        deps: [],
        ops: [],
      }],
    };
    expect(shared.replica.ingest(exhausted)).toEqual({
      ok: false,
      code: "actor_fork",
      reason: "one actorId must form one contiguous causal change chain",
      changeId: {
        actorId: "actor-a",
        counter: Number.MAX_SAFE_INTEGER,
      },
    });
    expect(shared.replica.status()).toEqual(before);
    expect(shared.replica.exportBundle().changes).toEqual([]);
    expect(shared.document.value).toMatchObject({ title: "Draft" });
  });

  test("rejects a non-causal fork within one actor lineage transactionally", () => {
    const target = runtime("peer");
    const before = target.replica.status();
    const forked: CollaborationBundle = {
      epoch: target.replica.epoch,
      changes: [
        {
          changeId: { actorId: "actor-a", counter: 1 },
          deps: [],
          ops: [],
        },
        {
          changeId: { actorId: "actor-a", counter: 2 },
          deps: [],
          ops: [],
        },
      ],
    };

    expect(target.replica.ingest(forked)).toEqual({
      ok: false,
      code: "actor_fork",
      reason: "one actorId must form one contiguous causal change chain",
      changeId: { actorId: "actor-a", counter: 2 },
    });
    expect(target.replica.status()).toEqual(before);
    expect(target.replica.exportBundle().changes).toEqual([]);
  });

  test("rejects a pending actor fork before it can poison later dependencies", () => {
    const target = runtime("peer");
    const fork: CollaborationBundle = {
      epoch: target.replica.epoch,
      changes: [{
        changeId: { actorId: "actor-a", counter: 2 },
        deps: [{ actorId: "actor-b", counter: 1 }],
        ops: [],
      }],
    };

    expect(target.replica.ingest(fork)).toEqual({
      ok: false,
      code: "actor_fork",
      reason: "one actorId must form one contiguous causal change chain",
      changeId: { actorId: "actor-a", counter: 2 },
    });
    expect(target.replica.exportBundle().changes).toEqual([]);
  });

  test("rejects a first Change that depends on its own future counter", () => {
    const target = runtime("peer");
    const poisoned: CollaborationBundle = {
      epoch: target.replica.epoch,
      changes: [{
        changeId: { actorId: "actor-a", counter: 1 },
        deps: [{ actorId: "actor-a", counter: 2 }],
        ops: [],
      }],
    };

    expect(target.replica.ingest(poisoned)).toEqual({
      ok: false,
      code: "actor_fork",
      reason: "one actorId must form one contiguous causal change chain",
      changeId: { actorId: "actor-a", counter: 1 },
    });
    expect(target.replica.exportBundle().changes).toEqual([]);
    expect(target.replica.status().pending).toEqual([]);
  });

  test("does not let a restored actor fork while its own history is pending", () => {
    const source = runtime("actor-a");
    source.document.commit([
      { op: "replace", path: "/title", value: "First" },
    ]);
    source.document.commit([
      { op: "replace", path: "/title", value: "Second" },
    ]);
    const bundle = source.replica.exportBundle();
    const first = bundle.changes[0];
    const second = bundle.changes[1];
    if (first === undefined || second === undefined) {
      throw new Error("expected two changes");
    }

    const restored = runtime("actor-a");
    expect(restored.replica.ingest({
      epoch: bundle.epoch,
      changes: [second],
    })).toMatchObject({
      ok: true,
      pending: [{ actorId: "actor-a", counter: 2 }],
    });
    const operation = [{
      op: "replace",
      path: "/title",
      value: "Fork",
    }] as const;
    expect(restored.document.validatePatch(operation)).toEqual({
      ok: false,
      code: "actor_history_pending",
      reason: "cannot author while this actor has pending causal history",
    });

    expect(restored.replica.ingest({
      epoch: bundle.epoch,
      changes: [first],
    })).toMatchObject({ ok: true, pending: [] });
    expect(restored.document.commit(operation)).toMatchObject({ ok: true });

    const peer = runtime("peer");
    expect(peer.replica.ingest(restored.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(peer.document.value).toMatchObject({ title: "Fork" });
    expect(peer.replica.status().conflicts).toEqual([]);
  });
});
