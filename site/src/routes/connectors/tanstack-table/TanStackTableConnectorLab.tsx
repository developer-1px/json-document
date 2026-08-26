import { useState, type FocusEvent, type ReactNode } from "react";
import { ArrowDownWideNarrow, ClipboardPaste, Columns3, Copy, EyeOff, ListFilter, PaintBucket, Redo2, Scissors, Undo2 } from "lucide-react";
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
  jsonCellText,
  type SheetClipboard,
  type SheetDocument,
} from "@interactive-os/json-document-editing";
import { createJSONDocument } from "@interactive-os/json-document";
import { useGridEditing } from "@interactive-os/json-document-react";
import { createTanStackTableConnector } from "@interactive-os/json-document-tanstack-table";
import { historyAffordance } from "@interactive-os/json-document-affordance";
import {
  createWebClipboardSurface,
  projectWebWidgetState,
  sheetClipboardCodec,
  rovingFocusItemProps,
  webGridCellAddressProps,
} from "@interactive-os/json-document-web";
import { CodeBlock } from "../../../shared/ui/code-block";
import { Inspector } from "../../../shared/ui/inspector";
import { IconButton, SelectableItem, ToggleButton } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../../shared/ui/styles";
import { editingItemProps } from "@interactive-os/json-document-react";

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
  const [document] = useState(() => createJSONDocument(initialSheet));
  const [binding] = useState(() => createTanStackTableConnector(document));
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
  const clipboardSurface = createWebClipboardSurface({
    codec: sheetClipboardCodec,
    read: () => binding.copy(table),
    cut: () => binding.cut(table)?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => binding.paste(table, payload),
    onResult: (result) => {
      if (!result.ok) return setAnnouncement(result.code);
      if (result.operation === "paste") return setAnnouncement("Pasted structured visible rectangle");
      setClipboard(result.payload);
      setAnnouncement(`${result.operation === "copy" ? "Copied" : "Cut"} ${result.payload.cells.length} × ${result.payload.cells[0]?.length ?? 0} structured visible cells`);
    },
  });
  function run(action: () => { readonly ok: boolean }, message: string) {
    const result = action();
    setAnnouncement(result.ok ? message : "That action is not available here");
  }

  const focus = binding.snapshot.selection.focus;
  const editing = useGridEditing({
    source: binding,
    selectedPoints: binding.selectedCells(table),
    focusPoint: focus,
    onSelect: (point, mode) => {
      const { rowId, columnId } = point;
      run(
        () => binding.selectCell(table, { rowId, columnId, mode }),
        mode === "extend" ? "Visible range extended" : mode === "toggle" ? "Visible range toggled" : "Cell selected",
      );
    },
  });
  const snapshot = editing.snapshot;
  const commands = historyAffordance(snapshot).hand;

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

  function cutSelection() {
    const next = binding.cut(table);
    if (next === null) return setAnnouncement("Select a visible cell first");
    setClipboard(next.clipboard);
    setAnnouncement(next.result.ok
      ? `Cut ${next.clipboard.cells.length} × ${next.clipboard.cells[0]?.length ?? 0} visible cells`
      : next.result.code);
  }

  function pasteSelection() {
    if (clipboard === null) return;
    run(() => binding.paste(table, clipboard), "Pasted visible rectangle");
  }

  return (
    <section
      aria-label="TanStack Table editing"
      {...clipboardSurface}
      className={classes("p-4", ui.surface.raised)}
    >
      <div className="mb-3 flex flex-wrap gap-2" role="toolbar" aria-label="TanStack view and editing actions">
        <Control label="Ready rows" icon={<ListFilter aria-hidden="true" size={16} />} active={columnFilters.length > 0} onClick={() => setColumnFilters((current) => current.length === 0 ? [{ id: "status", value: "Ready" }] : [])} />
        <Control label="Score descending" icon={<ArrowDownWideNarrow aria-hidden="true" size={16} />} active={sorting.length > 0} onClick={() => setSorting((current) => current.length === 0 ? [{ id: "score", desc: true }] : [])} />
        <Control label="Score first" icon={<Columns3 aria-hidden="true" size={16} />} active={columnOrder[0] === "score"} onClick={() => setColumnOrder((current) => current[0] === "score" ? ["name", "status", "score"] : ["score", "name", "status"])} />
        <Control label="Hide status" icon={<EyeOff aria-hidden="true" size={16} />} active={columnVisibility.status === false} onClick={() => setColumnVisibility((current) => ({ ...current, status: current.status === false }))} />
        <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
        <Control label="Copy" icon={<Copy aria-hidden="true" size={16} />} onClick={copySelection} />
        <Control label="Cut" icon={<Scissors aria-hidden="true" size={16} />} onClick={cutSelection} />
        <Control label="Paste" icon={<ClipboardPaste aria-hidden="true" size={16} />} disabled={clipboard === null} onClick={pasteSelection} />
        <Control label="Fill selected" icon={<PaintBucket aria-hidden="true" size={16} />} onClick={() => run(
          () => binding.fillSelected(table, "Selected"),
          "Visible selected cells filled",
        )} />
        <Control label="Undo" icon={<Undo2 aria-hidden="true" size={16} />} disabled={commands.undo.disabled} onClick={() => run(binding.undo, "Undone")} />
        <Control label="Redo" icon={<Redo2 aria-hidden="true" size={16} />} disabled={commands.redo.disabled} onClick={() => run(binding.redo, "Redone")} />
      </div>

      <div className={classes("mb-3 flex flex-wrap justify-between gap-2", ui.text.meta)}>
        <output aria-live="polite">{announcement}</output>
        <output data-testid="tanstack-topology">{JSON.stringify(binding.topology(table))}</output>
      </div>

      <div className="grid gap-4">
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
                    const point = { rowId: row.id, columnId: cell.column.id };
                    const item = editing.getCell(point);
                    const value = row.original.cells[cell.column.id];
                    return (
                      <SelectableItem
                        as="td"
                        key={cell.id}
                        data-row-id={row.id}
                        data-column-id={cell.column.id}
                        {...webGridCellAddressProps(point)}
                        {...rovingFocusItemProps(item.getIsFocus())}
                        {...projectWebWidgetState({
                          role: "gridcell",
                          selected: item.getIsSelected(),
                        })}
                        className={classes("p-0", ui.surface.gridCell)}
                        {...editingItemProps(item)}
                      >
                          <input
                            aria-label={`${cell.column.id} ${row.id}`}
                            defaultValue={jsonCellText(value)}
                            key={jsonCellText(value)}
                            onBlur={(event) => commitCell(event, row.id, cell.column.id, value)}
                            className={classes("w-full min-w-0", ui.field.seamless)}
                          />
                      </SelectableItem>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <CodeBlock className="mt-3" language="text" size="compact" source={clipboard?.text ?? "Clipboard is empty"} testId="tanstack-clipboard" />
        </div>

        <Inspector label="Inspect TanStack Table state" items={[
          { label: "Canonical JSON", signal: `revision ${snapshot.revision}`, value: snapshot.value, testId: "tanstack-document-json", size: "tall" },
          { label: "Selection", meta: `${snapshot.selection.ranges.length} ranges`, value: snapshot.selection, testId: "tanstack-selection-json", size: "compact" },
        ]} />
      </div>
    </section>
  );
}

function Control(props: { readonly label: string; readonly icon: ReactNode; readonly active?: boolean; readonly disabled?: boolean; readonly onClick: () => void }) {
  if (props.active !== undefined) {
    return <ToggleButton label={props.label} pressed={props.active} disabled={props.disabled} onClick={props.onClick}>{props.icon}</ToggleButton>;
  }
  return <IconButton label={props.label} disabled={props.disabled} onClick={props.onClick}>{props.icon}</IconButton>;
}
