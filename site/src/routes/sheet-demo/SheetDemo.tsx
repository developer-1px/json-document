import { useState, type ClipboardEvent, type KeyboardEvent, type MouseEvent } from "react";
import {
  createSheetEditor,
  type EditingResult,
  type SheetClipboard,
  type SheetDocument,
  type SheetEditor,
  type SheetIntent,
  type SheetSelection,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import {
  createWebClipboardBinding,
  selectionOperationFromModifiers,
  sheetClipboardCodec,
} from "@interactive-os/json-document-web";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { ActionButton, DisclosureButton, SelectableItem } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
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
  const [webClipboard] = useState(() => createWebClipboardBinding({
    codec: sheetClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
  }));
  const [announcement, setAnnouncement] = useState("Ready");
  const [lastIntent, setLastIntent] = useState<SheetIntent | null>(null);
  const [lastResult, setLastResult] = useState<{ readonly ok: true } | { readonly ok: false; readonly code: string } | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const sheet = snapshot.value as SheetDocument;
  const selected = new Set(editor.selectedCells.map((cell) => `${cell.rowId}\u0000${cell.columnId}`));

  function dispatchIntent(intent: SheetIntent) {
    const result: EditingResult<SheetSelection> = editor.dispatch(intent);
    setLastIntent(intent);
    setLastResult(result.ok ? { ok: true } : { ok: false, code: result.code });
    return result;
  }

  function run(action: () => { readonly ok: boolean }, successMessage: string) {
    const result = action();
    setAnnouncement(result.ok ? successMessage : "That action is not available here");
    return result;
  }

  function selectCell(event: MouseEvent, rowId: string, columnId: string) {
    const mode = selectionOperationFromModifiers(event);
    run(
      () => dispatchIntent({
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

  function cutSelection() {
    const next = editor.cut();
    if (next === null) return setAnnouncement("Select a cell first");
    setClipboard(next.clipboard);
    setLastResult(next.result.ok ? { ok: true } : { ok: false, code: next.result.code });
    void navigator.clipboard?.writeText(next.clipboard.text).catch(() => undefined);
    setAnnouncement(next.result.ok
      ? `Cut ${next.clipboard.cells.length} × ${next.clipboard.cells[0]?.length ?? 0} cells`
      : next.result.code);
  }

  function pasteSelection() {
    if (clipboard === null) return setAnnouncement("Copy cells first");
    run(
      () => dispatchIntent({ type: "clipboard.paste", clipboard }),
      `Pasted ${clipboard.cells.length} × ${clipboard.cells[0]?.length ?? 0} cells`,
    );
  }

  function handleNativeCopy(event: ClipboardEvent<HTMLElement>) {
    const result = webClipboard.copy(event);
    if (!result.ok) return setAnnouncement(result.code);
    setClipboard(result.payload);
    setAnnouncement(`Copied ${result.payload.cells.length} × ${result.payload.cells[0]?.length ?? 0} structured cells`);
  }

  function handleNativeCut(event: ClipboardEvent<HTMLElement>) {
    const result = webClipboard.cut(event);
    if (!result.ok) return setAnnouncement(result.code);
    setClipboard(result.payload);
    if (result.operation === "cut") {
      setLastResult(result.result.ok ? { ok: true } : { ok: false, code: result.result.code ?? "editing.rejected" });
    }
    setAnnouncement(`Cut ${result.payload.cells.length} × ${result.payload.cells[0]?.length ?? 0} structured cells`);
  }

  function handleNativePaste(event: ClipboardEvent<HTMLElement>) {
    const result = webClipboard.paste(event);
    setAnnouncement(result.ok
      ? `Pasted ${result.payload.cells.length} × ${result.payload.cells[0]?.length ?? 0} structured cells`
      : result.code);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const modifier = event.metaKey || event.ctrlKey;
    if (!modifier) return;
    if (event.key.toLowerCase() === "z") {
      event.preventDefault();
      run(() => event.shiftKey ? editor.redo() : editor.undo(), event.shiftKey ? "Redone" : "Undone");
    }
  }

  return (
    <PageFrame>
        <PageHeader
          illustration="braces"
          title="Sheet"
          aside={(
          <div className={classes("text-right", ui.text.meta)}>
            <div>{editor.selectedCells.length} cells · {snapshot.selection.ranges.length} ranges · revision {snapshot.revision}</div>
            <div aria-live="polite">{announcement}</div>
          </div>
          )}
        >A small editable grid for rectangular selection, TSV clipboard, history, and canonical JSON publication.</PageHeader>

        <div className={classes("mb-3 flex flex-wrap gap-1 p-2", ui.surface.workspace)} role="toolbar" aria-label="Sheet actions">
          <Action label="Copy" onClick={copySelection} />
          <Action label="Cut" onClick={cutSelection} />
          <Action label="Paste" onClick={pasteSelection} disabled={clipboard === null} />
          <Action label="Fill selected" onClick={() => run(
            () => dispatchIntent({ type: "selection.fill", value: "Selected" }),
            "Selected cells filled",
          )} />
          <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
          <Action label="Undo" onClick={() => run(() => editor.undo(), "Undone")} disabled={!snapshot.canUndo} />
          <Action label="Redo" onClick={() => run(() => editor.redo(), "Redone")} disabled={!snapshot.canRedo} />
          <output data-testid="sheet-clipboard-tsv" className={classes("ml-auto self-center whitespace-pre", ui.text.meta)}>{clipboard?.text ?? "Clipboard is empty"}</output>
        </div>

        <div className="grid gap-4">
          <section
            aria-label="Editable sheet"
            onCopy={handleNativeCopy}
            onCut={handleNativeCut}
            onPaste={handleNativePaste}
            onKeyDown={handleKeyDown}
            className={classes("min-w-0 overflow-auto p-3", ui.surface.raised)}
          >
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
                        <SelectableItem
                          as="td"
                          key={column.id}
                          selected={isSelected}
                          role="gridcell"
                          aria-selected={isSelected}
                          data-row-id={row.id}
                          data-column-id={column.id}
                          onClick={(event) => selectCell(event, row.id, column.id)}
                          className={classes("p-0", ui.surface.gridCell)}
                        >
                            <input
                              aria-label={`${column.label} row ${rowIndex + 1}`}
                              value={displayValue(row.cells[column.id])}
                              onChange={(event) => run(
                                () => dispatchIntent({ type: "cell.commit", rowId: row.id, columnId: column.id, value: event.currentTarget.value }),
                                `${column.label} committed`,
                              )}
                              className={classes("w-full min-w-0", ui.field.seamless)}
                            />
                        </SelectableItem>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={classes("mb-0 mt-3", ui.text.meta)}>Click replaces selection. Shift-click extends the primary rectangle. Mod-click adds or removes a single-cell range. Fill selected changes every selected cell in one transaction.</p>
          </section>

          <section className={classes("p-3", ui.surface.raised)}>
            <DisclosureButton
              expanded={inspectorOpen}
              controls="sheet-editing-state"
              onClick={() => setInspectorOpen((open) => !open)}
            >
              Inspect editing state
            </DisclosureButton>
            <aside id="sheet-editing-state" hidden={!inspectorOpen} className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2" aria-label="Canonical JSON">
              <JsonInspector label="Canonical JSON" meta="stable row + column ids" value={snapshot.value} testId="sheet-canonical-json" size="tall" />
              <JsonInspector label="intent" meta={lastIntent ? lastIntent.type : "dispatch only"} value={lastIntent} testId="sheet-intent-json" size="compact" />
              <JsonInspector label="result" meta={lastResult?.ok === false ? lastResult.code : lastResult?.ok ? "ok" : "none yet"} value={lastResult} testId="sheet-result-json" size="compact" />
              <JsonInspector label="Selection" value={snapshot.selection} testId="sheet-selection-json" size="compact" />
            </aside>
          </section>
        </div>
    </PageFrame>
  );
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function Action(props: { readonly label: string; readonly onClick: () => void; readonly disabled?: boolean }) {
  return <ActionButton disabled={props.disabled} onClick={props.onClick}>{props.label}</ActionButton>;
}
