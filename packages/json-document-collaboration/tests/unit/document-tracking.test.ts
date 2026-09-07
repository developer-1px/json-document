import { describe, expect, test } from "vitest";
import { trackPointer, type JSONPatchOperation, type JSONValue } from "@interactive-os/json-document";
import { createCollaborationRuntime } from "../../src/index.js";

const options = { epochId: "tracking/v1", ruleset: { id: "tracking", digest: "v1" } };

describe("remote structural notification", () => {
  test.each([
    { name: "move then edit", initial: { items: [{ label: "a" }, { label: "b" }] }, pointer: "/items/0/label", patch: [{ op: "move", from: "/items/0", path: "/items/1" }, { op: "replace", path: "/items/1/label", value: "edited" }], expected: "/items/1/label" },
    { name: "escaped object member", initial: { "a/b": { label: "a" } }, pointer: "/a~1b/label", patch: [{ op: "move", from: "/a~1b", path: "/~0" }], expected: "/~0/label" },
    { name: "transfer key collision", initial: { __json_document_transfer__: 1, a: { label: "a" }, b: { label: "b" } }, pointer: "/a/label", patch: [{ op: "move", from: "/a", path: "/temp" }, { op: "move", from: "/b", path: "/a" }, { op: "move", from: "/temp", path: "/b" }], expected: "/b/label" },
    { name: "move container to root", initial: { item: { label: "a" }, discarded: true }, pointer: "/item/label", patch: [{ op: "move", from: "/item", path: "" }], expected: "/label" },
    { name: "array reorder with equal labels", initial: { items: [{ label: "same", n: 1 }, { label: "same", n: 2 }] }, pointer: "/items/0/label", patch: [{ op: "move", from: "/items/0", path: "/items/1" }], expected: "/items/1/label" },
    { name: "array insert", initial: { items: ["a", "b"] }, pointer: "/items/1", patch: [{ op: "add", path: "/items/0", value: "x" }], expected: "/items/2" },
    { name: "array delete", initial: { items: ["a", "b"] }, pointer: "/items/1", patch: [{ op: "remove", path: "/items/0" }], expected: "/items/0" },
    { name: "cross-container move", initial: { left: [{ label: "a" }], right: [] }, pointer: "/left/0/label", patch: [{ op: "move", from: "/left/0", path: "/right/0" }], expected: "/right/0/label" },
    { name: "object rename", initial: { old: { label: "a" } }, pointer: "/old/label", patch: [{ op: "move", from: "/old", path: "/new" }], expected: "/new/label" },
    { name: "object swap", initial: { a: { label: "a" }, b: { label: "b" } }, pointer: "/a/label", patch: [{ op: "move", from: "/a", path: "/temp" }, { op: "move", from: "/b", path: "/a" }, { op: "move", from: "/temp", path: "/b" }], expected: "/b/label" },
    { name: "move out before replacing its parent", initial: { left: { item: { label: "a" } }, right: {} }, pointer: "/left/item/label", patch: [{ op: "move", from: "/left/item", path: "/right/item" }, { op: "replace", path: "/left", value: {} }], expected: "/right/item/label" },
    { name: "root array reorder", initial: [{ label: "a" }, { label: "b" }], pointer: "/0/label", patch: [{ op: "move", from: "/0", path: "/1" }], expected: "/1/label" },
  ] as const)("$name preserves the address of the same member", ({ initial, pointer, patch, expected }) => {
    const local = createCollaborationRuntime(initial, { ...options, actorId: "local" });
    const remote = createCollaborationRuntime(initial, { ...options, actorId: "remote" });
    let tracked: string | null = pointer;
    let before: JSONValue = remote.document.value;
    remote.document.subscribe((change) => {
      tracked = tracked === null ? null : trackPointer(tracked, change.applied, before);
      before = remote.document.value;
    });
    expect(local.document.commit(patch as readonly JSONPatchOperation[]).ok).toBe(true);
    expect(remote.replica.ingest(local.replica.exportBundle()).ok).toBe(true);
    expect(remote.document.value).toEqual(local.document.value);
    expect(tracked).toBe(expected);
  });

  test("a local leaf edit still follows an incoming concurrent move", () => {
    const initial = { items: [{ label: "a" }, { label: "b" }] };
    const local = createCollaborationRuntime(initial, { ...options, actorId: "local" });
    const remote = createCollaborationRuntime(initial, { ...options, actorId: "remote" });
    local.document.commit([{ op: "replace", path: "/items/0/label", value: "local" }]);
    remote.document.commit([{ op: "move", from: "/items/0", path: "/items/1" }]);
    const before = local.document.value;
    let tracked: string | null = "/items/0/label";
    local.document.subscribe((change) => { tracked = trackPointer("/items/0/label", change.applied, before); });
    expect(local.replica.ingest(remote.replica.exportBundle()).ok).toBe(true);
    expect(tracked).toBe("/items/1/label");
    expect(local.document.at(tracked!)).toMatchObject({ ok: true, value: "local" });
    expect(remote.replica.ingest(local.replica.exportBundle()).ok).toBe(true);
    expect(remote.document.value).toEqual(local.document.value);
  });
});
