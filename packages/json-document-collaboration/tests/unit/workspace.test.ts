import { expect, test } from "vitest";
import { createHistoryRuntime, restoreHistoryRuntime } from "../../src/history-index.js";
import { createCollaborationWorkspace } from "../../src/workspace.js";
import { createCollaborationCanvasTools, createCollaborationEditingHistory } from "../../src/editing-index.js";
import { createObjectEditor } from "@interactive-os/json-document-editing";

const options = { actorId: "human", epochId: "canvas-test", ruleset: { id: "test", digest: "v1" } };
const initial = { profile: "canvas/1", width: 1280, height: 720, objects: [
  { id: "a", kind: "rectangle", x: 0, y: 0, width: 100, height: 80, label: "A", color: "#fff" },
  { id: "b", kind: "rectangle", x: 200, y: 0, width: 100, height: 80, label: "B", color: "#fff" },
] };
function setup() {
  const runtime = createHistoryRuntime(initial, options);
  const workspace = createCollaborationWorkspace(runtime, options);
  const human = createObjectEditor(runtime.document, { history: createCollaborationEditingHistory(runtime) });
  const agent = (id: string) => {
    const tools = createCollaborationCanvasTools(workspace.participant(id), { measureText: () => ({ width: 40, height: 20 }) });
    return (name: string, args: unknown = {}) => tools.find(tool => tool.name === name)!.execute(args);
  };
  const a = agent("agent-a"), b = agent("agent-b");
  const value = () => human.snapshot.value as typeof initial;
  return { runtime, workspace, human, agent, a, b, value };
}
const update = (objectId: string, changes: object) => ({ objectId, changes });

test("observed replicas merge disjoint edits without stale rejection and preserve human selection", () => {
  const s = setup(); s.a("read_canvas"); s.b("read_canvas");
  s.human.dispatch({ type: "selection.set", objectIds: ["b"] });
  expect(s.a("update_canvas_object", update("a", { label: "A1" }))).toMatchObject({ ok: true });
  expect(s.b("update_canvas_object", update("b", { label: "B1" }))).toMatchObject({ ok: true });
  expect(s.value().objects.map(o => o.label)).toEqual(["A1", "B1"]);
  expect(s.human.snapshot.selection.primaryKey).toBe("b");
  const authored = s.runtime.replica.exportBundle().changes.filter(change => change.changeId.actorId.startsWith("agent"));
  expect(authored[1]!.deps).not.toContainEqual(authored[0]!.changeId);
});

test("concurrent fields on one object survive layout planning", () => {
  const s = setup(); s.a("read_canvas"); s.b("read_canvas");
  s.a("update_canvas_object", update("a", { label: "A1" }));
  expect(s.b("update_canvas_object", update("a", { color: "#000" }))).toMatchObject({ ok: true });
  expect(s.value().objects[0]).toMatchObject({ label: "A1", color: "#000" });
  expect(s.runtime.replica.status().conflicts).toEqual([]);
});

test("same-field changes are retained and reported as a conflict, then a fresh edit resolves it", () => {
  const s = setup(); s.a("read_canvas"); s.b("read_canvas");
  s.a("update_canvas_object", update("a", { label: "A1" }));
  expect(s.b("update_canvas_object", update("a", { label: "B1" }))).toMatchObject({ ok: false, code: "collaboration.conflict" });
  expect(s.runtime.replica.status().conflicts).toHaveLength(1);
  s.b("read_canvas");
  expect(s.b("update_canvas_object", update("a", { label: "resolved" }))).toMatchObject({ ok: true });
  expect(s.runtime.replica.status().conflicts).toHaveLength(0);
});

test("reorder preserves identity for concurrent field edits", () => {
  const s = setup(); s.a("read_canvas"); s.b("read_canvas");
  s.a("reorder_canvas_objects", { objectIds: ["b", "a"] });
  expect(s.b("update_canvas_object", update("a", { label: "A1" }))).toMatchObject({ ok: true });
  expect(s.value().objects.map(o => [o.id, o.label])).toEqual([["b", "B"], ["a", "A1"]]);
});

test("delete versus stale edit never resurrects or edits a different object", () => {
  const s = setup(); s.a("read_canvas"); s.b("read_canvas");
  s.a("remove_canvas_objects", { objectIds: ["a"] });
  expect(s.b("update_canvas_object", update("a", { label: "A1" }))).toMatchObject({ ok: false, code: "collaboration.target-hidden" });
  expect(s.value().objects.map(o => o.id)).toEqual(["b"]);
});

test("agent and human undo are selective and checkpoint restore preserves actor history", () => {
  const s = setup(); s.a("read_canvas"); s.b("read_canvas");
  s.a("update_canvas_object", update("a", { label: "A1" }));
  s.b("update_canvas_object", update("b", { label: "B1" }));
  expect(s.human.snapshot.canUndo).toBe(false);
  s.human.dispatch({ type: "object.update", objectId: "a", changes: { color: "#000" } });
  const restored = restoreHistoryRuntime(s.workspace.snapshot.value, options);
  expect(restored.ok).toBe(true); if (!restored.ok) return;
  const next = createCollaborationWorkspace(restored.runtime, options);
  const tools = createCollaborationCanvasTools(next.participant("agent-a"));
  tools.find(t => t.name === "read_canvas")!.execute({});
  expect(tools.find(t => t.name === "undo_canvas")!.execute({})).toMatchObject({ ok: true });
  const result = restored.runtime.document.at("");
  expect(result).toMatchObject({ ok: true, value: { objects: [{ label: "A", color: "#000" }, { label: "B1" }] } });
  expect(restored.runtime.history.undo()).toMatchObject({ ok: true });
  expect(restored.runtime.document.at("/objects/1/label")).toMatchObject({ ok: true, value: "B1" });
});

test("workspace caches actors and saves history-only changes", () => {
  const s = setup(); expect(s.workspace.participant("agent-a")).toBe(s.workspace.participant("agent-a"));
  expect(() => s.workspace.participant("human")).toThrow();
  const before = s.workspace.snapshot;
  s.a("read_canvas"); s.b("read_canvas");
  s.a("update_canvas_object", update("a", { label: "same" }));
  const middle = s.workspace.snapshot;
  s.b("update_canvas_object", update("a", { label: "same" }));
  expect(s.workspace.snapshot).not.toBe(middle);
  expect(middle).not.toBe(before);
  expect(s.workspace.snapshot).toBe(s.workspace.snapshot);
});

test("publication reports whole-change validation suppression", () => {
  const validate = (value: unknown) => {
    const v = value as { left: number; right: number };
    return v.left + v.right <= 1 ? { ok: true as const } : { ok: false as const, code: "capacity" };
  };
  const runtime = createHistoryRuntime({ left: 0, right: 0 }, { ...options, validate });
  const workspace = createCollaborationWorkspace(runtime, { ...options, validate });
  const a = workspace.participant("agent-a"), b = workspace.participant("agent-b");
  a.runtime.document.commit([{ op: "replace", path: "/left", value: 1 }]);
  expect(a.publish().ok).toBe(true);
  b.runtime.document.commit([{ op: "replace", path: "/right", value: 1 }]);
  expect(b.publish()).toMatchObject({ ok: false, code: "collaboration.change-suppressed" });
  expect(runtime.document.at("")).toMatchObject({ ok: true, value: { left: 1, right: 0 } });
});

test("stable-member lookup tracks escaped keys, moves and unreachable descendants", () => {
  const runtime = createHistoryRuntime({ "a/b": { "~key": "old" }, target: {} }, options);
  runtime.document.commit([{ op: "replace", path: "/a~1b/~0key", value: "new" }]);
  const operation = runtime.replica.exportBundle().changes[0]!.ops[0]!;
  if (operation.kind !== "set") throw new Error("Expected a field write");
  expect(runtime.replica.locate(operation.target)).toBe("/a~1b/~0key");
  runtime.document.commit([{ op: "move", from: "/a~1b", path: "/target/moved" }]);
  expect(runtime.replica.locate(operation.target)).toBe("/target/moved/~0key");
  runtime.document.commit([{ op: "remove", path: "/target/moved" }]);
  expect(runtime.replica.locate(operation.target)).toBeNull();
});

test("two agents allocate disjoint sections from the latest shared document and insert relative content atomically", () => {
  const s = setup(); s.a("read_canvas"); s.b("read_canvas");
  expect(s.a("create_canvas_section", { label: "A section", width: 400, height: 300, color: "#fff" })).toMatchObject({ ok: true });
  expect(s.b("create_canvas_section", { label: "B section", width: 400, height: 300, color: "#fff" })).toMatchObject({ ok: true });
  const a = s.value().objects.find(object => object.label === "A section")!;
  const b = s.value().objects.find(object => object.label === "B section")!;
  expect(a.x).toBeGreaterThanOrEqual(364);
  expect(b.x).toBeGreaterThanOrEqual(a.x + a.width + 64);
  expect(s.a("insert_canvas_section_objects", { sectionId: a.id, objects: [
    { kind: "text", x: 20, y: 30, width: 200, height: 40, fontSize: 20, label: "inside", color: "#000" },
  ] })).toMatchObject({ ok: true });
  expect(s.value().objects.find(object => object.label === "inside")).toMatchObject({ parentId: a.id, x: a.x + 20, y: a.y + 30 });
  const count = s.value().objects.length;
  expect(s.b("insert_canvas_section_objects", { sectionId: b.id, objects: [
    { kind: "rectangle", x: 350, y: 20, width: 100, height: 40, label: "overflow", color: "#000" },
  ] })).toMatchObject({ ok: false, code: "section.out-of-bounds" });
  expect(s.value().objects).toHaveLength(count);
});

test("reordered concurrent publication reuses a recent common prefix and matches cold replay", () => {
  let validations = 0;
  const configured = { ...options, validate: () => { validations++; return { ok: true as const }; } };
  const runtime = createHistoryRuntime(initial, configured);
  const workspace = createCollaborationWorkspace(runtime, configured);
  for (let i = 1; i <= 30; i++) {
    runtime.document.commit([{ op: "replace", path: "/objects/0/x", value: i }]);
    if (i % 5 === 0) { runtime.history.undo(); runtime.history.redo(); }
  }
  const a = workspace.participant("agent-a"), b = workspace.participant("agent-b");
  a.runtime.document.commit([{ op: "replace", path: "/objects/0/label", value: "A1" }]);
  b.runtime.document.commit([{ op: "replace", path: "/objects/1/label", value: "B1" }]);
  expect(b.publish().ok).toBe(true);
  validations = 0;
  expect(a.publish().ok).toBe(true);
  expect(validations).toBeLessThan(10);
  b.observe();
  expect(b.runtime.document.value).toEqual(runtime.document.value);
  const restored = restoreHistoryRuntime(runtime.replica.exportCheckpoint(), configured);
  expect(restored.ok).toBe(true);
  if (!restored.ok) throw Error(restored.reason);
  expect(restored.runtime.document.value).toEqual(runtime.document.value);
  expect(restored.runtime.replica.status()).toEqual(runtime.replica.status());
});
