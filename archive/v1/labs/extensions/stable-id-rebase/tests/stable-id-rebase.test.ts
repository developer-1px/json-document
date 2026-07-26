import { describe, expect, expectTypeOf, test } from "vitest";
import * as z from "zod";

import {
  createJSONDocument,
  type Pointer,
  type SelectionPoint,
  type SelectionPointObject,
} from "@interactive-os/json-document/session";
import {
  createIdResolver,
} from "@interactive-os/json-document-id-resolver";
import {
  rebaseStableChange,
  type StableIdReplaceInput,
  type StableIdRebaseResult,
} from "../src/index.js";

const Card = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string().optional(),
  details: z.union([
    z.object({ cursor: z.string() }),
    z.object({ label: z.string() }),
  ]).optional(),
});
const Board = z.object({
  columns: z.array(z.object({
    id: z.string(),
    cards: z.array(Card),
  })),
});

const CARD_SCOPES = [{
  scope: "card",
  query: "$.columns[*].cards[*]",
  readId: (value: unknown) => Card.safeParse(value).data?.id,
}];

function createBoard() {
  return createJSONDocument(Board, {
    columns: [{
      id: "todo",
      cards: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
    }, {
      id: "done",
      cards: [
        { id: "c", title: "C" },
      ],
    }],
  }, {
    history: 10,
    selection: {
      mode: "single",
      initial: ["/columns/0/cards/1/title"],
    },
  });
}

function createCardIds(doc: ReturnType<typeof createBoard>) {
  return createIdResolver(doc, { scopes: CARD_SCOPES });
}

function rebaseCardChange(
  doc: ReturnType<typeof createBoard>,
  input: Omit<StableIdReplaceInput<SelectionPoint>, "scopes">,
) {
  return rebaseStableChange(doc, {
    scopes: CARD_SCOPES,
    ...input,
  });
}

describe("@interactive-os/json-document-stable-id-rebase", () => {
  test("depends only on the stable-id current-projection port", () => {
    const document = createBoard();
    const port = {
      at: document.at,
      canPatch: document.canPatch,
      query: document.query,
      get value() {
        return document.value;
      },
    };

    expect(rebaseStableChange(port, {
      scopes: CARD_SCOPES,
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: "Reviewed",
    })).toMatchObject({
      ok: true,
      operations: [
        { op: "test", path: "/columns/0/cards/1" },
        { op: "test", path: "/columns/0/cards/1/title", value: "B" },
        { op: "replace", path: "/columns/0/cards/1/title", value: "Reviewed" },
      ],
    });
  });

  test("preserves pointer-only result types while adding point overloads", () => {
    expectTypeOf<Parameters<typeof rebaseStableChange>[1]>()
      .toEqualTypeOf<StableIdReplaceInput>();
    expectTypeOf<ReturnType<typeof rebaseStableChange>>()
      .toEqualTypeOf<StableIdRebaseResult>();
    const doc = createBoard();
    const pointerPlan = rebaseStableChange(doc, {
      scopes: CARD_SCOPES,
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: "Reviewed",
      relativeSelectionAfter: "/title",
    });
    const pointPlan = rebaseStableChange(doc, {
      scopes: CARD_SCOPES,
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: "Reviewed",
      relativeSelectionAfter: { path: "/title", offset: 1 },
    });
    if (pointerPlan.ok) {
      expectTypeOf(pointerPlan.selectionAfter)
        .toEqualTypeOf<Pointer | undefined>();
    }
    if (pointPlan.ok) {
      expectTypeOf(pointPlan.selectionAfter)
        .toEqualTypeOf<SelectionPointObject | undefined>();
    }
  });

  test("materializes a delayed field change at the stable target's current pointer", () => {
    const doc = createBoard();
    expect(doc.move(
      "/columns/0/cards/1",
      "/columns/1/cards/-",
    )).toMatchObject({ ok: true });

    const planned = rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: "Reviewed",
      relativeSelectionAfter: "/title",
    });

    expect(planned).toEqual({
      ok: true,
      operations: [
        {
          op: "test",
          path: "/columns/1/cards/1",
          value: { id: "b", title: "B" },
        },
        {
          op: "test",
          path: "/columns/1/cards/1/title",
          value: "B",
        },
        {
          op: "replace",
          path: "/columns/1/cards/1/title",
          value: "Reviewed",
        },
      ],
      selectionAfter: "/columns/1/cards/1/title",
      diagnostics: [],
    });

    if (!planned.ok || planned.selectionAfter === undefined) {
      throw new Error("expected a stable selection plan");
    }
    expect(doc.commit(planned.operations, {
      selectionAfter: planned.selectionAfter,
    })).toEqual({ ok: true });
    expect(doc.value.columns[1]?.cards[1]).toEqual({
      id: "b",
      title: "Reviewed",
    });
    expect(doc.selection?.primaryPointer).toBe("/columns/1/cards/1/title");
  });

  test("joins a relative selection point path and preserves caret metadata", () => {
    const doc = createBoard();
    expect(doc.move(
      "/columns/0/cards/1",
      "/columns/1/cards/-",
    )).toMatchObject({ ok: true });

    expect(rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: "Reviewed",
      relativeSelectionAfter: {
        path: "/title",
        offset: 4,
        affinity: "backward",
      },
    })).toEqual({
      ok: true,
      operations: [
        {
          op: "test",
          path: "/columns/1/cards/1",
          value: { id: "b", title: "B" },
        },
        {
          op: "test",
          path: "/columns/1/cards/1/title",
          value: "B",
        },
        {
          op: "replace",
          path: "/columns/1/cards/1/title",
          value: "Reviewed",
        },
      ],
      selectionAfter: {
        path: "/columns/1/cards/1/title",
        offset: 4,
        affinity: "backward",
      },
      diagnostics: [],
    });
  });

  test("returns a structured failure for invalid relative point metadata", () => {
    const doc = createBoard();

    expect(rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: "Reviewed",
      relativeSelectionAfter: {
        path: "/title",
        affinity: "sideways",
      } as never,
    })).toEqual({
      ok: false,
      code: "invalid_change",
      reason: "invalid relative selection point",
      pointer: "/title",
    });
  });

  test("reports a conflict when the stable field changed while the input was delayed", () => {
    const doc = createBoard();
    expect(doc.replace(
      "/columns/0/cards/1/title",
      "Remote",
    )).toMatchObject({ ok: true });

    const planned = rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: "Local",
    });

    expect(planned).toMatchObject({
      ok: false,
      code: "target_changed",
      pointer: "/columns/0/cards/1/title",
      capability: {
        ok: false,
        code: "test_failed",
      },
    });
    expect(doc.value.columns[0]?.cards[1]?.title).toBe("Remote");
    expect(doc.history.undoDepth).toBe(1);
  });

  test("reports a removed authored field as a target conflict", () => {
    const doc = createBoard();
    expect(doc.patch({
      op: "add",
      path: "/columns/0/cards/1/status",
      value: "draft",
    })).toEqual({ ok: true });
    expect(doc.delete(
      "/columns/0/cards/1/status",
    )).toMatchObject({ ok: true });

    expect(rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/status",
      expected: "draft",
      value: "local",
    })).toMatchObject({
      ok: false,
      code: "target_changed",
      pointer: "/columns/0/cards/1/status",
      capability: {
        ok: false,
        code: "path_not_found",
      },
    });
  });

  test("preserves a concurrent change to another field on the stable entity", () => {
    const doc = createBoard();
    expect(doc.patch({
      op: "add",
      path: "/columns/0/cards/1/status",
      value: "remote",
    })).toEqual({ ok: true });

    const planned = rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: "Local",
    });
    if (!planned.ok) throw new Error(planned.reason);

    expect(planned.operations[0]).toEqual({
      op: "test",
      path: "/columns/0/cards/1",
      value: { id: "b", title: "B", status: "remote" },
    });
    expect(doc.commit(planned.operations)).toEqual({ ok: true });
    expect(doc.value.columns[0]?.cards[1]).toEqual({
      id: "b",
      title: "Local",
      status: "remote",
    });
  });

  test("guards a wrong slot after another stable-target reorder", () => {
    const doc = createBoard();
    expect(doc.replace(
      "/columns/0/cards/0/title",
      "B",
    )).toMatchObject({ ok: true });
    const planned = rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: "Local",
      relativeSelectionAfter: "/title",
    });
    if (!planned.ok || planned.selectionAfter === undefined) {
      throw new Error("expected a guarded stable-id plan");
    }

    expect(doc.move(
      "/columns/0/cards/1",
      "/columns/0/cards/0",
    )).toMatchObject({ ok: true });
    const selectionBeforeCommit = doc.selection?.primaryPointer;
    const historyBeforeCommit = doc.history.undoDepth;

    expect(doc.commit(planned.operations, {
      selectionAfter: planned.selectionAfter,
    })).toMatchObject({
      ok: false,
      code: "test_failed",
    });
    expect(doc.value.columns[0]?.cards).toEqual([
      { id: "b", title: "B" },
      { id: "a", title: "B" },
    ]);
    expect(doc.selection?.primaryPointer).toBe(selectionBeforeCommit);
    expect(doc.history.undoDepth).toBe(historyBeforeCommit);
  });

  test("reports a schema-validation reentry move as a target conflict", () => {
    let doc: ReturnType<typeof createBoard> | undefined;
    let moveDuringValidation = false;
    const ReentrantBoard = Board.superRefine(() => {
      if (!moveDuringValidation || doc === undefined) return;
      moveDuringValidation = false;
      expect(doc.move(
        "/columns/0/cards/1",
        "/columns/0/cards/0",
      )).toMatchObject({ ok: true });
    });
    doc = createJSONDocument(ReentrantBoard, {
      columns: [{
        id: "todo",
        cards: [
          { id: "a", title: "A" },
          { id: "b", title: "B" },
        ],
      }, {
        id: "done",
        cards: [
          { id: "c", title: "C" },
        ],
      }],
    }, { history: 10 });
    moveDuringValidation = true;

    expect(rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: "Local",
    })).toMatchObject({
      ok: false,
      code: "target_changed",
      pointer: "/columns/0/cards/1/title",
      capability: {
        ok: false,
        code: "test_failed",
      },
    });
    expect(doc.value.columns[0]?.cards).toEqual([
      { id: "b", title: "B" },
      { id: "a", title: "A" },
    ]);
    expect(doc.history.undoDepth).toBe(1);
  });

  test("reports a missing stable identity instead of using its former pointer", () => {
    const doc = createBoard();
    expect(doc.delete("/columns/0/cards/1")).toMatchObject({ ok: true });

    expect(rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: "Local",
    })).toEqual({
      ok: false,
      code: "identity_resolution_failed",
      reason: "id not found in scope card: b",
      identityCode: "id_not_found",
      scope: "card",
      id: "b",
    });
    expect(doc.value.columns[0]?.cards).toEqual([
      { id: "a", title: "A" },
    ]);
  });

  test("reports every pointer when a stable identity becomes ambiguous", () => {
    const doc = createBoard();
    expect(doc.replace(
      "/columns/1/cards/0/id",
      "b",
    )).toMatchObject({ ok: true });

    expect(rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: "Local",
    })).toEqual({
      ok: false,
      code: "identity_resolution_failed",
      reason: "id is duplicated in scope card: b",
      identityCode: "ambiguous_id",
      scope: "card",
      id: "b",
      pointers: [
        "/columns/0/cards/1",
        "/columns/1/cards/0",
      ],
    });
  });

  test("rejects stable entity root replacement outside the field-change scope", () => {
    const doc = createBoard();
    const ids = createCardIds(doc);

    expect(rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "",
      expected: { id: "b", title: "B" },
      value: { id: "other", title: "Local" },
    })).toEqual({
      ok: false,
      code: "invalid_change",
      reason: "stable entity root replacement is not supported",
      pointer: "",
    });
    expect(ids.resolve("card", "b")).toMatchObject({ ok: true });
  });

  test("rejects a field replacement that changes the resolver-owned identity", () => {
    const doc = createBoard();
    const ids = createCardIds(doc);

    expect(rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/id",
      expected: "b",
      value: "other",
    })).toEqual({
      ok: false,
      code: "identity_changed",
      reason: "stable change would alter identity card:b",
      scope: "card",
      id: "b",
      pointer: "/columns/0/cards/1",
    });
    expect(ids.resolve("card", "b")).toMatchObject({ ok: true });
    expect(ids.resolve("card", "other")).toMatchObject({
      ok: false,
      code: "id_not_found",
    });
  });

  test("returns the document schema failure without producing a plan", () => {
    const doc = createBoard();

    expect(rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: 42,
    })).toMatchObject({
      ok: false,
      code: "change_patch_failed",
      capability: {
        ok: false,
        code: "schema_violation",
      },
    });
    expect(doc.value.columns[0]?.cards[1]).toEqual({
      id: "b",
      title: "B",
    });
  });

  test("returns a structured failure for a non-JSON replacement value", () => {
    const doc = createBoard();

    expect(() => rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: 1n,
    })).not.toThrow();
    expect(rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/title",
      expected: "B",
      value: 1n,
    })).toMatchObject({
      ok: false,
      code: "change_patch_failed",
      capability: {
        ok: false,
        code: "not_serializable",
      },
    });
  });

  test("drops an anchored selection that will not exist after the change", () => {
    const doc = createBoard();
    expect(doc.patch({
      op: "add",
      path: "/columns/0/cards/1/details",
      value: { cursor: "inside" },
    })).toEqual({ ok: true });

    const planned = rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/details",
      expected: { cursor: "inside" },
      value: { label: "replaced" },
      relativeSelectionAfter: "/details/cursor",
    });

    expect(planned).toMatchObject({
      ok: true,
      diagnostics: [{
        code: "selection_dropped",
        reason: "stable selection target will not exist after the change",
        pointer: "/columns/0/cards/1/details/cursor",
      }],
    });
    expect(planned).not.toHaveProperty("selectionAfter");
  });

  test("canonicalizes URI-fragment paths before joining them to the stable target", () => {
    const doc = createBoard();

    expect(rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "#/title",
      expected: "B",
      value: "Local",
      relativeSelectionAfter: "#/title",
    })).toMatchObject({
      ok: true,
      operations: [
        { op: "test", path: "/columns/0/cards/1" },
        { op: "test", path: "/columns/0/cards/1/title" },
        { op: "replace", path: "/columns/0/cards/1/title" },
      ],
      selectionAfter: "/columns/0/cards/1/title",
      diagnostics: [],
    });
  });

  test("owns returned guard and replacement values independently from input aliases", () => {
    const doc = createBoard();
    expect(doc.patch({
      op: "add",
      path: "/columns/0/cards/1/details",
      value: { cursor: "before" },
    })).toEqual({ ok: true });
    const expected = { cursor: "before" };
    const value = { label: "planned" };

    const planned = rebaseCardChange(doc, {
      target: { scope: "card", id: "b" },
      relativePath: "/details",
      expected,
      value,
    });
    if (!planned.ok) throw new Error(planned.reason);
    expected.cursor = "mutated";
    value.label = "mutated";

    expect(doc.commit(planned.operations)).toEqual({ ok: true });
    expect(doc.value.columns[0]?.cards[1]?.details).toEqual({
      label: "planned",
    });
  });
});
