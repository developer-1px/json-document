import { describe, expect, test } from "vitest";
import { z } from "zod";

import {
  createJSONDocument,
  JSONDocumentError,
} from "@interactive-os/json-document";
import {
  canAcceptChange,
  canProposeChange,
  createProposedChanges,
} from "../src/index.js";

const PageSchema = z.object({
  title: z.string().min(1),
  status: z.enum(["draft", "review", "published"]),
  sections: z.array(z.object({
    id: z.string(),
    title: z.string().min(1),
  })),
});

function createPage() {
  return createJSONDocument(PageSchema, {
    title: "Draft",
    status: "draft",
    sections: [
      { id: "intro", title: "Intro" },
      { id: "body", title: "Body" },
    ],
  });
}

describe("@interactive-os/json-document-proposed-changes", () => {
  test("proposes a patch without mutating and accepts it later", () => {
    const doc = createPage();
    const changes = createProposedChanges(doc);

    const proposed = changes.propose({
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Reviewed" },
      label: "Rename page",
    });

    expect(proposed).toMatchObject({
      ok: true,
      change: {
        id: "rename",
        status: "open",
        operations: [{ op: "replace", path: "/title", value: "Reviewed" }],
        guards: [{ path: "/title", value: "Draft" }],
      },
    });
    expect(doc.value.title).toBe("Draft");

    expect(changes.canAccept("rename")).toMatchObject({ ok: true });
    expect(changes.accept("rename", { label: "accept change" })).toMatchObject({
      ok: true,
      change: { status: "accepted" },
      result: { ok: true },
    });
    expect(doc.value.title).toBe("Reviewed");
    expect(changes.current({ status: "all" })).toMatchObject({
      open: 0,
      accepted: 1,
      rejected: 0,
    });
  });

  test("publishes guard assertions and the proposed patch as one history change", () => {
    const doc = createJSONDocument(PageSchema, {
      title: "Draft",
      status: "draft",
      sections: [],
    }, { history: 10 });
    const changes = createProposedChanges(doc);
    expect(changes.propose({
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Reviewed" },
    })).toMatchObject({ ok: true });

    const documentEvents: Array<{
      patch: ReadonlyArray<unknown>;
      label: string | undefined;
      proposalStatus: string | undefined;
    }> = [];
    const proposalEvents: unknown[] = [];
    doc.subscribe((patch, metadata) => {
      documentEvents.push({
        patch,
        label: metadata?.label,
        proposalStatus: changes.byId("rename")?.status,
      });
    });
    changes.subscribe((snapshot) => { proposalEvents.push(snapshot); });

    expect(changes.accept("rename", { label: "accept rename" })).toMatchObject({
      ok: true,
      change: { status: "accepted" },
    });
    const guardedPatch = [
      { op: "test", path: "/title", value: "Draft" },
      { op: "replace", path: "/title", value: "Reviewed" },
    ];
    expect(doc.lastPatch).toEqual(guardedPatch);
    expect(doc.history.undoDepth).toBe(1);
    expect(documentEvents).toEqual([{
      patch: guardedPatch,
      label: "accept rename",
      proposalStatus: "open",
    }]);
    expect(proposalEvents).toHaveLength(1);
    expect(proposalEvents[0]).toMatchObject({ open: 0, accepted: 1 });

    expect(doc.undo()).toEqual({ ok: true });
    expect(doc.value.title).toBe("Draft");
    expect(doc.lastPatch).toEqual([{
      op: "replace",
      path: "/title",
      value: "Draft",
    }]);
    expect(changes.byId("rename")).toMatchObject({ status: "accepted" });
    expect(doc.redo()).toEqual({ ok: true });
    expect(doc.value.title).toBe("Reviewed");
    expect(doc.lastPatch).toEqual(guardedPatch);
    expect(doc.history.undoDepth).toBe(1);
  });

  test("keeps an accepting proposal reserved during document subscriber reentrancy", () => {
    const doc = createPage();
    const changes = createProposedChanges(doc);
    expect(changes.propose({
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Reviewed" },
    })).toMatchObject({ ok: true });
    let removedDuringAccept: boolean | undefined;
    doc.subscribe(() => {
      removedDuringAccept = changes.remove("rename");
    });

    expect(changes.accept("rename")).toMatchObject({
      ok: true,
      change: { id: "rename", status: "accepted" },
    });
    expect(removedDuringAccept).toBe(false);
    expect(changes.byId("rename")).toMatchObject({ status: "accepted" });
    expect(doc.value.title).toBe("Reviewed");
  });

  test("does not let a document subscriber reject an accepting proposal", () => {
    const doc = createPage();
    const changes = createProposedChanges(doc);
    expect(changes.propose({
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Reviewed" },
    })).toMatchObject({ ok: true });
    let nestedReject: unknown;
    doc.subscribe(() => {
      nestedReject = changes.reject("rename");
    });

    expect(changes.accept("rename")).toMatchObject({
      ok: true,
      change: { status: "accepted" },
    });
    expect(nestedReject).toMatchObject({ ok: false, code: "not_open" });
    expect(changes.byId("rename")).toMatchObject({ status: "accepted" });
  });

  test("does not recursively accept the same proposal from a document subscriber", () => {
    const doc = createPage();
    const changes = createProposedChanges(doc);
    expect(changes.propose({
      id: "same-title",
      operations: { op: "replace", path: "/title", value: "Draft" },
    })).toMatchObject({ ok: true });
    let nestedAccept: unknown;
    doc.subscribe(() => {
      nestedAccept = changes.accept("same-title");
    });

    expect(changes.accept("same-title")).toMatchObject({
      ok: true,
      change: { status: "accepted" },
    });
    expect(nestedAccept).toMatchObject({ ok: false, code: "not_open" });
    expect(changes.byId("same-title")).toMatchObject({ status: "accepted" });
  });

  test("preserves an accepting entry when a document subscriber loads proposals", () => {
    const doc = createPage();
    const changes = createProposedChanges(doc);
    expect(changes.propose({
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Reviewed" },
    })).toMatchObject({ ok: true });
    doc.subscribe(() => {
      changes.load([{
        id: "rename",
        status: "open",
        operations: [{ op: "replace", path: "/status", value: "published" }],
        guards: [{ path: "/status", value: "draft" }],
      }, {
        id: "other",
        status: "open",
        operations: [{ op: "replace", path: "/status", value: "review" }],
        guards: [{ path: "/status", value: "draft" }],
      }]);
    });

    expect(changes.accept("rename")).toMatchObject({
      ok: true,
      change: {
        status: "accepted",
        operations: [{ path: "/title", value: "Reviewed" }],
      },
    });
    expect(changes.byId("rename")).toMatchObject({
      status: "accepted",
      operations: [{ path: "/title", value: "Reviewed" }],
    });
    expect(changes.byId("other")).toMatchObject({ status: "open" });
  });

  test("recomputes generated ids from entries merged by a reentrant load", () => {
    const doc = createPage();
    const seed = createProposedChanges(doc);
    expect(seed.propose({
      id: "change-100",
      operations: { op: "replace", path: "/status", value: "review" },
    })).toMatchObject({ ok: true });
    expect(seed.propose({
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Reviewed" },
    })).toMatchObject({ ok: true });
    const changes = createProposedChanges(doc, {
      initial: seed.current({ status: "all" }).changes,
    });
    doc.subscribe(() => {
      changes.load([{
        id: "change-1",
        status: "open",
        operations: [{ op: "replace", path: "/status", value: "published" }],
        guards: [{ path: "/status", value: "draft" }],
      }]);
    });

    expect(changes.accept("rename")).toMatchObject({ ok: true });
    expect(changes.propose({
      operations: { op: "replace", path: "/status", value: "review" },
    })).toMatchObject({
      ok: true,
      change: { id: "change-2" },
    });
  });

  test("keeps accepting entries when a document subscriber clears proposals", () => {
    const doc = createPage();
    const changes = createProposedChanges(doc);
    expect(changes.propose({
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Reviewed" },
    })).toMatchObject({ ok: true });
    expect(changes.propose({
      id: "other",
      operations: { op: "replace", path: "/status", value: "review" },
    })).toMatchObject({ ok: true });
    doc.subscribe(() => { changes.clear(); });

    expect(changes.accept("rename")).toMatchObject({
      ok: true,
      change: { status: "accepted" },
    });
    expect(changes.byId("rename")).toMatchObject({ status: "accepted" });
    expect(changes.byId("other")).toBeNull();
  });

  test("rejects a change without mutating the document", () => {
    const doc = createPage();
    const changes = createProposedChanges(doc);

    changes.propose({
      id: "publish",
      operations: { op: "replace", path: "/status", value: "published" },
    });

    expect(changes.reject("publish")).toMatchObject({
      ok: true,
      change: { status: "rejected" },
    });
    expect(doc.value.status).toBe("draft");
    expect(changes.canAccept("publish")).toMatchObject({
      ok: false,
      code: "not_open",
    });
  });

  test("detects stale changes before accepting", () => {
    const doc = createPage();
    const changes = createProposedChanges(doc);

    changes.propose({
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Reviewed" },
    });
    doc.replace("/title", "Edited directly");

    expect(canAcceptChange(doc, new Map([["rename", changes.byId("rename")!]]), "rename")).toMatchObject({
      ok: false,
      code: "stale_change",
      pointer: "/title",
    });
    expect(changes.accept("rename")).toMatchObject({
      ok: false,
      code: "stale_change",
    });
    expect(doc.value.title).toBe("Edited directly");
    expect(changes.byId("rename")).toMatchObject({ status: "open" });
  });

  test("treats object member order as irrelevant for guard equality", () => {
    const Schema = z.object({
      value: z.record(z.string(), z.number()),
    });
    const doc = createJSONDocument(Schema, {
      value: { a: 1, b: 2 },
    });
    const changes = createProposedChanges(doc);
    expect(changes.propose({
      id: "replace-record",
      operations: { op: "replace", path: "/value", value: { a: 2, b: 3 } },
    })).toMatchObject({ ok: true });
    doc.load({ value: { b: 2, a: 1 } }, { preserveHistory: true });

    expect(changes.canAccept("replace-record")).toMatchObject({ ok: true });
    expect(changes.accept("replace-record")).toMatchObject({ ok: true });
    expect(doc.value.value).toEqual({ a: 2, b: 3 });
  });

  test("does not overwrite a guard that changes during accept validation", () => {
    let interfere: (() => void) | undefined;
    let armed = false;
    let reviewedValidations = 0;
    const Schema = z.object({
      title: z.string(),
      note: z.string(),
    }).superRefine((value) => {
      if (!armed || value.title !== "Reviewed") return;
      reviewedValidations += 1;
      if (reviewedValidations !== 2) return;
      armed = false;
      interfere?.();
    });
    const doc = createJSONDocument(Schema, {
      title: "Draft",
      note: "initial",
    }, { history: 10 });
    const changes = createProposedChanges(doc);
    expect(changes.propose({
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Reviewed" },
    })).toMatchObject({ ok: true });

    const documentEvents: ReadonlyArray<unknown>[] = [];
    const proposalEvents: unknown[] = [];
    doc.subscribe((patch) => { documentEvents.push(patch); });
    changes.subscribe((snapshot) => { proposalEvents.push(snapshot); });
    interfere = () => {
      doc.load({ title: "Edited concurrently", note: "remote" }, { preserveHistory: true });
    };
    armed = true;

    expect(changes.accept("rename", { label: "accept rename" })).toMatchObject({
      ok: false,
      code: "stale_change",
      pointer: "/title",
    });
    expect(doc.value).toEqual({ title: "Edited concurrently", note: "remote" });
    expect(doc.lastPatch).toEqual([{
      op: "replace",
      path: "",
      value: { title: "Edited concurrently", note: "remote" },
    }]);
    expect(doc.history.undoDepth).toBe(0);
    expect(changes.byId("rename")).toMatchObject({ status: "open" });
    expect(documentEvents).toEqual([doc.lastPatch]);
    expect(proposalEvents).toEqual([]);
  });

  test("reports a proposed-operation failure even when onError changes a guard", () => {
    let handlePatchError: (() => void) | undefined;
    let armed = false;
    let reviewedValidations = 0;
    const Schema = z.object({ title: z.string() }).superRefine((value, context) => {
      if (!armed || value.title !== "Reviewed") return;
      reviewedValidations += 1;
      if (reviewedValidations !== 2) return;
      context.addIssue({ code: "custom", message: "cannot publish this title" });
    });
    const doc = createJSONDocument(Schema, { title: "Draft" }, {
      onError() { handlePatchError?.(); },
    });
    const changes = createProposedChanges(doc);
    expect(changes.propose({
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Reviewed" },
    })).toMatchObject({ ok: true });
    handlePatchError = () => {
      doc.load({ title: "Edited by onError" }, { preserveHistory: true });
    };
    armed = true;

    expect(changes.accept("rename")).toMatchObject({
      ok: false,
      code: "patch_failed",
      result: { code: "schema_violation" },
    });
    expect(doc.value.title).toBe("Edited by onError");
    expect(changes.byId("rename")).toMatchObject({ status: "open" });
  });

  test("reports the failed guard even when onError restores its value", () => {
    let interfere: (() => void) | undefined;
    let handlePatchError: (() => void) | undefined;
    let armed = false;
    let reviewedValidations = 0;
    const Schema = z.object({ title: z.string() }).superRefine((value) => {
      if (!armed || value.title !== "Reviewed") return;
      reviewedValidations += 1;
      if (reviewedValidations !== 2) return;
      armed = false;
      interfere?.();
    });
    const doc = createJSONDocument(Schema, { title: "Draft" }, {
      onError() { handlePatchError?.(); },
    });
    const changes = createProposedChanges(doc);
    expect(changes.propose({
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Reviewed" },
    })).toMatchObject({ ok: true });
    interfere = () => {
      doc.load({ title: "Edited concurrently" }, { preserveHistory: true });
    };
    handlePatchError = () => {
      doc.load({ title: "Draft" }, { preserveHistory: true });
    };
    armed = true;

    expect(changes.accept("rename")).toMatchObject({
      ok: false,
      code: "stale_change",
      pointer: "/title",
    });
    expect(doc.value.title).toBe("Draft");
    expect(changes.byId("rename")).toMatchObject({ status: "open" });
  });

  test("prefers a newly stale guard over an obsolete capability failure", () => {
    let interfere: (() => void) | undefined;
    let armed = false;
    const Schema = z.object({ title: z.string() }).superRefine((value, context) => {
      if (!armed || value.title !== "Reviewed") return;
      armed = false;
      interfere?.();
      context.addIssue({ code: "custom", message: "obsolete validation failure" });
    });
    const doc = createJSONDocument(Schema, { title: "Draft" }, { history: 10 });
    const changes = createProposedChanges(doc);
    expect(changes.propose({
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Reviewed" },
    })).toMatchObject({ ok: true });
    interfere = () => {
      doc.load({ title: "Edited concurrently" }, { preserveHistory: true });
    };
    armed = true;

    expect(changes.accept("rename")).toMatchObject({
      ok: false,
      code: "stale_change",
      pointer: "/title",
    });
    expect(doc.value).toEqual({ title: "Edited concurrently" });
    expect(doc.history.undoDepth).toBe(0);
    expect(changes.byId("rename")).toMatchObject({ status: "open" });
  });

  test("preserves strict execution errors for an atomic guard failure", () => {
    let interfere: (() => void) | undefined;
    let armed = false;
    let reviewedValidations = 0;
    const Schema = z.object({ title: z.string() }).superRefine((value) => {
      if (!armed || value.title !== "Reviewed") return;
      reviewedValidations += 1;
      if (reviewedValidations !== 2) return;
      armed = false;
      interfere?.();
    });
    const doc = createJSONDocument(Schema, { title: "Draft" }, {
      history: 10,
      strict: true,
    });
    const changes = createProposedChanges(doc);
    expect(changes.propose({
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Reviewed" },
    })).toMatchObject({ ok: true });
    interfere = () => {
      doc.load({ title: "Edited concurrently" }, { preserveHistory: true });
    };
    armed = true;

    expect(() => changes.accept("rename")).toThrow(JSONDocumentError);
    expect(doc.value).toEqual({ title: "Edited concurrently" });
    expect(doc.history.undoDepth).toBe(0);
    expect(changes.byId("rename")).toMatchObject({ status: "open" });
  });

  test("rejects schema-invalid proposals before storing them", () => {
    const doc = createPage();
    const changes = createProposedChanges(doc);

    expect(changes.canPropose({
      id: "bad-status",
      operations: { op: "replace", path: "/status", value: "invalid" },
    })).toMatchObject({
      ok: false,
      code: "patch_rejected",
      capability: { ok: false, code: "schema_violation" },
    });
    expect(changes.propose({
      id: "bad-status",
      operations: { op: "replace", path: "/status", value: "invalid" },
    })).toMatchObject({
      ok: false,
      code: "patch_rejected",
    });
    expect(changes.byId("bad-status")).toBeNull();
  });

  test("guards parent arrays for proposed insertions", () => {
    const doc = createPage();
    const changes = createProposedChanges(doc);

    changes.propose({
      id: "append",
      operations: { op: "add", path: "/sections/-", value: { id: "tail", title: "Tail" } },
    });
    doc.insert("/sections/-", { id: "direct", title: "Direct" });

    expect(changes.accept("append")).toMatchObject({
      ok: false,
      code: "stale_change",
      pointer: "/sections",
    });
    expect(doc.value.sections.map((section) => section.id)).toEqual(["intro", "body", "direct"]);
  });

  test("documents guard semantics for patch operation kinds", () => {
    const doc = createPage();
    const changes = createProposedChanges(doc);

    expect(changes.canPropose({
      operations: { op: "replace", path: "/title", value: "Reviewed" },
    })).toMatchObject({
      ok: true,
      guards: [{ path: "/title", value: "Draft" }],
    });
    expect(changes.canPropose({
      operations: { op: "remove", path: "/sections/0" },
    })).toMatchObject({
      ok: true,
      guards: [{ path: "/sections/0", value: { id: "intro", title: "Intro" } }],
    });
    expect(changes.canPropose({
      operations: { op: "add", path: "/sections/-", value: { id: "tail", title: "Tail" } },
    })).toMatchObject({
      ok: true,
      guards: [{ path: "/sections" }],
    });
    expect(changes.canPropose({
      operations: { op: "move", from: "/sections/0", path: "/sections/1" },
    })).toMatchObject({
      ok: true,
      guards: [{ path: "/sections/0" }, { path: "/sections" }],
    });
    expect(changes.canPropose({
      operations: { op: "copy", from: "/title", path: "/sections/0/title" },
    })).toMatchObject({
      ok: true,
      guards: [{ path: "/title" }, { path: "/sections/0" }],
    });
  });

  test("restores persisted changes and keeps generated ids monotonic", () => {
    const doc = createPage();
    const changes = createProposedChanges(doc);

    changes.propose({
      operations: { op: "replace", path: "/title", value: "Reviewed" },
      data: {
        proposedBy: "ai",
        source: "nano-edit",
        createdAt: "2026-05-29T00:00:00.000Z",
      },
    });
    const persisted = changes.current({ status: "all" }).changes;

    const restored = createProposedChanges(doc, { initial: persisted });
    expect(restored.current({ status: "all" })).toMatchObject({
      changes: [{
        id: "change-1",
        status: "open",
        data: {
          proposedBy: "ai",
          source: "nano-edit",
        },
      }],
    });

    expect(restored.propose({
      operations: { op: "replace", path: "/status", value: "review" },
    })).toMatchObject({
      ok: true,
      change: { id: "change-2" },
    });
  });

  test("copies proposal inputs and reports duplicate or empty proposals", () => {
    const doc = createPage();
    const changes = createProposedChanges(doc);
    const operations = [{ op: "replace" as const, path: "/title", value: "Reviewed" }];

    expect(changes.propose({ id: "rename", operations })).toMatchObject({ ok: true });
    operations[0]!.value = "Mutated";

    expect(changes.byId("rename")).toMatchObject({
      operations: [{ value: "Reviewed" }],
    });
    expect(canProposeChange(doc, new Map([["rename", changes.byId("rename")!]]), {
      id: "rename",
      operations: { op: "replace", path: "/title", value: "Other" },
    })).toMatchObject({
      ok: false,
      code: "duplicate_id",
    });
    expect(changes.canPropose({ operations: [] })).toMatchObject({
      ok: false,
      code: "empty_patch",
    });
  });
});
