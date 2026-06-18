import { describe, expect, test, vi } from "vitest";
import * as z from "zod";

import {
  createJSONDocument,
  JSONDocumentError,
  type JSONPatchOperation,
  type SelectionSnap,
} from "@interactive-os/json-document";

const Card = z.object({
  id: z.string(),
  title: z.string(),
});

const Board = z.object({
  columns: z.array(z.object({
    id: z.string(),
    title: z.string(),
    cards: z.array(Card),
  })),
});

type BoardValue = z.output<typeof Board>;

const initialBoard: BoardValue = {
  columns: [
    {
      id: "todo",
      title: "Todo",
      cards: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
    },
    {
      id: "done",
      title: "Done",
      cards: [
        { id: "c", title: "C" },
      ],
    },
  ],
};

const selectedSecondCard: SelectionSnap = {
  selectedPointers: ["/columns/0/cards/1"],
  selectionRanges: [{ anchor: "/columns/0/cards/1", focus: "/columns/0/cards/1" }],
  primaryIndex: 0,
  anchor: "/columns/0/cards/1",
  focus: "/columns/0/cards/1",
};

function createBoardDocument(options: { strict?: boolean; onError?: (error: JSONDocumentError) => void } = {}) {
  return createJSONDocument(Board, initialBoard, {
    history: 20,
    selection: { mode: "multiple", initial: ["/columns/0/cards/0"] },
    ...options,
  });
}

describe("json-document 1.0 semantic contract fixtures", () => {
  test("locks stable result code families without depending on reason text", () => {
    const doc = createBoardDocument();

    const jsonPathAsMutationTarget: JSONPatchOperation = {
      op: "replace",
      path: "$.columns[0]",
      value: { id: "bad", title: "Bad", cards: [] },
    };
    expect(doc.patch(jsonPathAsMutationTarget)).toMatchObject({
      ok: false,
      code: "invalid_pointer",
    });

    expect(doc.canReplace("/columns/0/cards/0/title", 1)).toMatchObject({
      ok: false,
      code: "schema_violation",
      violations: [{ path: "/columns/0/cards/0/title", message: expect.any(String) }],
    });

    expect(doc.canUndo()).toMatchObject({
      ok: false,
      code: "empty_stack",
    });
    expect(doc.paste("/columns/1/cards/-")).toMatchObject({
      ok: false,
      code: "empty_clipboard",
    });
    expect(doc.clipboard.write({ run: () => undefined })).toMatchObject({
      ok: false,
      code: "not_serializable",
    });
  });

  test("locks strict policy and failed mutation atomicity", () => {
    const defaultDoc = createBoardDocument();
    expect(defaultDoc.patch({
      op: "replace",
      path: "/columns/0/cards/0/title",
      value: 1,
    })).toMatchObject({
      ok: false,
      code: "schema_violation",
    });
    expect(defaultDoc.value).toEqual(initialBoard);

    const onError = vi.fn();
    const strictDoc = createBoardDocument({ strict: true, onError });
    expect(() => strictDoc.patch({
      op: "replace",
      path: "/columns/0/cards/0/title",
      value: 1,
    })).toThrow(JSONDocumentError);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(strictDoc.value).toEqual(initialBoard);

    const atomicDoc = createBoardDocument();
    const beforeSelection = atomicDoc.selection?.snapshot();
    const observed: Array<unknown> = [];
    atomicDoc.subscribe((patch, metadata) => observed.push({ patch, metadata }));

    expect(atomicDoc.commit([{
      op: "replace",
      path: "/columns/0/cards/0/title",
      value: 1,
    }], {
      label: "invalid semantic fixture",
      selectionAfter: selectedSecondCard,
    })).toMatchObject({
      ok: false,
      code: "schema_violation",
    });

    expect(atomicDoc.value).toEqual(initialBoard);
    expect(atomicDoc.selection?.snapshot()).toEqual(beforeSelection);
    expect(atomicDoc.history.undoDepth).toBe(0);
    expect(observed).toEqual([]);
  });

  test("locks clipboard spread and selection history semantics", () => {
    const clipboardDoc = createBoardDocument();

    expect(clipboardDoc.copy(["/columns/0/cards/0", "/columns/0/cards/1"])).toMatchObject({
      ok: true,
      sources: ["/columns/0/cards/0", "/columns/0/cards/1"],
    });
    expect(clipboardDoc.paste("/columns/1/cards/-")).toMatchObject({ ok: true });
    expect(clipboardDoc.value.columns[1]?.cards.map((card) => card.id)).toEqual(["c", "a", "b"]);

    const selectionDoc = createBoardDocument();
    expect(selectionDoc.commit([{
      op: "replace",
      path: "/columns/0/cards/0/title",
      value: "A1",
    }], {
      label: "semantic selection fixture",
      selectionAfter: selectedSecondCard,
    })).toEqual({ ok: true });

    expect(selectionDoc.selection?.snapshot()).toEqual(selectedSecondCard);
    expect(selectionDoc.undo()).toEqual({ ok: true });
    expect(selectionDoc.selection?.selectedPointers).toEqual(["/columns/0/cards/0"]);
    expect(selectionDoc.redo()).toEqual({ ok: true });
    expect(selectionDoc.selection?.snapshot()).toEqual(selectedSecondCard);
  });
});
