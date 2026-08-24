import { createJSONDocument } from "@interactive-os/json-document";
import { describe, expect, test } from "vitest";
import { createEditingSession } from "../src/session.js";

describe("selection-aware editing history", () => {
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
