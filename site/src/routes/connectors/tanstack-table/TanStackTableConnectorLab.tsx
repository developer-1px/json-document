import { useState, type ClipboardEvent, type FocusEvent, type MouseEvent } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import {
  createSheetEditor,
  type SheetClipboard,
  type SheetDocument,
  type SheetEditor,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { createTableDocumentBinding } from "@interactive-os/json-document-tanstack-table";
import {
  createWebClipboardBinding,
  selectionOperationFromModifiers,
  sheetClipboardCodec,
} from "@interactive-os/json-document-web";
import { CodeBlock } from "../../../shared/ui/code-block";
import { JsonInspector } from "../../../shared/ui/json-inspector";
import { Button } from "../../../shared/ui/primitives";
import { classes, ui } from "../../../shared/ui/styles";

const initialSheet: SheetDocument = {
  columns: [
    { id: "name", label: "Name" },
    { id: "status", label: "Status" },
    { id: "score", label: "Score" },
  ],
  rows: [
    { id: "r1", cells: { name: "Alpha", status: "Draft", score: 1 } },
    { id: "r2", cells: { name: "Beta", status: "Ready", score: 2 } },
    { id: "r3", cells: { name: "Gamma", status: "Ready", score: 3 } },
    { id: "r4", cells: { name: "Delta", status: "Done", score: 4 } },
  ],
};

export function TanStackTableConnectorLab() {
  const [editor] = useState<SheetEditor>(() => createSheetEditor(initialSheet));
  const [binding] = useState(() => createTableDocumentBinding({ editor }));
  const snapshot = useEditingSnapshot(binding);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>(["name", "status", "score"]);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [clipboard, setClipboard] = useState<SheetClipboard | null>(null);
  const [announcement, setAnnouncement] = useState("Ready");
  const table = useReactTable({
    ...binding.tableOptions,
    state: { sorting, columnFilters, columnOrder, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const webClipboard = createWebClipboardBinding({
    codec: sheetClipboardCodec,
    read: () => binding.copy(table),
    paste: (payload) => binding.paste(table, payload),
  });
  const selected = new Set(binding.selectedCells(table).map((cell) => `${cell.rowId}\u0000${cell.columnId}`));

  function run(action: () => { readonly ok: boolean }, message: string) {
    const result = action();
    setAnnouncement(result.ok ? message : "That action is not available here");
  }

  function selectCell(event: MouseEvent, rowId: string, columnId: string) {
    const mode = selectionOperationFromModifiers(event);
    run(
      () => binding.selectCell(table, { rowId, columnId, mode }),
      mode === "extend" ? "Visible range extended" : mode === "toggle" ? "Visible range toggled" : "Cell selected",
    );
  }

  function commitCell(event: FocusEvent<HTMLInputElement>, rowId: string, columnId: string, current: unknown) {
    const value = typeof current === "number" ? Number(event.currentTarget.value) : event.currentTarget.value;
    if (Object.is(value, current)) return;
    run(() => binding.commitCell({ rowId, columnId, value }), `${columnId} committed`);
  }

  function copySelection() {
    const next = binding.copy(table);
    if (next === null) return setAnnouncement("Select a visible cell first");
    setClipboard(next);
    setAnnouncement(`Copied ${next.cells.length} × ${next.cells[0]?.length ?? 0} visible cells`);
  }

  function pasteSelection() {
    if (clipboard === null) return;
    run(() => binding.paste(table, clipboard), "Pasted visible rectangle");
  }

  function handleNativeCopy(event: ClipboardEvent<HTMLElement>) {
    const result = webClipboard.copy(event);
    if (!result.ok) return setAnnouncement(result.code);
    setClipboard(result.payload);
    setAnnouncement(`Copied ${result.payload.cells.length} × ${result.payload.cells[0]?.length ?? 0} structured visible cells`);
  }

  function handleNativePaste(event: ClipboardEvent<HTMLElement>) {
    const result = webClipboard.paste(event);
    setAnnouncement(result.ok ? "Pasted structured visible rectangle" : result.code);
  }

  return (
    <section
      aria-label="TanStack Table editing"
      onCopy={handleNativeCopy}
      onPaste={handleNativePaste}
      className={classes("p-4", ui.surface.raised)}
    >
      <div className="mb-3 flex flex-wrap gap-2" role="toolbar" aria-label="TanStack view and editing actions">
        <Control label="Ready rows" active={columnFilters.length > 0} onClick={() => setColumnFilters((current) => current.length === 0 ? [{ id: "status", value: "Ready" }] : [])} />
        <Control label="Score descending" active={sorting.length > 0} onClick={() => setSorting((current) => current.length === 0 ? [{ id: "score", desc: true }] : [])} />
        <Control label="Score first" active={columnOrder[0] === "score"} onClick={() => setColumnOrder((current) => current[0] === "score" ? ["name", "status", "score"] : ["score", "name", "status"])} />
        <Control label="Hide status" active={columnVisibility.status === false} onClick={() => setColumnVisibility((current) => ({ ...current, status: current.status === false }))} />
        <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
        <Control label="Copy" onClick={copySelection} />
        <Control label="Paste" disabled={clipboard === null} onClick={pasteSelection} />
        <Control label="Fill selected" onClick={() => run(
          () => binding.fillSelected(table, "Selected"),
          "Visible selected cells filled",
        )} />
        <Control label="Undo" disabled={!snapshot.canUndo} onClick={() => run(binding.undo, "Undone")} />
        <Control label="Redo" disabled={!snapshot.canRedo} onClick={() => run(binding.redo, "Redone")} />
      </div>

      <div className={classes("mb-3 flex flex-wrap justify-between gap-2", ui.text.meta)}>
        <output aria-live="polite">{announcement}</output>
        <output data-testid="tanstack-topology">{JSON.stringify(binding.topology(table))}</output>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <div className="overflow-auto">
          <table role="grid" aria-label="TanStack project sheet" aria-multiselectable="true" className={classes("w-full min-w-[30rem]", ui.surface.table, ui.text.body)}>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th key={header.id} scope="col" className={classes("px-3 py-2 text-left", ui.surface.gridHead, ui.text.heading)}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} data-row-id={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const isSelected = selected.has(`${row.id}\u0000${cell.column.id}`);
                    const value = row.original.cells[cell.column.id];
                    return (
                      <td
                        key={cell.id}
                        role="gridcell"
                        aria-selected={isSelected}
                        data-row-id={row.id}
                        data-column-id={cell.column.id}
                        data-selected={isSelected ? "true" : "false"}
                        onClick={(event) => selectCell(event, row.id, cell.column.id)}
                        className={classes("p-0", ui.surface.gridCell, ui.state.selected)}
                      >
                        <input
                          aria-label={`${cell.column.id} ${row.id}`}
                          defaultValue={displayValue(value)}
                          key={displayValue(value)}
                          onBlur={(event) => commitCell(event, row.id, cell.column.id, value)}
                          className={classes("w-full min-w-0", ui.field.seamless)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <CodeBlock className="mt-3" language="text" size="compact" source={clipboard?.text ?? "Clipboard is empty"} testId="tanstack-clipboard" />
        </div>

        <aside className="grid min-w-0 gap-3" aria-label="Canonical JSON">
          <JsonInspector label="Canonical JSON" signal={`revision ${snapshot.revision}`} value={snapshot.value} testId="tanstack-document-json" size="tall" />
          <JsonInspector label="Selection" meta={`${snapshot.selection.ranges.length} ranges`} value={snapshot.selection} testId="tanstack-selection-json" size="compact" />
        </aside>
      </div>
    </section>
  );
}

function Control(props: { readonly label: string; readonly active?: boolean; readonly disabled?: boolean; readonly onClick: () => void }) {
  return <Button kind="toggle" aria-pressed={props.active} disabled={props.disabled} onClick={props.onClick}>{props.label}</Button>;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}
