import { createJSONDocument, type JSONPatchOperation } from "@interactive-os/json-document";
import { describe, expect, test, vi } from "vitest";
import { createEditingSession } from "../src/session.js";

describe("selection-aware editing history", () => {
  test("lowers aliased selection points while metadata and history remain detached", () => {
    const document = createJSONDocument({ n: 0 });
    const point = { offset: 1 };
    const session = createEditingSession({ document, selection: { anchor: point, focus: point } });
    const retained = session.snapshot;
    const after = { offset: 2 };
    const result = session.apply({
      operations: [{ op: "replace", path: "/n", value: 1 }],
      selectionAfter: { anchor: after, focus: after }, origin: "edit",
    });
    expect(result.ok).toBe(true);
    point.offset = 9;
    after.offset = 9;
    expect(retained.selection).toEqual({ anchor: { offset: 1 }, focus: { offset: 1 } });
    expect(result.ok && result.change?.metadata?.editing).toMatchObject({
      selectionBefore: { anchor: { offset: 1 }, focus: { offset: 1 } },
      selectionAfter: { anchor: { offset: 2 }, focus: { offset: 2 } },
    });
    expect(session.undo()).toMatchObject({ ok: true, snapshot: { selection: retained.selection } });
    expect(session.redo()).toMatchObject({ ok: true, snapshot: { selection: { anchor: { offset: 2 } } } });
  });

  test("ignored local history skips inverse reads but preserves canonical failures and redo", () => {
    const inner = createJSONDocument({ n: 0, ignored: 0 });
    const at = vi.fn(inner.at);
    const document = { ...inner, get value() { return inner.value; }, at };
    const session = createEditingSession({ document, selection: null });
    session.apply({ operations: [{ op: "replace", path: "/n", value: 1 }], selectionAfter: null, origin: "record" });
    session.undo();
    at.mockClear();
    const operations: JSONPatchOperation[] = [
      { op: "replace", path: "/ignored", value: 1 },
      { op: "replace", path: "/ignored", value: 2 },
    ];
    expect(session.apply({ operations, selectionAfter: null, origin: "ignore", history: "ignore" }).ok).toBe(true);
    expect(at).not.toHaveBeenCalled();
    const before = session.snapshot;
    const invalid: JSONPatchOperation[] = [{ op: "remove", path: "/missing" }, { op: "test", path: "/n", value: 99 }];
    expect(session.apply({ operations: invalid, selectionAfter: null, origin: "ignore", history: "ignore" }))
      .toEqual(inner.validatePatch(invalid));
    expect(session.snapshot).toEqual(before);
    expect(session.redo().ok).toBe(true);
    expect(inner.value).toEqual({ n: 1, ignored: 2 });
  });

  test("preserves step order in a large mixed inverse and a long private history", () => {
    const document = createJSONDocument({ source: { value: "kept" }, destination: "overwritten", values: Array(300).fill(0) });
    const session = createEditingSession({ document, selection: null });
    const initial = document.value;
    const operations: JSONPatchOperation[] = [
      { op: "move", from: "/source", path: "/destination" },
      ...Array.from({ length: 300 }, (_, index): JSONPatchOperation => ({ op: "replace", path: `/values/${index}`, value: index + 1 })),
    ];
    expect(session.apply({ operations, selectionAfter: null, origin: "batch" }).ok).toBe(true);
    const changed = document.value;
    expect(session.undo().ok).toBe(true);
    expect(document.value).toEqual(initial);
    expect(session.redo().ok).toBe(true);
    expect(document.value).toEqual(changed);
    for (let value = 1; value <= 200; value++) {
      expect(session.apply({ operations: [{ op: "replace", path: "/values/0", value: value + 1 }], selectionAfter: null, origin: "history" }).ok).toBe(true);
    }
    for (let index = 0; index < 200; index++) expect(session.undo().ok).toBe(true);
    expect(document.value).toEqual(changed);
    for (let index = 0; index < 200; index++) expect(session.redo().ok).toBe(true);
    expect(document.at("/values/0")).toMatchObject({ ok: true, value: 201 });
  });

  test.each([false, true])("reconciles external selection once before publication (observed=%s)", (observed) => {
    const document = createJSONDocument({ text: "long" });
    let reconciles = 0;
    const session = createEditingSession({
      document,
      selection: { offset: 4 },
      reconcileSelection(selection, value) {
        reconciles++;
        return { offset: Math.min(selection.offset, (value as { text: string }).text.length) };
      },
    });
    const seen: number[] = [];
    const unsubscribe = observed ? session.subscribe((snapshot) => seen.push(snapshot.selection.offset)) : () => {};
    session.apply({ operations: [{ op: "replace", path: "/text", value: "longer" }], selectionAfter: { offset: 6 }, origin: "local" });
    expect(reconciles).toBe(0);
    document.commit([{ op: "replace", path: "/text", value: "a" }]);
    expect(session.snapshot).toMatchObject({ selection: { offset: 1 }, canUndo: false, revision: 2 });
    expect(reconciles).toBe(1);
    expect(session.snapshot.selection.offset).toBe(1);
    expect(reconciles).toBe(1);
    if (observed) expect(seen).toEqual([6, 1]);
    unsubscribe();
  });

  test("isolates observer failures from committed results and later observers", () => {
    const document = createJSONDocument({ n: 0 });
    const session = createEditingSession({ document, selection: null });
    const seen: number[] = [];
    session.subscribe(() => { throw new Error("observer failure"); });
    session.subscribe((snapshot) => seen.push(snapshot.revision));
    expect(session.apply({
      operations: [{ op: "replace", path: "/n", value: 1 }],
      selectionAfter: null, origin: "edit",
    })).toMatchObject({ ok: true, snapshot: { canUndo: true } });
    expect(document.value).toEqual({ n: 1 });
    expect(seen).toEqual([1]);
  });

  test("queues reentrant notifications in revision order", () => {
    const session = createEditingSession({ document: createJSONDocument({ n: 0 }), selection: null });
    const seen: number[] = [];
    session.subscribe((snapshot) => { if (snapshot.revision === 1) session.select(null); });
    session.subscribe((snapshot) => seen.push(snapshot.revision));
    const result = session.apply({
      operations: [{ op: "replace", path: "/n", value: 1 }],
      selectionAfter: null, origin: "edit",
    });
    expect(seen).toEqual([1, 2]);
    expect(result).toMatchObject({ ok: true, snapshot: { revision: 1 } });
    expect(session.snapshot.revision).toBe(2);
  });

  test("owns retained snapshot selections independently of state and history", () => {
    const session = createEditingSession({
      document: createJSONDocument({ n: 0 }), selection: { ids: ["a"] },
    });
    const initial = session.snapshot;
    try { initial.selection.ids[0] = "poison"; } catch { /* immutable snapshot */ }
    expect(session.snapshot.selection.ids).toEqual(["a"]);
    const result = session.apply({
      operations: [{ op: "replace", path: "/n", value: 1 }],
      selectionAfter: { ids: ["b"] }, origin: "edit",
    });
    if (!result.ok) throw new Error(result.code);
    try { result.snapshot.selection.ids[0] = "poison"; } catch { /* immutable snapshot */ }
    expect(session.undo()).toMatchObject({ ok: true, snapshot: { selection: { ids: ["a"] } } });
    expect(session.redo()).toMatchObject({ ok: true, snapshot: { selection: { ids: ["b"] } } });
    expect(initial.selection.ids).toEqual(["a"]);
  });

  test.each([
    { name: "object add replaces an existing member", value: { title: "before" }, operations: [{ op: "add", path: "/title", value: "after" }] },
    { name: "successive removals use intermediate values", value: { items: ["a", "b", "c"] }, operations: [{ op: "remove", path: "/items/0" }, { op: "remove", path: "/items/0" }] },
    { name: "insert then replace follows the shifted index", value: { items: ["a", "b"] }, operations: [{ op: "add", path: "/items/0", value: "x" }, { op: "replace", path: "/items/1", value: "A" }] },
    { name: "root add restores the document", value: { title: "before" }, operations: [{ op: "add", path: "", value: { title: "after" } }] },
  ] as const)("round trips $name", ({ value, operations }) => {
    const document = createJSONDocument(value);
    const session = createEditingSession({ document, selection: null });
    expect(session.apply({ operations, selectionAfter: null, origin: "edit" }).ok).toBe(true);
    const after = document.value;
    expect(session.undo().ok).toBe(true);
    expect(document.value).toEqual(value);
    expect(session.redo().ok).toBe(true);
    expect(document.value).toEqual(after);
  });

  test("a history group restores changes to every affected path", () => {
    const document = createJSONDocument({ left: 0, right: 0 });
    const session = createEditingSession({ document, selection: null });
    for (const path of ["/left", "/right"]) {
      session.apply({ operations: [{ op: "replace", path, value: 1 }], selectionAfter: null, origin: "edit", historyGroup: "both" });
    }
    expect(session.undo().ok).toBe(true);
    expect(document.value).toEqual({ left: 0, right: 0 });
    expect(session.redo().ok).toBe(true);
    expect(document.value).toEqual({ left: 1, right: 1 });
  });

  test("fresh snapshot copies preserve local history until the value changes", () => {
    const inner = createJSONDocument({ title: "before" });
    const document = { ...inner, get value() { return structuredClone(inner.value); } };
    const session = createEditingSession({ document, selection: null });
    const revisions: number[] = [];
    const unsubscribe = session.subscribe((snapshot) => revisions.push(snapshot.revision));
    session.apply({ operations: [{ op: "replace", path: "/title", value: "after" }], selectionAfter: null, origin: "edit" });
    expect(session.snapshot.canUndo).toBe(true);
    expect(session.snapshot.revision).toBe(1);
    expect(session.undo().ok).toBe(true);
    expect(inner.value).toEqual({ title: "before" });
    inner.commit([{ op: "replace", path: "/title", value: "external" }]);
    expect(session.snapshot.canRedo).toBe(false);
    expect(revisions).toEqual([1, 2, 3]);
    unsubscribe();
  });

  test("publishes external document changes and invalidates local history", () => {
    const document = createJSONDocument({ title: "Draft" });
    const session = createEditingSession<{ readonly current: string | null }>({
      document,
      selection: { current: null },
    });
    const revisions: number[] = [];
    session.subscribe((snapshot) => revisions.push(snapshot.revision));

    session.apply({
      operations: [{ op: "replace", path: "/title", value: "Local" }],
      selectionAfter: { current: null },
      origin: "local",
    });
    expect(session.snapshot.canUndo).toBe(true);

    document.commit([{ op: "replace", path: "/title", value: "External" }]);

    expect(session.snapshot).toMatchObject({
      value: { title: "External" },
      revision: 2,
      canUndo: false,
      canRedo: false,
    });
    expect(revisions).toEqual([1, 2]);
  });

  test("stores document mutation with before/after selection and replays forward patches", () => {
    const session = createEditingSession<{ readonly current: string | null }>({
      document: createJSONDocument({ items: ["a", "b"] }),
      selection: { current: "a" },
    });

    session.apply({
      operations: [{ op: "replace", path: "/items/0", value: "A" }],
      selectionAfter: { current: "b" },
      origin: "rename",
    });
    expect(session.snapshot).toMatchObject({
      value: { items: ["A", "b"] },
      selection: { current: "b" },
      canUndo: true,
    });

    session.undo();
    expect(session.snapshot).toMatchObject({
      value: { items: ["a", "b"] },
      selection: { current: "a" },
      canRedo: true,
    });

    session.redo();
    expect(session.snapshot).toMatchObject({
      value: { items: ["A", "b"] },
      selection: { current: "b" },
    });
  });

  test("inverts a leaf replace without cloning the whole document into history", () => {
    const inner = createJSONDocument({
      items: Array.from({ length: 32 }, (_, index) => ({ id: `item-${index}`, title: "Draft" })),
    });
    const committed: Array<ReadonlyArray<{ readonly op: string; readonly path: string }>> = [];
    const document = {
      get value() { return inner.value; },
      at: inner.at.bind(inner),
      query: inner.query.bind(inner),
      validatePatch: inner.validatePatch.bind(inner),
      subscribe: inner.subscribe.bind(inner),
      commit(operations: Parameters<typeof inner.commit>[0], options?: Parameters<typeof inner.commit>[1]) {
        committed.push(operations.map((operation) => ({ op: operation.op, path: operation.path })));
        return inner.commit(operations, options);
      },
    };
    const session = createEditingSession<{ readonly current: string | null }>({
      document,
      selection: { current: "item-16" },
    });
    session.apply({
      operations: [{ op: "replace", path: "/items/16/title", value: "Ready" }],
      selectionAfter: { current: "item-16" },
      origin: "rename",
    });
    expect(session.undo().ok).toBe(true);
    expect(document.value).toMatchObject({ items: expect.arrayContaining([{ id: "item-16", title: "Draft" }]) });
    expect((document.value as { items: Array<{ title: string }> }).items[16]).toEqual({ id: "item-16", title: "Draft" });
    expect(committed.at(-1)).toEqual([{ op: "replace", path: "/items/16/title" }]);
  });

  test("resolves an appended array index before recording its inverse", () => {
    const session = createEditingSession<{ readonly current: string | null }>({
      document: createJSONDocument({ items: ["a"] }),
      selection: { current: "a" },
    });
    session.apply({
      operations: [{ op: "add", path: "/items/-", value: "b" }],
      selectionAfter: { current: "b" },
      origin: "append",
    });
    expect(session.undo().ok).toBe(true);
    expect(session.snapshot.value).toEqual({ items: ["a"] });
    expect(session.redo().ok).toBe(true);
    expect(session.snapshot.value).toEqual({ items: ["a", "b"] });
  });

  test("does not record selection-only or semantic no-op changes", () => {
    const session = createEditingSession<{ readonly current: string | null }>({
      document: createJSONDocument({ name: "alpha" }),
      selection: { current: "name" },
    });
    session.select({ current: null });
    session.apply({
      operations: [{ op: "replace", path: "/name", value: "alpha" }],
      selectionAfter: { current: "name" },
      origin: "no-op",
    });
    expect(session.snapshot.canUndo).toBe(false);
  });

  test("reconciles stale selection after an external value change without history", () => {
    const session = createEditingSession<{
      readonly keys: readonly string[];
      readonly primaryKey: string | null;
    }>({
      document: createJSONDocument({ items: ["a"] }),
      selection: { keys: ["missing"], primaryKey: "missing" },
    });
    const snapshot = session.reconcile((selection) => ({
      ...selection,
      keys: [],
      primaryKey: null,
    }));
    expect(snapshot.selection).toEqual({ keys: [], primaryKey: null });
    expect(snapshot.canUndo).toBe(false);
    expect(session.reconcile((selection) => selection).revision).toBe(snapshot.revision);
  });
});


describe("local history is independent of UI observation", () => {
  test.each(["active", "absent", "released", "resubscribed"])("invalidates undo and redo after an external value round trip (%s)", (observation) => {
    for (const direction of ["undo", "redo"] as const) {
      const document = createJSONDocument({ n: 0 });
      const session = createEditingSession<number>({ document, selection: 0 });
      const release = observation === "absent" ? () => {} : session.subscribe(() => {});
      expect(session.apply({ operations: [{ op: "replace", path: "/n", value: 1 }], selectionAfter: 1, origin: "local" }).ok).toBe(true);
      if (direction === "redo") expect(session.undo().ok).toBe(true);
      if (observation === "released" || observation === "resubscribed") release();
      const before = session.snapshot;
      expect(before[direction === "undo" ? "canUndo" : "canRedo"]).toBe(true);
      expect(document.commit([{ op: "replace", path: "/n", value: 2 }]).ok).toBe(true);
      expect(document.commit([{ op: "replace", path: "/n", value: direction === "undo" ? 1 : 0 }]).ok).toBe(true);
      const again = observation === "resubscribed" ? session.subscribe(() => {}) : () => {};
      expect(session.snapshot).toMatchObject({ value: before.value, canUndo: false, canRedo: false });
      expect(session[direction]()).toMatchObject({ ok: false, code: "history.empty" });
      expect(document.value).toEqual(before.value);
      release();
      again();
    }
  });

  test("fresh copies and document no-ops retain unobserved history", () => {
    const inner = createJSONDocument({ n: 0 });
    const document = { ...inner, get value() { return structuredClone(inner.value); } };
    const session = createEditingSession({ document, selection: null });
    expect(session.apply({ operations: [{ op: "replace", path: "/n", value: 1 }], selectionAfter: null, origin: "local" }).ok).toBe(true);
    inner.commit([{ op: "replace", path: "/n", value: 1 }]);
    expect(session.snapshot).toMatchObject({ revision: 1, canUndo: true });
    expect(session.undo().ok).toBe(true);
    inner.commit([{ op: "replace", path: "/n", value: 0 }]);
    expect(session.snapshot.canRedo).toBe(true);
    expect(session.redo().ok).toBe(true);
  });

  test("catches an external round trip authored by a commit subscriber", () => {
    const document = createJSONDocument({ n: 0 });
    let written = false;
    document.subscribe(() => {
      if (written) return;
      written = true;
      document.commit([{ op: "replace", path: "/n", value: 2 }]);
      document.commit([{ op: "replace", path: "/n", value: 1 }]);
    });
    const session = createEditingSession({ document, selection: null });
    expect(session.apply({ operations: [{ op: "replace", path: "/n", value: 1 }], selectionAfter: null, origin: "local" }).ok).toBe(true);
    expect(session.snapshot).toMatchObject({ value: { n: 1 }, canUndo: false, canRedo: false });
    expect(session.undo()).toMatchObject({ ok: false, code: "history.empty" });
  });
});


test("retains an editor-authored step during an external notification", () => {
  const document = createJSONDocument({ n: 0 });
  const session = createEditingSession({ document, selection: null });
  session.apply({ operations: [{ op: "replace", path: "/n", value: 1 }], selectionAfter: null, origin: "initial" });
  const release = session.subscribe((snapshot) => {
    if ((snapshot.value as { n: number }).n === 2) {
      expect(session.apply({ operations: [{ op: "replace", path: "/n", value: 3 }], selectionAfter: null, origin: "follow-up" }).ok).toBe(true);
    }
  });
  document.commit([{ op: "replace", path: "/n", value: 2 }]);
  release();
  expect(session.snapshot).toMatchObject({ value: { n: 3 }, canUndo: true });
  expect(session.undo()).toMatchObject({ ok: true, snapshot: { value: { n: 2 } } });
});

test("keeps only a one-shot history marker after UI release", () => {
  const inner = createJSONDocument({ n: 0 });
  let connections = 0;
  const document = { ...inner, get value() { return inner.value; },
    subscribe(listener: Parameters<typeof inner.subscribe>[0]) {
      connections++;
      const release = inner.subscribe(listener);
      return () => { connections--; release(); };
    },
  };
  const session = createEditingSession({ document, selection: null });
  expect(connections).toBe(0);
  const release = session.subscribe(() => {});
  for (const n of [1, 2, 3]) {
    session.apply({ operations: [{ op: "replace", path: "/n", value: n }], selectionAfter: null, origin: "local" });
    expect(connections).toBe(2);
  }
  release();
  expect(connections).toBe(1);
  document.commit([{ op: "replace", path: "/n", value: 4 }]);
  expect(connections).toBe(0);
  document.commit([{ op: "replace", path: "/n", value: 3 }]);
  expect(session.snapshot.canUndo).toBe(false);
  expect(connections).toBe(0);
});
