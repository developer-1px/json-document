import { useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  createSheetEditor,
  type SheetClipboard,
  type SheetDocument,
  type SheetEditor,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { Button, PageIntro } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

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
    const mode = event.shiftKey
      ? "extend"
      : event.metaKey || event.ctrlKey
        ? "toggle"
        : "replace";
    run(
      () => editor.dispatch({
        type: "selection.set",
        rowId,
        columnId,
        mode,
      }),
      mode === "extend" ? "Range extended" : mode === "toggle" ? "Range toggled" : "Cell selected",
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
    <main className={classes("px-4 py-8 lg:px-8", ui.frame.page)}>
      <div className={ui.frame.content}>
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <PageIntro title="Sheet demo">A small editable grid for rectangular selection, TSV clipboard, history, and canonical JSON publication.</PageIntro>
          <div className={classes("text-right", ui.text.meta)}>
            <div>{editor.selectedCells.length} cells · {snapshot.selection.ranges.length} ranges · revision {snapshot.revision}</div>
            <div aria-live="polite">{announcement}</div>
          </div>
        </header>

        <div className={classes("mb-3 flex flex-wrap gap-1 p-2", ui.surface.workspace)} role="toolbar" aria-label="Sheet actions">
          <Action label="Copy" onClick={copySelection} />
          <Action label="Paste" onClick={pasteSelection} disabled={clipboard === null} />
          <Action label="Fill selected" onClick={() => run(
            () => editor.dispatch({ type: "selection.fill", value: "Selected" }),
            "Selected cells filled",
          )} />
          <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
          <Action label="Undo" onClick={() => run(() => editor.undo(), "Undone")} disabled={!snapshot.canUndo} />
          <Action label="Redo" onClick={() => run(() => editor.redo(), "Redone")} disabled={!snapshot.canRedo} />
          <output data-testid="sheet-clipboard-tsv" className={classes("ml-auto self-center whitespace-pre", ui.text.meta)}>{clipboard?.text ?? "Clipboard is empty"}</output>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
          <section aria-label="Editable sheet" onKeyDown={handleKeyDown} className={classes("min-w-0 overflow-auto p-3", ui.surface.raised)}>
            <table role="grid" aria-label="Project sheet" aria-multiselectable="true" className={classes("w-full min-w-[34rem]", ui.surface.table, ui.text.body)}>
              <thead>
                <tr>
                  <th className={classes("w-10 px-2 py-2 text-center", ui.surface.gridIndex, ui.text.meta)} aria-label="Row number" />
                  {sheet.columns.map((column) => (
                    <th key={column.id} scope="col" className={classes("px-3 py-2", ui.surface.gridHead, ui.text.heading)}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row, rowIndex) => (
                  <tr key={row.id}>
                    <th scope="row" className={classes("px-2 py-2 text-center", ui.surface.gridIndex, ui.text.meta)}>{rowIndex + 1}</th>
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
                          className={classes("p-0", ui.surface.gridCell, ui.state.selected)}
                        >
                          <input
                            aria-label={`${column.label} row ${rowIndex + 1}`}
                            value={displayValue(row.cells[column.id])}
                            onChange={(event) => run(
                              () => editor.dispatch({ type: "cell.commit", rowId: row.id, columnId: column.id, value: event.currentTarget.value }),
                              `${column.label} committed`,
                            )}
                            className={classes("w-full min-w-0", ui.field.seamless)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={classes("mb-0 mt-3", ui.text.meta)}>Click replaces selection. Shift-click extends the primary rectangle. Mod-click adds or removes a single-cell range. Fill selected changes every selected cell in one transaction.</p>
          </section>

          <aside className="grid min-w-0 gap-3" aria-label="Canonical JSON">
            <JsonInspector label="Canonical JSON" meta="stable row + column ids" value={snapshot.value} testId="sheet-canonical-json" size="tall" />
            <JsonInspector label="Selection" value={snapshot.selection} testId="sheet-selection-json" size="compact" />
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
  return <Button disabled={props.disabled} onClick={props.onClick}>{props.label}</Button>;
}
