import { describe, expect, test } from "vitest";

import {
  createCollaborationRuntime,
  type CollaborationBundle,
  type CollaborationRuntimeOptions,
} from "../src/index.js";
import {
  authoredTextAtomId,
  createMinimalTextSplice,
  createTextNodeId,
  initialTextAtomId,
} from "../src/text-core.js";
import {
  createInitialTree,
  projectTree,
  resolveTextMemberSnapshot,
  resolveTextSnapshot,
} from "../src/tree.js";
import { compilePatchOperations } from "../src/translate.js";
import type {
  ChangeId,
  CollaborationChange,
  SemanticOperation,
  TextSpliceOperation,
} from "../src/types.js";

const baseOptions = {
  epochId: "shared-text-wire/v1",
  ruleset: {
    id: "test/json-tree-text",
    digest: "test/json-tree-text/v1",
  },
} as const;

function runtime(
  actorId: string,
  initial: unknown,
  overrides: Partial<CollaborationRuntimeOptions> = {},
) {
  return createCollaborationRuntime(initial, {
    ...baseOptions,
    actorId,
    ...overrides,
  });
}

function initialTextIds(
  shared: ReturnType<typeof runtime>,
  segments: ReadonlyArray<string>,
  value: string,
) {
  const seed = `initial:${shared.replica.epoch.baseDigest}`;
  const path = [
    "value",
    ...segments.map((segment) => `${segment.length}:${segment}`),
  ].join("/");
  const textNode = createTextNodeId(seed, path);
  return {
    member: segments.length === 0
      ? `root:${shared.replica.epoch.baseDigest}`
      : `${seed}:member:${path}`,
    textNode,
    atoms: Array.from(value, (_, unitIndex) => (
      initialTextAtomId(textNode, unitIndex)
    )),
  };
}

function change(
  actorId: string,
  ops: ReadonlyArray<SemanticOperation>,
  deps: ReadonlyArray<ChangeId> = [],
  counter = 1,
): CollaborationChange {
  return {
    changeId: { actorId, counter },
    deps,
    ops,
  };
}

function bundle(
  shared: ReturnType<typeof runtime>,
  changes: ReadonlyArray<CollaborationChange>,
): CollaborationBundle {
  return {
    epoch: shared.replica.epoch,
    changes,
  };
}

function splice(
  target: ReturnType<typeof initialTextIds>,
  input: {
    readonly left: number | null;
    readonly right: number | null;
    readonly removed?: ReadonlyArray<number>;
    readonly inserted?: string;
  },
): TextSpliceOperation {
  return {
    kind: "text-splice",
    target: target.member,
    textNode: target.textNode,
    left: input.left === null ? null : target.atoms[input.left] as string,
    right: input.right === null ? null : target.atoms[input.right] as string,
    removed: (input.removed ?? []).map((index) => (
      target.atoms[index] as string
    )),
    inserted: input.inserted ?? "",
  };
}

describe("protocol v3 text-splice wire materialization", () => {
  test("lets the base runtime ingest, project, export, and relay text Changes", () => {
    const initial = { title: "ab" };
    const receiver = runtime("receiver-a", initial);
    const relay = runtime("receiver-b", initial);
    const title = initialTextIds(receiver, ["title"], "ab");
    const textChange = change("actor-a", [
      splice(title, {
        left: 0,
        right: 1,
        inserted: "X",
      }),
    ]);

    expect(receiver.replica.ingest(bundle(receiver, [textChange])))
      .toMatchObject({ ok: true });
    expect(receiver.document.value).toEqual({ title: "aXb" });
    expect(receiver.replica.exportBundle().changes[0]).toEqual(
      textChange,
    );

    expect(relay.replica.ingest(receiver.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(relay.document.value).toEqual(receiver.document.value);
  });

  test("orders concurrent inserts in the same captured gap deterministically", () => {
    const initial = { title: "ab" };
    const basis = runtime("basis", initial);
    const title = initialTextIds(basis, ["title"], "ab");
    const left = change("actor-a", [
      splice(title, { left: 0, right: 1, inserted: "X" }),
    ]);
    const right = change("actor-b", [
      splice(title, { left: 0, right: 1, inserted: "Y" }),
    ]);

    for (const arrival of [[left, right], [right, left]]) {
      const shared = runtime(`receiver-${arrival[0]?.changeId.actorId}`, initial);
      for (const candidate of arrival) {
        expect(shared.replica.ingest(bundle(shared, [candidate])))
          .toMatchObject({ ok: true });
      }
      expect(shared.document.value).toEqual({ title: "aXYb" });
      expect(shared.replica.status().suppressed).toEqual([]);
    }
  });

  test("deletes only captured atoms and retains a concurrent insertion", () => {
    const initial = { title: "abc" };
    const basis = runtime("basis", initial);
    const title = initialTextIds(basis, ["title"], "abc");
    const replacement = change("actor-a", [
      splice(title, {
        left: 0,
        right: 2,
        removed: [1],
        inserted: "X",
      }),
    ]);
    const concurrentInsert = change("actor-b", [
      splice(title, {
        left: 0,
        right: 2,
        inserted: "Y",
      }),
    ]);

    const first = runtime("receiver-a", initial);
    const second = runtime("receiver-b", initial);
    expect(first.replica.ingest(bundle(first, [
      replacement,
      concurrentInsert,
    ]))).toMatchObject({ ok: true });
    expect(second.replica.ingest(bundle(second, [
      concurrentInsert,
      replacement,
    ]))).toMatchObject({ ok: true });

    expect(first.document.value).toEqual({ title: "aXYc" });
    expect(second.document.value).toEqual(first.document.value);
  });

  test("makes concurrent exact-atom deletion idempotent", () => {
    const initial = { title: "abc" };
    const basis = runtime("basis", initial);
    const title = initialTextIds(basis, ["title"], "abc");
    const remove = (actorId: string) => change(actorId, [
      splice(title, {
        left: 0,
        right: 2,
        removed: [1],
      }),
    ]);
    const shared = runtime("receiver", initial);

    expect(shared.replica.ingest(bundle(shared, [
      remove("actor-a"),
      remove("actor-b"),
    ]))).toMatchObject({ ok: true });
    expect(shared.document.value).toEqual({ title: "ac" });
    expect(shared.replica.status().suppressed).toEqual([]);
  });

  test("uses lossless scalar units without normalization or surrogate splitting", () => {
    const initial = { title: "A😀B" };
    const shared = runtime("receiver", initial);
    const title = initialTextIds(shared, ["title"], "A😀B");
    expect(title.atoms).toHaveLength(3);
    const inserted = `e\u0301👩‍💻\ud800`;
    const unicodeChange = change("actor-a", [
      splice(title, {
        left: 0,
        right: 2,
        removed: [1],
        inserted,
      }),
    ]);

    expect(shared.replica.ingest(bundle(shared, [unicodeChange])))
      .toMatchObject({ ok: true });
    expect(shared.document.value).toEqual({ title: `A${inserted}B` });
    expect((shared.document.value as { title: string }).title).not.toBe(
      `A${inserted.normalize("NFC")}B`,
    );
  });

  test("derives one authored atom for a surrogate pair", () => {
    const initial = { title: "" };
    const shared = runtime("receiver", initial);
    const title = initialTextIds(shared, ["title"], "");
    const insertId = { actorId: "actor-a", counter: 1 } as const;
    const insert = change(insertId.actorId, [
      splice(title, {
        left: null,
        right: null,
        inserted: "😀",
      }),
    ]);
    const remove = change(
      "actor-a",
      [{
        kind: "text-splice",
        target: title.member,
        textNode: title.textNode,
        left: null,
        right: null,
        removed: [authoredTextAtomId(insertId, 0, 0)],
        inserted: "X",
      }],
      [insertId],
      2,
    );

    expect(shared.replica.ingest(bundle(shared, [remove])))
      .toMatchObject({
        ok: true,
        pending: [{ actorId: "actor-a", counter: 2 }],
      });
    expect(shared.replica.ingest(bundle(shared, [insert])))
      .toMatchObject({ ok: true });
    expect(shared.document.value).toEqual({ title: "X" });
    expect(shared.replica.status().pending).toEqual([]);
  });

  test("preserves text identity through an object rename", () => {
    const initial = { source: "ab" };
    const mover = runtime("actor-a", initial);
    const source = initialTextIds(mover, ["source"], "ab");
    expect(mover.document.commit([{
      op: "move",
      from: "/source",
      path: "/renamed",
    }])).toMatchObject({ ok: true });
    const textChange = change("actor-b", [
      splice(source, { left: 0, right: 1, inserted: "X" }),
    ]);

    const shared = runtime("receiver", initial);
    expect(shared.replica.ingest(bundle(shared, [
      ...mover.replica.exportBundle().changes,
      textChange,
    ]))).toMatchObject({ ok: true });
    expect(shared.document.value).toEqual({ renamed: "aXb" });
  });

  test("preserves scalar text identity when moving it to the root slot", () => {
    const initial = { source: "ab" };
    const mover = runtime("actor-a", initial);
    const source = initialTextIds(mover, ["source"], "ab");
    expect(mover.document.commit([{
      op: "move",
      from: "/source",
      path: "",
    }])).toMatchObject({ ok: true });
    const textChange = change("actor-b", [
      splice(source, { left: 0, right: 1, inserted: "X" }),
    ]);

    const shared = runtime("receiver", initial);
    expect(shared.replica.ingest(bundle(shared, [
      ...mover.replica.exportBundle().changes,
      textChange,
    ]))).toMatchObject({ ok: true });
    expect(shared.document.value).toBe("aXb");
    expect(shared.replica.status().suppressed).toEqual([]);
  });

  test("gives copied text a fresh generation", () => {
    const initial = { source: "ab" };
    const copier = runtime("actor-a", initial);
    const source = initialTextIds(copier, ["source"], "ab");
    expect(copier.document.commit([{
      op: "copy",
      from: "/source",
      path: "/copy",
    }])).toMatchObject({ ok: true });
    const textChange = change("actor-b", [
      splice(source, { left: 0, right: 1, inserted: "X" }),
    ]);

    const shared = runtime("receiver", initial);
    expect(shared.replica.ingest(bundle(shared, [
      ...copier.replica.exportBundle().changes,
      textChange,
    ]))).toMatchObject({ ok: true });
    expect(shared.document.value).toEqual({
      source: "aXb",
      copy: "ab",
    });
  });

  test("does not resurrect a deleted member through an old text generation", () => {
    const initial = { title: "ab" };
    const remover = runtime("actor-a", initial);
    const title = initialTextIds(remover, ["title"], "ab");
    expect(remover.document.commit([{
      op: "remove",
      path: "/title",
    }])).toMatchObject({ ok: true });
    const textChange = change("actor-b", [
      splice(title, { left: 0, right: 1, inserted: "X" }),
    ]);

    const shared = runtime("receiver", initial);
    expect(shared.replica.ingest(bundle(shared, [
      ...remover.replica.exportBundle().changes,
      textChange,
    ]))).toMatchObject({ ok: true });
    expect(shared.document.value).toEqual({});
    expect(shared.replica.status().suppressed).toMatchObject([{
      changeId: { actorId: "actor-b", counter: 1 },
      code: "text_target_deleted",
    }]);
  });

  test("lets an atomic set replace an older collaborative text generation", () => {
    const initial = { title: "ab" };
    const setter = runtime("actor-a", initial);
    const title = initialTextIds(setter, ["title"], "ab");
    expect(setter.document.commit([{
      op: "replace",
      path: "/title",
      value: "reset",
    }])).toMatchObject({ ok: true });
    const textChange = change("actor-b", [
      splice(title, { left: 0, right: 1, inserted: "X" }),
    ]);

    const shared = runtime("receiver", initial);
    expect(shared.replica.ingest(bundle(shared, [
      ...setter.replica.exportBundle().changes,
      textChange,
    ]))).toMatchObject({ ok: true });
    expect(shared.document.value).toEqual({ title: "reset" });
    expect(shared.replica.status().suppressed).toMatchObject([{
      changeId: { actorId: "actor-b", counter: 1 },
      code: "text_generation_mismatch",
    }]);
  });

  test("rejects malformed duplicate atom removals before changing state", () => {
    const initial = { title: "ab" };
    const shared = runtime("receiver", initial);
    const title = initialTextIds(shared, ["title"], "ab");
    const atom = title.atoms[0] as string;
    const malformed = {
      changeId: { actorId: "actor-a", counter: 1 },
      deps: [],
      ops: [{
        kind: "text-splice",
        target: title.member,
        textNode: title.textNode,
        left: null,
        right: title.atoms[1],
        removed: [atom, atom],
        inserted: "",
      }],
    };

    expect(shared.replica.ingest({
      epoch: shared.replica.epoch,
      changes: [malformed],
    })).toMatchObject({
      ok: false,
      code: "invalid_bundle",
    });
    expect(shared.document.value).toEqual(initial);
    expect(shared.replica.exportBundle().changes).toEqual([]);
  });
});

describe("collaborative text authoring helpers", () => {
  test("snapshots a pointer-resolved lazy string without promoting its state", () => {
    const shared = runtime("basis", { title: "A😀B" });
    const tree = createInitialTree(
      shared.document.value,
      shared.replica.epoch.baseDigest,
    );
    const snapshot = resolveTextSnapshot(tree, ["title"]);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) throw new Error(snapshot.reason);

    expect(snapshot.value.value).toBe("A😀B");
    expect(snapshot.value.atoms.map((atom) => atom.value)).toEqual([
      "A",
      "😀",
      "B",
    ]);
    expect(snapshot.value.atoms.map((atom) => atom.id)).toEqual([
      initialTextAtomId(snapshot.value.textNode, 0),
      initialTextAtomId(snapshot.value.textNode, 1),
      initialTextAtomId(snapshot.value.textNode, 2),
    ]);
    expect(tree.texts.get(snapshot.value.textNode)?.order).toBeUndefined();
    expect(tree.texts.get(snapshot.value.textNode)?.atoms).toBeUndefined();
    expect(Object.isFrozen(snapshot.value)).toBe(true);
    expect(Object.isFrozen(snapshot.value.atoms)).toBe(true);
    expect(Object.isFrozen(snapshot.value.atoms[0])).toBe(true);
  });

  test("plans one minimal scalar splice with stable Unicode boundaries", () => {
    const shared = runtime("basis", { title: "A😀B" });
    const tree = createInitialTree(
      shared.document.value,
      shared.replica.epoch.baseDigest,
    );
    const snapshot = resolveTextSnapshot(tree, ["title"]);
    if (!snapshot.ok) throw new Error(snapshot.reason);

    expect(createMinimalTextSplice(
      snapshot.value,
      "A😀e\u0301B",
    )).toEqual({
      left: snapshot.value.atoms[1]?.id,
      right: snapshot.value.atoms[2]?.id,
      removed: [],
      inserted: "e\u0301",
    });
    expect(createMinimalTextSplice(snapshot.value, "AXB")).toEqual({
      left: snapshot.value.atoms[0]?.id,
      right: snapshot.value.atoms[2]?.id,
      removed: [snapshot.value.atoms[1]?.id],
      inserted: "X",
    });
    expect(createMinimalTextSplice(snapshot.value, "A😀B")).toBeNull();
  });

  test("revalidates a stable MemberId after rename and distinguishes stale causes", () => {
    const initial = { title: "ab" };
    const shared = runtime("basis", initial);
    const initialTree = createInitialTree(
      shared.document.value,
      shared.replica.epoch.baseDigest,
    );
    const captured = resolveTextSnapshot(initialTree, ["title"]);
    if (!captured.ok) throw new Error(captured.reason);

    const renamed = compilePatchOperations(
      initialTree,
      [{ op: "move", from: "/title", path: "/renamed" }],
      { actorId: "actor-a", counter: 1 },
      0,
    );
    if (!renamed.ok) throw new Error(renamed.reason);
    expect(resolveTextMemberSnapshot(
      renamed.value.tree,
      captured.value.target,
      captured.value.textNode,
    )).toMatchObject({
      ok: true,
      value: {
        target: captured.value.target,
        textNode: captured.value.textNode,
        value: "ab",
      },
    });

    const deleted = compilePatchOperations(
      initialTree,
      [{ op: "remove", path: "/title" }],
      { actorId: "actor-a", counter: 1 },
      0,
    );
    if (!deleted.ok) throw new Error(deleted.reason);
    expect(resolveTextMemberSnapshot(
      deleted.value.tree,
      captured.value.target,
      captured.value.textNode,
    )).toMatchObject({
      ok: false,
      code: "text_target_deleted",
    });

    const reset = compilePatchOperations(
      initialTree,
      [{ op: "replace", path: "/title", value: "reset" }],
      { actorId: "actor-a", counter: 1 },
      0,
    );
    if (!reset.ok) throw new Error(reset.reason);
    expect(resolveTextMemberSnapshot(
      reset.value.tree,
      captured.value.target,
      captured.value.textNode,
    )).toMatchObject({
      ok: false,
      code: "text_generation_mismatch",
    });
  });

  test("keeps default replacement atomic and opts into text-splice explicitly", () => {
    const shared = runtime("basis", { title: "ab" });
    const tree = createInitialTree(
      shared.document.value,
      shared.replica.epoch.baseDigest,
    );
    const patch = [{
      op: "replace" as const,
      path: "/title",
      value: "aXb",
    }];
    const atomic = compilePatchOperations(
      tree,
      patch,
      { actorId: "actor-a", counter: 1 },
      0,
    );
    const collaborative = compilePatchOperations(
      tree,
      patch,
      { actorId: "actor-a", counter: 1 },
      0,
      { collaborativeText: true },
    );
    if (!atomic.ok) throw new Error(atomic.reason);
    if (!collaborative.ok) throw new Error(collaborative.reason);

    expect(atomic.value.ops).toMatchObject([{ kind: "set" }]);
    expect(collaborative.value.ops).toMatchObject([{
      kind: "text-splice",
      inserted: "X",
      removed: [],
    }]);
    expect(projectTree(collaborative.value.tree, () => false)).toMatchObject({
      ok: true,
      value: { title: "aXb" },
    });
  });

  test("compiles add-overwrite and a sequential mixed batch through visible atoms", () => {
    const shared = runtime("basis", { title: "ab" });
    const tree = createInitialTree(
      shared.document.value,
      shared.replica.epoch.baseDigest,
    );
    const compiled = compilePatchOperations(
      tree,
      [
        { op: "replace", path: "/title", value: "a😀b" },
        { op: "add", path: "/draft", value: "x" },
        { op: "replace", path: "/draft", value: "xy" },
        { op: "add", path: "/title", value: "a😀Xb" },
      ],
      { actorId: "actor-a", counter: 1 },
      0,
      { collaborativeText: true },
    );
    if (!compiled.ok) throw new Error(compiled.reason);

    expect(compiled.value.ops.map((operation) => operation.kind)).toEqual([
      "text-splice",
      "insert",
      "text-splice",
      "text-splice",
    ]);
    expect(compiled.value.ops[3]).toMatchObject({
      kind: "text-splice",
      left: authoredTextAtomId(
        { actorId: "actor-a", counter: 1 },
        0,
        0,
      ),
      inserted: "X",
    });
    expect(projectTree(compiled.value.tree, () => false)).toMatchObject({
      ok: true,
      value: {
        title: "a😀Xb",
        draft: "xy",
      },
    });
  });

  test("keeps copy overwrite atomic even in collaborative text mode", () => {
    const shared = runtime("basis", {
      source: "source",
      target: "target",
    });
    const tree = createInitialTree(
      shared.document.value,
      shared.replica.epoch.baseDigest,
    );
    const compiled = compilePatchOperations(
      tree,
      [{ op: "copy", from: "/source", path: "/target" }],
      { actorId: "actor-a", counter: 1 },
      0,
      { collaborativeText: true },
    );
    if (!compiled.ok) throw new Error(compiled.reason);

    expect(compiled.value.ops).toMatchObject([{ kind: "set" }]);
    expect(projectTree(compiled.value.tree, () => false)).toMatchObject({
      ok: true,
      value: {
        source: "source",
        target: "source",
      },
    });
  });
});
