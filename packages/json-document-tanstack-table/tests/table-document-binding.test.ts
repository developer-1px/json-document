import {
  createTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/table-core";
import {
  createSheetEditor,
  type SheetDocument,
  type SheetRow,
} from "@interactive-os/json-document-editing";
import { createJSONDocument } from "@interactive-os/json-document";
import { describe, expect, test } from "vitest";
import {
  createTableDocumentBinding,
  createTanStackTableConnector,
} from "../src/index.js";

const initial: SheetDocument = {
  columns: [
    { id: "name", label: "Name" },
    { id: "status", label: "Status" },
    { id: "score", label: "Score" },
  ],
  rows: [
    { id: "r1", cells: { name: "Alpha", status: "Draft", score: 1 } },
    { id: "r2", cells: { name: "Beta", status: "Ready", score: 2 } },
    { id: "r3", cells: { name: "Gamma", status: "Ready", score: 3 } },
  ],
};

describe("TanStack Table document binding", () => {
  test("connects the official entry point to the provided JSONDocument", () => {
    const document = createJSONDocument(initial);
    const binding = createTanStackTableConnector(document);

    expect(binding.commitCell({ rowId: "r1", columnId: "status", value: "Ready" }).ok).toBe(true);
    expect(document.at("/rows/0/cells/status")).toEqual({
      ok: true,
      path: "/rows/0/cells/status",
      value: "Ready",
    });

    document.commit([{ op: "replace", path: "/rows/1/cells/status", value: "Done" }]);
    expect(binding.snapshot.value).toBe(document.value);
  });

  test("isolates official Connectors backed by different document identities", () => {
    const first = createJSONDocument(initial);
    const second = createJSONDocument(initial);
    const firstConnector = createTanStackTableConnector(first);
    const secondConnector = createTanStackTableConnector(second);

    firstConnector.commitCell({ rowId: "r1", columnId: "status", value: "Done" });

    expect(first.value).not.toEqual(second.value);
    expect(secondConnector.snapshot.revision).toBe(0);
  });

  test("projects stable rows and commits editable cells through the Sheet editor", () => {
    const editor = createSheetEditor(initial);
    const binding = createTableDocumentBinding({ editor });
    const table = createSheetTable(binding);

    expect(table.getRowModel().rows.map((row) => row.id)).toEqual(["r1", "r2", "r3"]);
    expect(table.options.meta?.jsonDocument).toBe(binding);
    expect(binding.commitCell({ rowId: "r2", columnId: "score", value: 20 }).ok).toBe(true);
    expect((editor.snapshot.value as SheetDocument).rows[1]?.cells.score).toBe(20);

    table.setOptions((previous) => ({ ...previous, ...binding.tableOptions }));
    expect(table.getRow("r2").getValue("score")).toBe(20);
  });

  test("uses sorted, filtered, and visible column order for Sheet topology", () => {
    const editor = createSheetEditor(initial);
    const binding = createTableDocumentBinding({ editor });
    const sorting: SortingState = [{ id: "score", desc: true }];
    const columnFilters: ColumnFiltersState = [{ id: "status", value: "Ready" }];
    const table = createSheetTable(binding, {
      sorting,
      columnFilters,
      columnOrder: ["score", "name", "status"],
      columnVisibility: { status: false },
    });

    expect(binding.topology(table)).toEqual({
      rowIds: ["r3", "r2"],
      columnIds: ["score", "name"],
    });

    binding.selectCell(table, { rowId: "r3", columnId: "score" });
    binding.selectCell(table, { rowId: "r2", columnId: "name", mode: "extend" });
    expect(binding.selectedCells(table)).toEqual([
      { rowId: "r3", columnId: "score", value: 3 },
      { rowId: "r3", columnId: "name", value: "Gamma" },
      { rowId: "r2", columnId: "score", value: 2 },
      { rowId: "r2", columnId: "name", value: "Beta" },
    ]);
    expect(binding.copy(table)?.text).toBe("3\tGamma\n2\tBeta");

    const cut = binding.cut(table);
    expect(cut?.clipboard.text).toBe("3\tGamma\n2\tBeta");
    expect((editor.snapshot.value as SheetDocument).rows.map((row) => row.cells)).toEqual([
      { name: "Alpha", status: "Draft", score: 1 },
      { name: null, status: "Ready", score: null },
      { name: null, status: "Ready", score: null },
    ]);
    expect(binding.undo().ok).toBe(true);
    expect(editor.snapshot.value).toEqual(initial);
  });

  test("pastes one visible rectangle and restores JSON with selection", () => {
    const editor = createSheetEditor(initial);
    const binding = createTableDocumentBinding({ editor });
    const table = createSheetTable(binding, {
      sorting: [{ id: "score", desc: true }],
      columnOrder: ["score", "name", "status"],
      columnVisibility: { status: false },
    });
    binding.selectCell(table, { rowId: "r3", columnId: "score" });

    expect(binding.paste(table, {
      type: "application/vnd.interactive-os.sheet+json",
      cells: [[30, "G"], [20, "B"]],
      text: "30\tG\n20\tB",
    }).ok).toBe(true);
    expect((editor.snapshot.value as SheetDocument).rows.map((row) => row.cells)).toEqual([
      { name: "Alpha", status: "Draft", score: 1 },
      { name: "B", status: "Ready", score: 20 },
      { name: "G", status: "Ready", score: 30 },
    ]);
    expect(editor.snapshot.selection).toEqual({
      kind: "range",
      anchor: { rowId: "r3", columnId: "score" },
      focus: { rowId: "r2", columnId: "name" },
      ranges: [{
        anchor: { rowId: "r3", columnId: "score" },
        focus: { rowId: "r2", columnId: "name" },
      }],
      primaryIndex: 0,
    });

    expect(binding.undo().ok).toBe(true);
    expect(editor.snapshot.value).toEqual(initial);
    expect(editor.snapshot.selection).toEqual({
      kind: "range",
      anchor: { rowId: "r3", columnId: "score" },
      focus: { rowId: "r3", columnId: "score" },
      ranges: [{
        anchor: { rowId: "r3", columnId: "score" },
        focus: { rowId: "r3", columnId: "score" },
      }],
      primaryIndex: 0,
    });
  });

  test("fills disjoint ranges in the current visible topology", () => {
    const editor = createSheetEditor(initial);
    const binding = createTableDocumentBinding({ editor });
    const table = createSheetTable(binding, {
      sorting: [{ id: "score", desc: true }],
      columnOrder: ["score", "name", "status"],
      columnVisibility: { status: false },
    });

    binding.selectCell(table, { rowId: "r3", columnId: "score" });
    binding.selectCell(table, { rowId: "r2", columnId: "name", mode: "extend" });
    binding.selectCell(table, { rowId: "r1", columnId: "score", mode: "toggle" });

    expect(binding.fillSelected(table, "Selected").ok).toBe(true);
    expect((editor.snapshot.value as SheetDocument).rows.map((row) => row.cells)).toEqual([
      { name: "Alpha", status: "Draft", score: "Selected" },
      { name: "Selected", status: "Ready", score: "Selected" },
      { name: "Selected", status: "Ready", score: "Selected" },
    ]);
    expect(editor.snapshot.selection.ranges).toHaveLength(2);

    binding.selectCell(table, { rowId: "r1", columnId: "name" });
    expect(binding.undo().ok).toBe(true);
    expect(editor.snapshot.value).toEqual(initial);
    expect(editor.snapshot.selection.ranges).toHaveLength(2);
  });
});

function createSheetTable(
  binding: ReturnType<typeof createTableDocumentBinding> | ReturnType<typeof createTanStackTableConnector>,
  state: {
    readonly sorting?: SortingState;
    readonly columnFilters?: ColumnFiltersState;
    readonly columnOrder?: string[];
    readonly columnVisibility?: Record<string, boolean>;
  } = {},
) {
  return createTable<SheetRow>({
    ...binding.tableOptions,
    state,
    onStateChange: () => undefined,
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
}
