import { createJSONDocument, type JSONValue } from "@interactive-os/json-document";
import { describe, expect, test } from "vitest";
import { createEditingSession } from "../src/session.js";

describe("editing observation and recovery", () => {
  test.each(["before", "after"])("publishes an external change despite a snapshot reader (%s)", (order) => {
    const document = createJSONDocument({ n: 0 });
    const session = createEditingSession({ document, selection: null });
    const seen: number[] = [];
    const reads: JSONValue[] = [];
    const read = () => { reads.push(session.snapshot.value); };
    if (order === "before") document.subscribe(read);
    session.subscribe((snapshot) => seen.push(snapshot.revision));
    if (order === "after") document.subscribe(read);
    document.commit([{ op: "replace", path: "/n", value: 1 }]);
    expect(seen).toEqual([1]);
    expect(reads).toEqual([{ n: 1 }]);
  });

  test("keeps revisions ordered when a snapshot reader triggers a reentrant edit", () => {
    const document = createJSONDocument({ n: 0 });
    const session = createEditingSession({ document, selection: null });
    document.subscribe(() => { void session.snapshot; });
    const seen: number[] = [];
    session.subscribe((snapshot) => { if (snapshot.revision === 1) session.select(null); });
    session.subscribe((snapshot) => seen.push(snapshot.revision));
    document.commit([{ op: "replace", path: "/n", value: 1 }]);
    expect(seen).toEqual([1, 2]);
  });

  describe.each([true, false])("callback failure (observed: %s)", (observed) => {
    test.each(["map", "reconcile"])("retries %s from the last coherent selection without applying stale history", (failing) => {
      const document = createJSONDocument({ n: 0 });
      let rejects = true;
      const inputs: number[] = [];
      const session = createEditingSession<number>({
        document, selection: 0,
        mapSelection(selection, { after }) {
          inputs.push(selection);
          if (failing === "map" && rejects && (after as { n: number }).n === 2) throw new Error("selection failed");
          return selection + 10;
        },
        reconcileSelection(selection, value) {
          if (failing === "reconcile" && rejects && (value as { n: number }).n === 2) throw new Error("selection failed");
          return selection;
        },
      });
      const seen: number[] = [];
      if (observed) session.subscribe((snapshot) => seen.push(snapshot.revision));
      session.apply({ operations: [{ op: "replace", path: "/n", value: 1 }], selectionAfter: 1, origin: "local" });
      const retained = session.snapshot;
      expect(document.commit([{ op: "replace", path: "/n", value: 2 }]).ok).toBe(true);
      for (const operation of [
        () => session.snapshot,
        () => session.undo(),
        () => session.redo(),
        () => session.select(99),
        () => session.reconcile(() => 99),
        () => session.apply({ operations: [{ op: "replace" as const, path: "/n", value: 99 }], selectionAfter: 99, origin: "blocked" }),
      ]) expect(operation).toThrow("selection failed");
      expect(document.value).toEqual({ n: 2 });
      expect(retained).toMatchObject({ value: { n: 1 }, selection: 1, revision: 1 });
      if (observed) expect(seen).toEqual([1]);
      rejects = false;
      expect(session.snapshot).toMatchObject({ value: { n: 2 }, selection: 11, revision: 2, canUndo: false });
      expect(inputs.every((selection) => selection === 1)).toBe(true);
      expect(session.undo()).toMatchObject({ ok: false, code: "history.empty" });
      if (observed) expect(seen).toEqual([1, 2]);
    });
  });

  test("does not reject its completed edit when follow-up external selection mapping fails", () => {
    const document = createJSONDocument({ n: 0 });
    let written = false;
    document.subscribe(() => {
      if (written) return;
      written = true;
      document.commit([{ op: "replace", path: "/n", value: 2 }]);
    });
    const session = createEditingSession({
      document, selection: null,
      reconcileSelection(selection, value) {
        if ((value as { n: number }).n === 2) throw new Error("external selection failed");
        return selection;
      },
    });
    expect(session.apply({ operations: [{ op: "replace", path: "/n", value: 1 }], selectionAfter: null, origin: "local" }))
      .toMatchObject({ ok: true, snapshot: { value: { n: 1 }, revision: 1 } });
    expect(() => session.snapshot).toThrow("external selection failed");
    expect(() => session.undo()).toThrow("external selection failed");
    expect(document.value).toEqual({ n: 2 });
  });

  test("an old unsubscribe cannot remove a later subscription with the same callback", () => {
    const document = createJSONDocument({ n: 0 });
    const session = createEditingSession({ document, selection: null });
    const seen: number[] = [];
    const listener = (snapshot: { revision: number }) => seen.push(snapshot.revision);
    const oldRelease = session.subscribe(listener);
    oldRelease();
    const newRelease = session.subscribe(listener);
    oldRelease();
    document.commit([{ op: "replace", path: "/n", value: 1 }]);
    expect(seen).toEqual([1]);
    newRelease();
    document.commit([{ op: "replace", path: "/n", value: 2 }]);
    expect(seen).toEqual([1]);
    expect(session.snapshot.value).toEqual({ n: 2 });
  });
});
