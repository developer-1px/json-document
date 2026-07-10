import { describe, expect, test } from "vitest";
import * as z from "zod";

import {
  JSONDocumentError,
  createJSONDocument,
  type JSONChangeMetadata,
} from "@interactive-os/json-document";
import {
  createCausalPatchInbox,
} from "../src/index.js";

const LogSchema = z.object({
  log: z.array(z.string()),
});

describe("@interactive-os/json-document-causal-patch-inbox", () => {
  test("queues a child until its parent is applied, then drains in causal order", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);

    const child = inbox.ingest({
      id: "child",
      dependsOn: ["parent"],
      operations: [{ op: "add", path: "/log/-", value: "child" }],
    });

    expect(child).toEqual({
      ok: true,
      applied: [],
      pending: ["child"],
      duplicates: [],
    });
    expect(inbox.current()).toEqual({
      status: "active",
      frontier: [],
      queued: [{ id: "child", missing: ["parent"] }],
    });
    expect(doc.value.log).toEqual([]);

    const parent = inbox.ingest({
      id: "parent",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "parent" }],
    });

    expect(parent).toEqual({
      ok: true,
      applied: ["parent", "child"],
      pending: [],
      duplicates: [],
    });
    expect(inbox.current()).toEqual({
      status: "active",
      frontier: ["child"],
      queued: [],
    });
    expect(doc.value.log).toEqual(["parent", "child"]);
  });

  test("deduplicates the same envelope before and after it is applied", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);
    const child = {
      id: "child",
      dependsOn: ["parent"],
      operations: [{ op: "add" as const, path: "/log/-" as const, value: "child" }],
    };
    const parent = {
      id: "parent",
      dependsOn: [],
      operations: [{ op: "add" as const, path: "/log/-" as const, value: "parent" }],
    };

    expect(inbox.ingest(child)).toMatchObject({
      ok: true,
      applied: [],
      duplicates: [],
    });
    expect(inbox.ingest(child)).toMatchObject({
      ok: true,
      applied: [],
      pending: ["child"],
      duplicates: ["child"],
    });
    expect(doc.value.log).toEqual([]);

    expect(inbox.ingest(parent)).toMatchObject({
      ok: true,
      applied: ["parent", "child"],
    });
    expect(inbox.ingest(parent)).toMatchObject({
      ok: true,
      applied: [],
      pending: [],
      duplicates: ["parent"],
    });
    expect(doc.value.log).toEqual(["parent", "child"]);
  });

  test("treats dependency order as set order for exact duplicates", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);
    const operations = [{
      op: "add" as const,
      path: "/log/-" as const,
      value: "child",
    }];

    expect(inbox.ingest({
      id: "child",
      dependsOn: ["parent-b", "parent-a"],
      operations,
    })).toMatchObject({
      ok: true,
      pending: ["child"],
      duplicates: [],
    });
    expect(inbox.ingest({
      id: "child",
      dependsOn: ["parent-a", "parent-b"],
      operations,
    })).toMatchObject({
      ok: true,
      pending: ["child"],
      duplicates: ["child"],
    });
    expect(inbox.current().queued).toEqual([{
      id: "child",
      missing: ["parent-a", "parent-b"],
    }]);
  });

  test("owns a defensive copy of admitted dependencies and operations", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);
    const dependsOn = ["parent"];
    const operation = {
      op: "add" as const,
      path: "/log/-" as const,
      value: "original",
    };

    expect(inbox.ingest({
      id: "child",
      dependsOn,
      operations: [operation],
    })).toMatchObject({ ok: true, pending: ["child"] });
    dependsOn.push("never-arrives");
    operation.value = "mutated";

    expect(inbox.ingest({
      id: "parent",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "parent" }],
    })).toMatchObject({
      ok: true,
      applied: ["parent", "child"],
    });
    expect(doc.value.log).toEqual(["parent", "original"]);
  });

  test("rejects a different payload for a known id before admitting the batch", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);

    expect(inbox.ingest({
      id: "child",
      dependsOn: ["parent"],
      operations: [{ op: "add", path: "/log/-", value: "original" }],
    })).toMatchObject({ ok: true, pending: ["child"] });

    const result = inbox.ingest([{
      id: "independent",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "independent" }],
    }, {
      id: "child",
      dependsOn: ["parent"],
      operations: [{ op: "add", path: "/log/-", value: "replacement" }],
    }]);

    expect(result).toMatchObject({
      ok: false,
      code: "duplicate_mismatch",
      id: "child",
      applied: [],
    });
    expect(inbox.current()).toEqual({
      status: "active",
      frontier: [],
      queued: [{ id: "child", missing: ["parent"] }],
    });
    expect(doc.value.log).toEqual([]);

    expect(inbox.ingest({
      id: "parent",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "parent" }],
    })).toMatchObject({
      ok: true,
      applied: ["parent", "child"],
    });
    expect(doc.value.log).toEqual(["parent", "original"]);
  });

  test("applies the currently known ready batch in id order", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);

    const result = inbox.ingest([{
      id: "change-c",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "C" }],
    }, {
      id: "change-a",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "A" }],
    }, {
      id: "change-b",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "B" }],
    }]);

    expect(result).toMatchObject({
      ok: true,
      applied: ["change-a", "change-b", "change-c"],
    });
    expect(doc.value.log).toEqual(["A", "B", "C"]);
    expect(inbox.current().frontier).toEqual([
      "change-a",
      "change-b",
      "change-c",
    ]);
  });

  test("blocks without advancing causal state when one envelope patch fails", () => {
    const doc = createJSONDocument(LogSchema, { log: [] }, { history: 10 });
    const inbox = createCausalPatchInbox(doc);

    const result = inbox.ingest([{
      id: "parent",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "parent" }],
    }, {
      id: "child",
      dependsOn: ["parent"],
      operations: [
        { op: "add", path: "/log/-", value: "must-not-leak" },
        { op: "replace", path: "/log", value: 42 },
      ],
    }, {
      id: "grandchild",
      dependsOn: ["child"],
      operations: [{ op: "add", path: "/log/-", value: "grandchild" }],
    }]);

    expect(result).toMatchObject({
      ok: false,
      code: "patch_failed",
      id: "child",
      applied: ["parent"],
      result: { ok: false, code: "schema_violation" },
    });
    expect(inbox.current()).toMatchObject({
      status: "blocked",
      frontier: ["parent"],
      queued: [
        { id: "child", missing: [] },
        { id: "grandchild", missing: ["child"] },
      ],
      failure: {
        id: "child",
        result: { ok: false, code: "schema_violation" },
      },
    });
    expect(doc.value.log).toEqual(["parent"]);
    expect(doc.history.undoDepth).toBe(1);

    const blocked = inbox.ingest({
      id: "independent",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "independent" }],
    });
    expect(blocked).toMatchObject({
      ok: false,
      code: "blocked",
      applied: [],
    });
    expect(inbox.current().status).toBe("blocked");
    expect(doc.value.log).toEqual(["parent"]);
  });

  test("halts when the document projection changes outside the inbox", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);

    expect(doc.patch({
      op: "add",
      path: "/log/-",
      value: "external",
    })).toEqual({ ok: true });
    expect(inbox.current()).toEqual({
      status: "diverged",
      frontier: [],
      queued: [],
    });

    const result = inbox.ingest({
      id: "remote",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "remote" }],
    });
    expect(result).toMatchObject({
      ok: false,
      code: "projection_diverged",
      applied: [],
    });
    expect(doc.value.log).toEqual(["external"]);
  });

  test("rejects reentrant ingestion while an envelope is being published", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);
    let attempted = false;
    let reentrant: ReturnType<typeof inbox.ingest> | undefined;
    const unsubscribe = doc.subscribe(() => {
      if (attempted) return;
      attempted = true;
      reentrant = inbox.ingest({
        id: "nested",
        dependsOn: [],
        operations: [{ op: "add", path: "/log/-", value: "nested" }],
      });
    });

    const result = inbox.ingest({
      id: "outer",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "outer" }],
    });

    expect(reentrant).toMatchObject({
      ok: false,
      code: "busy",
      applied: [],
    });
    expect(result).toMatchObject({
      ok: true,
      applied: ["outer"],
    });
    expect(doc.value.log).toEqual(["outer"]);
    unsubscribe();
  });

  test("rejects a dependency cycle before admitting the closing envelope", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);

    expect(inbox.ingest({
      id: "a",
      dependsOn: ["b"],
      operations: [{ op: "add", path: "/log/-", value: "A" }],
    })).toMatchObject({ ok: true, pending: ["a"] });

    const result = inbox.ingest({
      id: "b",
      dependsOn: ["a"],
      operations: [{ op: "add", path: "/log/-", value: "B" }],
    });

    expect(result).toMatchObject({
      ok: false,
      code: "dependency_cycle",
      id: "b",
      cycle: ["a", "b", "a"],
      applied: [],
    });
    expect(inbox.current()).toEqual({
      status: "active",
      frontier: [],
      queued: [{ id: "a", missing: ["b"] }],
    });
    expect(doc.value.log).toEqual([]);
  });

  test("rejects a deep dependency cycle without recursive stack growth", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);
    const size = 6_000;
    const envelopes = Array.from({ length: size }, (_, index) => ({
      id: `change-${index.toString().padStart(4, "0")}`,
      dependsOn: [
        `change-${((index + 1) % size).toString().padStart(4, "0")}`,
      ],
      operations: [],
    }));

    expect(inbox.ingest(envelopes)).toMatchObject({
      ok: false,
      code: "dependency_cycle",
      applied: [],
    });
    expect(inbox.current()).toEqual({
      status: "active",
      frontier: [],
      queued: [],
    });
    expect(doc.value.log).toEqual([]);
  });

  test("admits a deep acyclic pending chain without retraversing its prefix", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);
    const size = 10_000;
    let lastResult: ReturnType<typeof inbox.ingest> | undefined;

    for (let index = 0; index < size; index += 1) {
      const id = `change-${index.toString().padStart(5, "0")}`;
      const dependency = index === 0
        ? "missing-root"
        : `change-${(index - 1).toString().padStart(5, "0")}`;
      lastResult = inbox.ingest({
        id,
        dependsOn: [dependency],
        operations: [],
      });
      if (!lastResult.ok) throw new Error(lastResult.code);
    }

    expect(lastResult).toMatchObject({
      ok: true,
      pending: ["change-09999"],
    });
    expect(inbox.current().queued).toHaveLength(size);
  }, 5_000);

  test("rejects invalid dependency identities before admitting the batch", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);

    const result = inbox.ingest([{
      id: "valid",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "valid" }],
    }, {
      id: "self",
      dependsOn: ["self"],
      operations: [{ op: "add", path: "/log/-", value: "self" }],
    }]);

    expect(result).toMatchObject({
      ok: false,
      code: "invalid_envelope",
      id: "self",
      applied: [],
    });
    expect(inbox.current()).toEqual({
      status: "active",
      frontier: [],
      queued: [],
    });
    expect(doc.value.log).toEqual([]);
  });

  test("stops after the current envelope when publication reentry diverges the projection", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);
    let mutated = false;
    const unsubscribe = doc.subscribe(() => {
      if (mutated) return;
      mutated = true;
      expect(doc.patch({
        op: "add",
        path: "/log/-",
        value: "external",
      })).toEqual({ ok: true });
    });

    const result = inbox.ingest([{
      id: "parent",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "parent" }],
    }, {
      id: "child",
      dependsOn: ["parent"],
      operations: [{ op: "add", path: "/log/-", value: "child" }],
    }]);

    expect(result).toMatchObject({
      ok: false,
      code: "projection_diverged",
      applied: ["parent"],
    });
    expect(inbox.current()).toEqual({
      status: "diverged",
      frontier: ["parent"],
      queued: [{ id: "child", missing: [] }],
    });
    expect(doc.value.log).toEqual(["parent", "external"]);
    unsubscribe();
  });

  test("marks divergence when document publication throws after changing state", () => {
    const doc = createJSONDocument(LogSchema, { log: [] }, {
      onChange() {
        throw new Error("host publication failed");
      },
    });
    const inbox = createCausalPatchInbox(doc);

    expect(() => inbox.ingest({
      id: "remote",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "remote" }],
    })).toThrow("host publication failed");

    expect(doc.value.log).toEqual(["remote"]);
    expect(inbox.current()).toEqual({
      status: "diverged",
      frontier: [],
      queued: [{ id: "remote", missing: [] }],
    });
  });

  test("integrates a causal envelope whose projection patch is empty", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);

    expect(inbox.ingest({
      id: "projection-noop",
      dependsOn: [],
      operations: [],
    })).toEqual({
      ok: true,
      applied: ["projection-noop"],
      pending: [],
      duplicates: [],
    });
    expect(inbox.current()).toEqual({
      status: "active",
      frontier: ["projection-noop"],
      queued: [],
    });
    expect(doc.value.log).toEqual([]);
  });

  test("stops observing and ingesting after disposal", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);

    inbox.dispose();
    expect(inbox.current()).toEqual({
      status: "disposed",
      frontier: [],
      queued: [],
    });
    expect(inbox.ingest({
      id: "late",
      dependsOn: [],
      operations: [],
    })).toMatchObject({
      ok: false,
      code: "disposed",
      applied: [],
    });

    expect(doc.patch({
      op: "add",
      path: "/log/-",
      value: "external-after-dispose",
    })).toEqual({ ok: true });
    expect(inbox.current().status).toBe("disposed");
  });

  test("rejects non-JSON envelope values before admitting the batch", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);

    const result = inbox.ingest([{
      id: "valid",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "valid" }],
    }, {
      id: "not-json",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: Number.NaN }],
    }]);

    expect(result).toMatchObject({
      ok: false,
      code: "invalid_envelope",
      id: "not-json",
      applied: [],
    });
    expect(inbox.current()).toEqual({
      status: "active",
      frontier: [],
      queued: [],
    });
    expect(doc.value.log).toEqual([]);
  });

  test("rejects accessor envelope fields without invoking them", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);
    let reads = 0;
    const envelope = {} as Record<string, unknown>;
    Object.defineProperties(envelope, {
      id: {
        enumerable: true,
        get() {
          reads += 1;
          return "accessor";
        },
      },
      dependsOn: {
        enumerable: true,
        value: [],
      },
      operations: {
        enumerable: true,
        value: [],
      },
    });

    const result = inbox.ingest(envelope as never);

    expect(result).toMatchObject({
      ok: false,
      code: "invalid_envelope",
      applied: [],
    });
    expect(reads).toBe(0);
    expect(inbox.current()).toEqual({
      status: "active",
      frontier: [],
      queued: [],
    });
  });

  test("rejects reentrant ingestion while envelope admission is reading descriptors", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);
    let attempted = false;
    let reentrant: ReturnType<typeof inbox.ingest> | undefined;
    const envelope = new Proxy({
      id: "outer",
      dependsOn: [],
      operations: [{ op: "add" as const, path: "/log/-" as const, value: "outer" }],
    }, {
      ownKeys(target) {
        if (!attempted) {
          attempted = true;
          reentrant = inbox.ingest({
            id: "nested",
            dependsOn: [],
            operations: [{ op: "add", path: "/log/-", value: "nested" }],
          });
        }
        return Reflect.ownKeys(target);
      },
    });

    const result = inbox.ingest(envelope);

    expect(reentrant).toMatchObject({
      ok: false,
      code: "busy",
      applied: [],
    });
    expect(result).toMatchObject({
      ok: true,
      applied: ["outer"],
    });
    expect(doc.value.log).toEqual(["outer"]);
  });

  test("preserves an unapplied envelope when a strict document throws", () => {
    const doc = createJSONDocument(LogSchema, { log: [] }, { strict: true });
    const inbox = createCausalPatchInbox(doc);
    const envelope = {
      id: "invalid-for-schema",
      dependsOn: [],
      operations: [{ op: "replace" as const, path: "/log" as const, value: 42 }],
    };

    expect(() => inbox.ingest(envelope)).toThrow(JSONDocumentError);
    expect(inbox.current()).toEqual({
      status: "blocked",
      frontier: [],
      queued: [{ id: "invalid-for-schema", missing: [] }],
      failure: {
        id: "invalid-for-schema",
        result: expect.objectContaining({
          ok: false,
          code: "schema_violation",
        }),
      },
    });
    expect(doc.value.log).toEqual([]);

    expect(inbox.ingest(envelope)).toMatchObject({
      ok: false,
      code: "blocked",
      id: "invalid-for-schema",
      result: { ok: false, code: "schema_violation" },
      applied: [],
    });
    expect(doc.value.log).toEqual([]);
  });

  test("faults without retry when a document error callback throws", () => {
    const doc = createJSONDocument(LogSchema, { log: [] }, {
      onError() {
        throw new Error("host error callback failed");
      },
    });
    const inbox = createCausalPatchInbox(doc);

    expect(() => inbox.ingest({
      id: "invalid-for-schema",
      dependsOn: [],
      operations: [{ op: "replace", path: "/log", value: 42 }],
    })).toThrow("host error callback failed");
    expect(inbox.current()).toEqual({
      status: "faulted",
      frontier: [],
      queued: [{ id: "invalid-for-schema", missing: [] }],
      fault: {
        id: "invalid-for-schema",
        reason: "host error callback failed",
      },
    });

    expect(inbox.ingest({
      id: "independent",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "must-not-apply" }],
    })).toMatchObject({
      ok: false,
      code: "faulted",
      id: "invalid-for-schema",
      applied: [],
    });
    expect(doc.value.log).toEqual([]);
  });

  test("does not trust a previously observed internal origin outside publication", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    let observed: JSONChangeMetadata | undefined;
    const unsubscribe = doc.subscribe((_applied, metadata) => {
      observed = metadata;
    });
    const inbox = createCausalPatchInbox(doc);

    expect(inbox.ingest({
      id: "remote",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "remote" }],
    })).toMatchObject({ ok: true, applied: ["remote"] });
    if (observed?.origin === undefined || observed.mergeKey === undefined) {
      throw new Error("expected inbox origin metadata");
    }
    const observedOrigin = observed.origin;
    const observedMergeKey = observed.mergeKey;

    expect(doc.patch({
      op: "add",
      path: "/log/-",
      value: "spoofed-external",
    }, {
      origin: observedOrigin,
      mergeKey: observedMergeKey,
    })).toEqual({ ok: true });

    expect(inbox.current().status).toBe("diverged");
    unsubscribe();
  });

  test("detects a nested external patch that copies current publication metadata", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    let nested = false;
    const unsubscribe = doc.subscribe((_applied, metadata) => {
      if (nested || metadata?.origin === undefined || metadata.mergeKey === undefined) return;
      nested = true;
      expect(doc.patch({
        op: "add",
        path: "/log/-",
        value: "copied-metadata",
      }, {
        origin: metadata.origin,
        mergeKey: metadata.mergeKey,
      })).toEqual({ ok: true });
    });
    const inbox = createCausalPatchInbox(doc);

    const result = inbox.ingest({
      id: "remote",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "remote" }],
    });

    expect(result).toMatchObject({
      ok: false,
      code: "projection_diverged",
      applied: ["remote"],
    });
    expect(inbox.current()).toMatchObject({
      status: "diverged",
      frontier: ["remote"],
    });
    expect(doc.value.log).toEqual(["remote", "copied-metadata"]);
    unsubscribe();
  });

  test("stops after the current envelope when disposed during publication", () => {
    const doc = createJSONDocument(LogSchema, { log: [] });
    const inbox = createCausalPatchInbox(doc);
    const unsubscribe = doc.subscribe(() => {
      inbox.dispose();
    });

    const result = inbox.ingest([{
      id: "parent",
      dependsOn: [],
      operations: [{ op: "add", path: "/log/-", value: "parent" }],
    }, {
      id: "child",
      dependsOn: ["parent"],
      operations: [{ op: "add", path: "/log/-", value: "child" }],
    }]);

    expect(result).toMatchObject({
      ok: false,
      code: "disposed",
      applied: ["parent"],
    });
    expect(inbox.current()).toEqual({
      status: "disposed",
      frontier: ["parent"],
      queued: [{ id: "child", missing: [] }],
    });
    expect(doc.value.log).toEqual(["parent"]);
    unsubscribe();
  });
});
