import { createJSONDocument, type JSONValue } from "@interactive-os/json-document";
import {
  createDocumentEditor, createEditingSession, createOrderEditor, createObjectEditor, createTreeEditor, createCalendarEditor,
} from "@interactive-os/json-document-editing";
import { describe, expect, test } from "vitest";
import { createIndependentJSONDocument } from "../../../standards/json-document-v3/implementations/independent/json-document.js";
import { createHistoryRuntime } from "../src/create.js";
import { createCollaborationEditingHistory } from "../src/editing-index.js";

const ruleset = { id: "editing-composition", digest: "1" };
const initial = { blocks: [{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }], other: 0 };
function runtime(value: JSONValue = initial, actorId = "local") {
  return createHistoryRuntime(value, { actorId, epochId: "editing-composition", ruleset });
}

describe.each([
  { name: "reference", create: () => createJSONDocument(initial) },
  { name: "independent", create: () => createIndependentJSONDocument("json", initial) },
  { name: "collaboration (local history)", create: () => runtime().document },
])("real Document consumer: $name", ({ create }) => {
  test("moves, edits by identity, restores history and reconciles external deletion", () => {
    const document = create();
    const editor = createDocumentEditor(document);
    const release = editor.subscribe(() => {});
    expect(editor.dispatch({ type: "selection.move", direction: 1 }).ok).toBe(true);
    expect(editor.dispatch({ type: "text.replace", blockId: "a", text: "Edited" }).ok).toBe(true);
    expect(document.at("/blocks/1")).toMatchObject({ ok: true, value: { id: "a", text: "Edited" } });
    expect(editor.undo().ok).toBe(true);
    expect(editor.undo().ok).toBe(true);
    expect(document.value).toEqual(initial);
    expect(editor.redo().ok).toBe(true);
    expect(document.commit([{ op: "remove", path: "/blocks/1" }]).ok).toBe(true);
    expect(editor.snapshot.selection).toEqual({ kind: "range", ranges: [], primaryIndex: null });
    expect(editor.snapshot.canUndo).toBe(false);
    release();
  });

  test("does not absorb reentrant writes into the editor transaction", () => {
    const document = create();
    let once = false;
    document.subscribe(() => {
      if (once) return;
      once = true;
      document.commit([{ op: "replace", path: "/other", value: 99 }]);
    });
    const editor = createDocumentEditor(document);
    const result = editor.dispatch({ type: "selection.move", direction: 1 });
    expect(result).toMatchObject({ ok: true, snapshot: { value: { other: 0 } } });
    expect(editor.snapshot).toMatchObject({ value: { other: 99 }, canUndo: false });
    expect(editor.undo().ok).toBe(false);
    expect(document.at("/other")).toMatchObject({ ok: true, value: 99 });
  });
});

describe.each([true, false])("official selective history (observed: %s)", (observed) => {
  test("retains remote fields, restores selection and shares runtime history availability", () => {
    const local = runtime();
    const remote = runtime(initial, "remote");
    const editor = createDocumentEditor(local.document, { history: createCollaborationEditingHistory(local) });
    const release = observed ? editor.subscribe(() => {}) : () => {};
    expect(editor.dispatch({ type: "text.replace", blockId: "a", text: "Local", offset: 5 }).ok).toBe(true);
    expect(remote.document.commit([{ op: "replace", path: "/blocks/1/text", value: "Remote" }]).ok).toBe(true);
    expect(local.replica.ingest(remote.replica.exportBundle()).ok).toBe(true);
    expect(editor.snapshot.canUndo).toBe(local.history.canUndo().ok);
    expect(editor.undo().ok).toBe(true);
    expect(local.document.at("/blocks")).toMatchObject({ ok: true, value: [
      { id: "a", text: "Alpha" }, { id: "b", text: "Remote" },
    ] });
    expect(editor.snapshot.selection.ranges[0]!.focus).toEqual({ blockId: "a", offset: 0 });
    expect(editor.snapshot.canRedo).toBe(local.history.canRedo().ok);
    expect(editor.redo().ok).toBe(true);
    expect(editor.snapshot.selection.ranges[0]!.focus).toEqual({ blockId: "a", offset: 5 });
    expect(local.document.at("/blocks/1/text")).toMatchObject({ ok: true, value: "Remote" });
    release();
  });
});

test("publishes causal-only history changes and releases both subscriptions", () => {
  const local = runtime();
  const editor = createDocumentEditor(local.document, { history: createCollaborationEditingHistory(local) });
  const seen: boolean[] = [];
  const release = editor.subscribe((snapshot) => seen.push(snapshot.canUndo));
  expect(editor.dispatch({ type: "text.replace", blockId: "a", text: "Local" }).ok).toBe(true);
  const remote = runtime(initial, "remote");
  remote.replica.ingest(local.replica.exportBundle());
  remote.document.commit([{ op: "replace", path: "/blocks/0/text", value: "Remote" }]);
  local.replica.ingest(remote.replica.exportBundle());
  const before = local.document.value;
  const undo = local.history.undo();
  expect(undo).toMatchObject({ ok: true, didChangeDocument: false });
  expect(local.document.value).toEqual(before);
  expect(seen.at(-1)).toBe(false);
  release();
  const count = seen.length;
  local.history.redo();
  expect(seen).toHaveLength(count);
});

test("external history uses causal commit steps and rejects unsupported ignore before mutation", () => {
  const local = runtime();
  const session = createEditingSession({ document: local.document, selection: null, history: createCollaborationEditingHistory(local) });
  const ignored = session.apply({ operations: [{ op: "replace", path: "/other", value: 1 }], selectionAfter: null, origin: "ignored", history: "ignore" });
  expect(ignored).toMatchObject({ ok: false, code: "history.ignore-unsupported" });
  expect(local.document.value).toEqual(initial);
  for (const value of [1, 2]) expect(session.apply({
    operations: [{ op: "replace", path: "/other", value }], selectionAfter: null, origin: "typing", historyGroup: "typing",
  }).ok).toBe(true);
  expect(session.undo().ok).toBe(true);
  expect(local.document.at("/other")).toMatchObject({ ok: true, value: 1 });
});

test.each(["Document", "Order", "Object", "Tree", "Calendar"])("%s default IDs remain unique after concurrent merge", (domain) => {
  const value = domain === "Document" ? { blocks: [] }
    : domain === "Order" ? { items: [] }
    : domain === "Object" ? { objects: [] }
    : domain === "Tree" ? { nodes: [] }
    : { calendars: [{ id: "home", title: "Home", color: "subtle", hidden: false }], events: [] };
  const left = runtime(value, "left");
  const right = runtime(value, "right");
  for (const { document } of [left, right]) {
    const result = domain === "Document" ? createDocumentEditor(document).dispatch({ type: "block.insert", text: "copy" })
      : domain === "Order" ? createOrderEditor(document).dispatch({ type: "clipboard.paste", clipboard: { type: "application/vnd.interactive-os.order+json", items: [{ id: "source", label: "copy" }], text: "copy" } })
      : domain === "Object" ? createObjectEditor(document).dispatch({ type: "clipboard.paste", clipboard: { type: "application/vnd.interactive-os.objects+json", objects: [{ id: "source", label: "copy", x: 0, y: 0, width: 1, height: 1, color: "subtle" }], text: "copy" } })
      : domain === "Tree" ? createTreeEditor(document).dispatch({ type: "clipboard.paste", topology: { visibleIds: [] }, clipboard: { type: "application/vnd.interactive-os.tree+json", nodes: [{ id: "source", label: "copy", parentId: null }], text: "copy" } })
      : createCalendarEditor(document).dispatch({ type: "event.create", start: "2026-08-03T09:00", end: "2026-08-03T10:00", calendarId: "home" });
    expect(result.ok).toBe(true);
  }
  expect(left.replica.ingest(right.replica.exportBundle()).ok).toBe(true);
  expect(right.replica.ingest(left.replica.exportBundle()).ok).toBe(true);
  expect(left.document.value).toEqual(right.document.value);
  const pointer = domain === "Document" ? "/blocks" : domain === "Order" ? "/items" : domain === "Object" ? "/objects" : domain === "Tree" ? "/nodes" : "/events";
  const entries = left.document.at(pointer);
  expect(entries.ok).toBe(true);
  if (!entries.ok) return;
  const ids = (entries.value as ReadonlyArray<{ readonly id: string }>).map((entry) => entry.id);
  expect(ids).toHaveLength(2);
  expect(new Set(ids).size).toBe(2);
  if (domain === "Document") {
    expect(createDocumentEditor(left.document).dispatch({ type: "text.replace", blockId: ids[1]!, text: "targeted" }).ok).toBe(true);
    expect(left.document.at("/blocks/0/text")).toMatchObject({ ok: true, value: "copy" });
    expect(left.document.at("/blocks/1/text")).toMatchObject({ ok: true, value: "targeted" });
  }
});
