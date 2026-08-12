import type {
  ColumnDef,
  RowData,
  Table,
  TableMeta,
  TableOptions,
} from "@tanstack/table-core";
import type { JSONDocument } from "@interactive-os/json-document";
import type {
  EditingResult,
  EditingSnapshot,
  SheetCell,
  SheetClipboard,
  SheetDocument,
  SheetEditor,
  SheetRow,
  SheetSelection,
  SheetTopology,
} from "@interactive-os/json-document-editing";
import { createSheetEditor } from "@interactive-os/json-document-editing";

declare module "@tanstack/table-core" {
  interface TableMeta<TData extends RowData> {
    readonly jsonDocument?: TableDocumentBinding;
  }
}

export type TableDocumentOptions = Pick<
  TableOptions<SheetRow>,
  "data" | "columns" | "getRowId" | "meta"
>;

export interface TableDocumentBinding {
  readonly snapshot: EditingSnapshot<SheetSelection>;
  readonly rows: SheetRow[];
  readonly columns: ColumnDef<SheetRow, unknown>[];
  readonly tableOptions: TableDocumentOptions;
  topology(table: Table<SheetRow>): SheetTopology;
  selectedCells(table: Table<SheetRow>): ReadonlyArray<SheetCell>;
  selectCell(
    table: Table<SheetRow>,
    input: { readonly rowId: string; readonly columnId: string; readonly mode?: "replace" | "extend" | "toggle" },
  ): EditingResult<SheetSelection>;
  fillSelected(table: Table<SheetRow>, value: SheetCell["value"]): EditingResult<SheetSelection>;
  commitCell(input: { readonly rowId: string; readonly columnId: string; readonly value: SheetCell["value"] }): EditingResult<SheetSelection>;
  copy(table: Table<SheetRow>): SheetClipboard | null;
  paste(table: Table<SheetRow>, clipboard: SheetClipboard): EditingResult<SheetSelection>;
  undo(): EditingResult<SheetSelection>;
  redo(): EditingResult<SheetSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<SheetSelection>) => void): () => void;
}

export type TanStackTableConnector = TableDocumentBinding;

/** Official TanStack Table Connector entry point. */
export function createTanStackTableConnector(
  document: JSONDocument,
): TanStackTableConnector {
  return createTableDocumentBinding({ editor: createSheetEditor(document) });
}

export function createTableDocumentBinding(options: {
  readonly editor: SheetEditor;
}): TableDocumentBinding {
  const editor = options.editor;
  let sourceRows: SheetDocument["rows"] | undefined;
  let rows: SheetRow[] = [];
  let sourceColumns: SheetDocument["columns"] | undefined;
  let columns: ColumnDef<SheetRow, unknown>[] = [];

  function sheet(): SheetDocument {
    return editor.snapshot.value as SheetDocument;
  }

  function currentRows(): SheetRow[] {
    const next = sheet().rows;
    if (sourceRows !== next) {
      sourceRows = next;
      rows = [...next];
    }
    return rows;
  }

  function currentColumns(): ColumnDef<SheetRow, unknown>[] {
    const next = sheet().columns;
    if (sourceColumns !== next) {
      sourceColumns = next;
      columns = next.map((column) => ({
        id: column.id,
        header: column.label,
        accessorFn: (row) => row.cells[column.id],
      }));
    }
    return columns;
  }

  function topology(table: Table<SheetRow>): SheetTopology {
    const document = sheet();
    const rowIds = new Set(document.rows.map((row) => row.id));
    const columnIds = new Set(document.columns.map((column) => column.id));
    return {
      rowIds: table.getRowModel().rows.map((row) => row.id).filter((id) => rowIds.has(id)),
      columnIds: table.getVisibleLeafColumns().map((column) => column.id).filter((id) => columnIds.has(id)),
    };
  }

  const binding: TableDocumentBinding = {
    get snapshot() { return editor.snapshot; },
    get rows() { return currentRows(); },
    get columns() { return currentColumns(); },
    get tableOptions() {
      return {
        data: currentRows(),
        columns: currentColumns(),
        getRowId: (row: SheetRow) => row.id,
        meta: { jsonDocument: binding } satisfies TableMeta<SheetRow>,
      };
    },
    topology,
    selectedCells: (table) => editor.selectedCellsIn(topology(table)),
    selectCell(table, input) {
      return editor.dispatch({ type: "selection.set", ...input });
    },
    fillSelected(table, value) {
      return editor.dispatch({
        type: "selection.fill",
        value,
        topology: topology(table),
      });
    },
    commitCell(input) {
      return editor.dispatch({
        type: "cell.commit",
        rowId: input.rowId,
        columnId: input.columnId,
        value: input.value,
      });
    },
    copy: (table) => editor.copy(topology(table)),
    paste: (table, clipboard) => editor.dispatch({
      type: "clipboard.paste",
      clipboard,
      topology: topology(table),
    }),
    undo: () => editor.undo(),
    redo: () => editor.redo(),
    subscribe: (listener) => editor.subscribe(listener),
  };

  return binding;
}
