import { useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  createSheetEditor,
  type SheetClipboard,
  type SheetDocument,
  type SheetEditor,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";

const initialSheet: SheetDocument = {
  columns: [
    { id: "name", label: "Name" },
    { id: "status", label: "Status" },
    { id: "owner", label: "Owner" },
  ],
  rows: [
    { id: "row-1", cells: { name: "Alpha", status: "Draft", owner: "Mina" } },
    { id: "row-2", cells: { name: "Beta", status: "Ready", owner: "Theo" } },
    { id: "row-3", cells: { name: "Gamma", status: "Review", owner: "June" } },
    { id: "row-4", cells: { name: "Delta", status: "Done", owner: "Sol" } },
  ],
};

export function SheetDemo() {
  const [editor] = useState<SheetEditor>(() => createSheetEditor(initialSheet));
  const snapshot = useEditingSnapshot(editor);
  const [clipboard, setClipboard] = useState<SheetClipboard | null>(null);
  const [announcement, setAnnouncement] = useState("Ready");
  const sheet = snapshot.value as SheetDocument;
  const selected = new Set(editor.selectedCells.map((cell) => `${cell.rowId}\u0000${cell.columnId}`));

  function run(action: () => { readonly ok: boolean }, successMessage: string) {
    const result = action();
    setAnnouncement(result.ok ? successMessage : "That action is not available here");
  }

  function selectCell(event: MouseEvent, rowId: string, columnId: string) {
    run(
      () => editor.dispatch({
        type: "selection.set",
        rowId,
        columnId,
        mode: event.shiftKey ? "extend" : "replace",
      }),
      event.shiftKey ? "Range extended" : "Cell selected",
    );
  }

  function copySelection() {
    const next = editor.copy();
    if (next === null) return setAnnouncement("Select a cell first");
    setClipboard(next);
    void navigator.clipboard?.writeText(next.text).catch(() => undefined);
    setAnnouncement(`Copied ${next.cells.length} × ${next.cells[0]?.length ?? 0} cells`);
  }

  function pasteSelection() {
    if (clipboard === null) return setAnnouncement("Copy cells first");
    run(
      () => editor.dispatch({ type: "clipboard.paste", clipboard }),
      `Pasted ${clipboard.cells.length} × ${clipboard.cells[0]?.length ?? 0} cells`,
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const modifier = event.metaKey || event.ctrlKey;
    if (!modifier) return;
    if (event.key.toLowerCase() === "c") {
      event.preventDefault();
      copySelection();
    } else if (event.key.toLowerCase() === "v" && clipboard !== null) {
      event.preventDefault();
      pasteSelection();
    } else if (event.key.toLowerCase() === "z") {
      event.preventDefault();
      run(() => event.shiftKey ? editor.redo() : editor.undo(), event.shiftKey ? "Redone" : "Undone");
    }
  }

  return (
    <main className="min-h-full bg-stone-50 px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-stone-400">Headless Sheet editing vertical slice</p>
            <h1 className="mb-2 mt-1 text-3xl font-semibold text-stone-950">Sheet demo</h1>
            <p className="m-0 max-w-2xl text-sm leading-6 text-stone-600">A small editable grid for rectangular selection, TSV clipboard, history, and canonical JSON publication.</p>
          </div>
          <div className="text-right text-xs text-stone-500">
            <div>{editor.selectedCells.length} selected · revision {snapshot.revision}</div>
            <div aria-live="polite">{announcement}</div>
          </div>
        </header>

        <div className="mb-3 flex flex-wrap gap-1 rounded border border-stone-200 bg-white p-2" role="toolbar" aria-label="Sheet actions">
          <Action label="Copy" onClick={copySelection} />
          <Action label="Paste" onClick={pasteSelection} disabled={clipboard === null} />
          <span className="mx-1 w-px bg-stone-200" aria-hidden="true" />
          <Action label="Undo" onClick={() => run(() => editor.undo(), "Undone")} disabled={!snapshot.canUndo} />
          <Action label="Redo" onClick={() => run(() => editor.redo(), "Redone")} disabled={!snapshot.canRedo} />
          <output data-testid="sheet-clipboard-tsv" className="ml-auto self-center whitespace-pre text-xs text-stone-400">{clipboard?.text ?? "Clipboard is empty"}</output>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
          <section aria-label="Editable sheet" onKeyDown={handleKeyDown} className="min-w-0 overflow-auto rounded border border-stone-200 bg-white p-3">
            <table role="grid" aria-label="Project sheet" aria-multiselectable="true" className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="w-10 border border-stone-200 bg-stone-100 px-2 py-2 text-center text-xs font-medium text-stone-400" aria-label="Row number" />
                  {sheet.columns.map((column) => (
                    <th key={column.id} scope="col" className="border border-stone-200 bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600">{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row, rowIndex) => (
                  <tr key={row.id}>
                    <th scope="row" className="border border-stone-200 bg-stone-50 px-2 py-2 text-center text-xs font-medium text-stone-400">{rowIndex + 1}</th>
                    {sheet.columns.map((column) => {
                      const isSelected = selected.has(`${row.id}\u0000${column.id}`);
                      return (
                        <td
                          key={column.id}
                          role="gridcell"
                          aria-selected={isSelected}
                          data-row-id={row.id}
                          data-column-id={column.id}
                          data-selected={isSelected ? "true" : "false"}
                          onClick={(event) => selectCell(event, row.id, column.id)}
                          className="border border-stone-200 p-0 data-[selected=true]:relative data-[selected=true]:bg-amber-50 data-[selected=true]:outline data-[selected=true]:outline-2 data-[selected=true]:-outline-offset-2 data-[selected=true]:outline-stone-900"
                        >
                          <input
                            aria-label={`${column.label} row ${rowIndex + 1}`}
                            value={displayValue(row.cells[column.id])}
                            onChange={(event) => run(
                              () => editor.dispatch({ type: "cell.commit", rowId: row.id, columnId: column.id, value: event.currentTarget.value }),
                              `${column.label} committed`,
                            )}
                            className="w-full min-w-0 border-0 bg-transparent px-3 py-2 text-sm text-stone-800 outline-none"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mb-0 mt-3 text-xs text-stone-400">Click selects one cell. Shift-click extends a rectangle. Copy publishes rectangular JSON and TSV; paste starts at the focused cell.</p>
          </section>

          <aside className="min-w-0 rounded border border-stone-800 bg-stone-950 p-3 text-stone-100" aria-label="Canonical JSON">
            <div className="mb-2 flex items-center justify-between text-xs text-stone-400"><span>Canonical JSON</span><span>stable row + column ids</span></div>
            <pre data-testid="sheet-canonical-json" className="m-0 max-h-[34rem] overflow-auto whitespace-pre-wrap text-xs leading-5"><code>{JSON.stringify(snapshot.value, null, 2)}</code></pre>
          </aside>
        </div>
      </div>
    </main>
  );
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function Action(props: { readonly label: string; readonly onClick: () => void; readonly disabled?: boolean }) {
  return <button type="button" disabled={props.disabled} onClick={props.onClick} className="rounded border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35">{props.label}</button>;
}
