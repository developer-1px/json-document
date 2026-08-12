import { useState, type FocusEvent, type MouseEvent } from "react";
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
  const selected = new Set(binding.selectedCells(table).map((cell) => `${cell.rowId}\u0000${cell.columnId}`));

  function run(action: () => { readonly ok: boolean }, message: string) {
    const result = action();
    setAnnouncement(result.ok ? message : "That action is not available here");
  }

  function selectCell(event: MouseEvent, rowId: string, columnId: string) {
    const mode = event.shiftKey
      ? "extend"
      : event.metaKey || event.ctrlKey
        ? "toggle"
        : "replace";
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

  return (
    <section aria-label="TanStack Table editing" className="rounded border border-stone-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap gap-2" role="toolbar" aria-label="TanStack view and editing actions">
        <Control label="Ready rows" active={columnFilters.length > 0} onClick={() => setColumnFilters((current) => current.length === 0 ? [{ id: "status", value: "Ready" }] : [])} />
        <Control label="Score descending" active={sorting.length > 0} onClick={() => setSorting((current) => current.length === 0 ? [{ id: "score", desc: true }] : [])} />
        <Control label="Score first" active={columnOrder[0] === "score"} onClick={() => setColumnOrder((current) => current[0] === "score" ? ["name", "status", "score"] : ["score", "name", "status"])} />
        <Control label="Hide status" active={columnVisibility.status === false} onClick={() => setColumnVisibility((current) => ({ ...current, status: current.status === false }))} />
        <span className="mx-1 w-px bg-stone-200" aria-hidden="true" />
        <Control label="Copy" onClick={copySelection} />
        <Control label="Paste" disabled={clipboard === null} onClick={pasteSelection} />
        <Control label="Fill selected" onClick={() => run(
          () => binding.fillSelected(table, "Selected"),
          "Visible selected cells filled",
        )} />
        <Control label="Undo" disabled={!snapshot.canUndo} onClick={() => run(binding.undo, "Undone")} />
        <Control label="Redo" disabled={!snapshot.canRedo} onClick={() => run(binding.redo, "Redone")} />
      </div>

      <div className="mb-3 flex flex-wrap justify-between gap-2 text-xs text-stone-500">
        <output aria-live="polite">{announcement}</output>
        <output data-testid="tanstack-topology">{JSON.stringify(binding.topology(table))}</output>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <div className="overflow-auto">
          <table role="grid" aria-label="TanStack project sheet" aria-multiselectable="true" className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th key={header.id} scope="col" className="border border-stone-200 bg-stone-100 px-3 py-2 text-left text-xs font-semibold text-stone-600">
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
                        className="border border-stone-200 p-0 data-[selected=true]:relative data-[selected=true]:bg-amber-50 data-[selected=true]:outline data-[selected=true]:outline-2 data-[selected=true]:-outline-offset-2 data-[selected=true]:outline-stone-900"
                      >
                        <input
                          aria-label={`${cell.column.id} ${row.id}`}
                          defaultValue={displayValue(value)}
                          key={displayValue(value)}
                          onBlur={(event) => commitCell(event, row.id, cell.column.id, value)}
                          className="w-full min-w-0 border-0 bg-transparent px-3 py-2 text-sm text-stone-800 outline-none"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <pre data-testid="tanstack-clipboard" className="mt-3 min-h-8 whitespace-pre-wrap rounded bg-stone-100 p-2 text-xs text-stone-500">{clipboard?.text ?? "Clipboard is empty"}</pre>
        </div>

        <aside className="rounded border border-stone-800 bg-stone-950 p-3 text-stone-100" aria-label="Canonical JSON">
          <div className="mb-2 text-xs text-stone-400">Canonical JSON · revision {snapshot.revision}</div>
          <pre data-testid="tanstack-document-json" className="m-0 max-h-[30rem] overflow-auto whitespace-pre-wrap text-xs leading-5"><code>{JSON.stringify(snapshot.value, null, 2)}</code></pre>
          <div className="mb-2 mt-4 text-xs text-stone-400">Selection · {snapshot.selection.ranges.length} ranges</div>
          <pre data-testid="tanstack-selection-json" className="m-0 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5"><code>{JSON.stringify(snapshot.selection, null, 2)}</code></pre>
        </aside>
      </div>
    </section>
  );
}

function Control(props: { readonly label: string; readonly active?: boolean; readonly disabled?: boolean; readonly onClick: () => void }) {
  return <button type="button" aria-pressed={props.active} disabled={props.disabled} onClick={props.onClick} className="rounded border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 aria-pressed:bg-stone-950 aria-pressed:text-white disabled:opacity-35">{props.label}</button>;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}
