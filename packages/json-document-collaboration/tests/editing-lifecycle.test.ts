import { type JSONValue } from "@interactive-os/json-document";
import { createEditingSession, type EditingSnapshot } from "@interactive-os/json-document-editing";
import { describe, expect, test } from "vitest";
import { createHistoryRuntime } from "../src/history-index.js";
import { createCollaborationEditingHistory } from "../src/editing-index.js";

const initial = { n: 0, other: 0 };
function runtime(actorId = "local") {
  return createHistoryRuntime(initial, { actorId, epochId: "editing-lifecycle", ruleset: { id: "review", digest: "1" } });
}

test("an earlier snapshot reader cannot swallow document or causal-only history notifications", () => {
  const local = runtime();
  const remote = runtime("remote");
  const session = createEditingSession({ document: local.document, selection: null, history: createCollaborationEditingHistory(local) });
  local.document.subscribe(() => { void session.snapshot; });
  local.replica.subscribe(() => { void session.snapshot; });
  const seen: number[] = [];
  session.subscribe((snapshot) => seen.push(snapshot.revision));
  local.document.commit([{ op: "replace", path: "/n", value: 1 }]);
  remote.replica.ingest(local.replica.exportBundle());
  remote.document.commit([{ op: "replace", path: "/n", value: 2 }]);
  local.replica.ingest(remote.replica.exportBundle());
  expect(local.history.undo()).toMatchObject({ ok: true, didChangeDocument: false });
  expect(seen).toEqual([1, 2, 3]);
});

test("history results retain their own immutable change and status before subscriber writes", () => {
  const local = runtime();
  local.document.commit([{ op: "replace", path: "/n", value: 1 }]);
  let written = false;
  local.replica.subscribe(() => {
    if (written) return;
    written = true;
    local.document.commit([{ op: "replace", path: "/other", value: 99 }]);
  });
  const undone = local.history.undo();
  expect(undone).toMatchObject({
    ok: true, didChangeDocument: true,
    change: { applied: [{ op: "replace", path: "/n", value: 0 }] },
    status: { revision: 2, undoTarget: null, redoTarget: { actorId: "local", counter: 1 }, canUndo: false, canRedo: true },
  });
  if (!undone.ok) throw new Error(undone.code);
  expect(Object.isFrozen(undone)).toBe(true);
  expect(Object.isFrozen(undone.change?.applied)).toBe(true);
  expect(Object.isFrozen(undone.status)).toBe(true);
  expect(Object.isFrozen(undone.status.redoTarget)).toBe(true);
  expect(local.history.status()).toMatchObject({ revision: 3, redoTarget: null });
});

test("completes a subscriber's pending selection restore before synchronizing later state", () => {
  const local = runtime();
  const remote = runtime("remote");
  let rejects = false;
  const session = createEditingSession<number>({
    document: local.document, selection: 0, history: createCollaborationEditingHistory(local),
    reconcileSelection(selection) {
      if (rejects) {
        rejects = false;
        throw new Error("selection failed once");
      }
      return selection;
    },
  });
  session.apply({ operations: [{ op: "replace", path: "/n", value: 1 }], selectionAfter: 1, origin: "local" });
  const seen: EditingSnapshot<number>[] = [];
  let failure: unknown;
  session.subscribe((snapshot) => {
    seen.push(snapshot);
    if (snapshot.revision !== 2) return;
    rejects = true;
    try { session.undo(); } catch (error) { failure = error; }
  });
  remote.replica.ingest(local.replica.exportBundle());
  remote.document.commit([{ op: "replace", path: "/other", value: 2 }]);
  local.replica.ingest(remote.replica.exportBundle());
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).toBe("selection failed once");
  expect(session.snapshot).toMatchObject({ value: { n: 0, other: 2 }, selection: 0, revision: 3, canRedo: true });
  expect(seen.map(({ revision, selection }) => [revision, selection])).toEqual([[2, 1], [3, 0]]);
});

test("releases both connections across resubscription and editor recreation", () => {
  const local = runtime();
  const owner = createCollaborationEditingHistory(local);
  let documentConnections = 0;
  let historyConnections = 0;
  const document = {
    ...local.document,
    get value() { return local.document.value; },
    subscribe(listener: Parameters<typeof local.document.subscribe>[0]) {
      documentConnections++;
      const release = local.document.subscribe(listener);
      return () => { documentConnections--; release(); };
    },
  };
  const history = {
    ...owner,
    subscribe(listener: () => void) {
      historyConnections++;
      const release = owner.subscribe(listener);
      return () => { historyConnections--; release(); };
    },
  };
  const session = createEditingSession({ document, history, selection: 0 });
  const seen: number[] = [];
  const listener = (snapshot: EditingSnapshot<number>) => seen.push(snapshot.revision);
  const oldRelease = session.subscribe(listener);
  const secondRelease = session.subscribe(() => {});
  oldRelease();
  expect([documentConnections, historyConnections]).toEqual([1, 1]);
  secondRelease();
  expect([documentConnections, historyConnections]).toEqual([0, 0]);
  const newRelease = session.subscribe(listener);
  oldRelease();
  local.document.commit([{ op: "replace", path: "/n", value: 1 }]);
  expect(seen).toEqual([1]);
  newRelease();
  newRelease();
  expect([documentConnections, historyConnections]).toEqual([0, 0]);
  const recreated = createEditingSession({ document, history, selection: 7 });
  expect(recreated.undo()).toMatchObject({ ok: true, snapshot: { selection: 7, value: initial } });
  expect([documentConnections, historyConnections]).toEqual([0, 0]);
  expect(session.snapshot.value).toEqual(initial);
  expect(seen).toEqual([1]);
});

describe.each([true, false])("external history (observed: %s)", (observed) => {
  describe.each(["undo", "redo"] as const)("%s attribution", (direction) => {
    test.each([true, false])("separates a replica subscriber write (history-only: %s)", (historyOnly) => {
      const local = runtime();
      const session = createEditingSession<number>({ document: local.document, selection: 0, history: createCollaborationEditingHistory(local) });
      const seen: EditingSnapshot<number>[] = [];
      if (observed) session.subscribe((snapshot) => seen.push(snapshot));
      session.apply({ operations: [{ op: "replace", path: "/n", value: 1 }], selectionAfter: 1, origin: "local" });
      if (historyOnly) {
        const remote = runtime("remote");
        remote.replica.ingest(local.replica.exportBundle());
        remote.document.commit([{ op: "replace", path: "/n", value: 2 }]);
        local.replica.ingest(remote.replica.exportBundle());
      }
      if (direction === "redo") expect(session.undo().ok).toBe(true);
      const before = session.snapshot;
      seen.length = 0;
      let written = false;
      local.replica.subscribe(() => {
        if (written) return;
        written = true;
        local.document.commit([{ op: "replace", path: "/other", value: 99 }]);
      });
      const result = session[direction]();
      const ownValue = { n: historyOnly ? 2 : direction === "undo" ? 0 : 1, other: 0 };
      expect(result).toMatchObject({ ok: true, snapshot: {
        value: ownValue, selection: direction === "undo" ? 0 : 1,
        revision: before.revision + 1, canUndo: direction === "redo", canRedo: direction === "undo",
      } });
      if (!result.ok) throw new Error(result.code);
      if (historyOnly) expect(result.change).toBeUndefined();
      else expect(result.change?.applied).toEqual([{ op: "replace", path: "/n", value: ownValue.n }]);
      expect(session.snapshot).toMatchObject({ value: { ...ownValue, other: 99 }, revision: before.revision + 2, canUndo: true, canRedo: false });
      if (observed) expect(seen.map((snapshot) => snapshot.value)).toEqual([ownValue, { ...ownValue, other: 99 }]);
    });
  });

  test.each([
    { direction: "undo", historyOnly: true }, { direction: "undo", historyOnly: false },
    { direction: "redo", historyOnly: true }, { direction: "redo", historyOnly: false },
  ] as const)("recovers selection after committed $direction without repeating history (history-only: $historyOnly)", ({ direction, historyOnly }) => {
    const local = runtime();
    let rejects = false;
    const session = createEditingSession<number>({
      document: local.document, selection: 0, history: createCollaborationEditingHistory(local),
      reconcileSelection(selection) {
        if (rejects) throw new Error("selection failed");
        return selection;
      },
    });
    const seen: JSONValue[] = [];
    if (observed) session.subscribe((snapshot) => seen.push(snapshot.selection));
    session.apply({ operations: [{ op: "replace", path: "/n", value: 1 }], selectionAfter: 1, origin: "local" });
    if (historyOnly) {
      const remote = runtime("remote");
      remote.replica.ingest(local.replica.exportBundle());
      remote.document.commit([{ op: "replace", path: "/n", value: 2 }]);
      local.replica.ingest(remote.replica.exportBundle());
    }
    if (direction === "redo") expect(session.undo().ok).toBe(true);
    const before = session.snapshot;
    rejects = true;
    expect(() => session[direction]()).toThrow("selection failed");
    const committedHistory = local.history.status();
    expect(direction === "undo" ? committedHistory.redoTarget : committedHistory.undoTarget).not.toBeNull();
    expect(() => session.snapshot).toThrow("selection failed");
    expect(() => session.undo()).toThrow("selection failed");
    expect(() => session.redo()).toThrow("selection failed");
    expect(local.history.status()).toEqual(committedHistory);
    rejects = false;
    const restoredSelection = direction === "undo" ? 0 : 1;
    expect(session.snapshot).toMatchObject({ selection: restoredSelection, revision: before.revision + 1, canUndo: direction === "redo", canRedo: direction === "undo" });
    if (observed) expect(seen.at(-1)).toBe(restoredSelection);
    expect(session[direction === "undo" ? "redo" : "undo"]()).toMatchObject({ ok: true, snapshot: { selection: 1 - restoredSelection } });
  });
});
