import { useRef, useState, type ClipboardEvent } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import {
  createSheetEditor,
  type EditingResult,
  type SheetClipboard,
  type SheetDocument,
  type SheetEditor,
  type SheetIntent,
  type SheetSelection,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  createWebClipboardBinding,
  gridBoundary,
  moveGridPoint,
  sheetClipboardCodec,
} from "@interactive-os/json-document-web";
import {
  applyAffordance,
  pointerSelect,
} from "@interactive-os/json-document-affordance";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { editingCommandFromStroke, gridCellProps, historyCommands } from "../../shared/widget-binding";

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
  const [clipboard, setClipboard] = useState<SheetClipboard | null>(null);
  const [webClipboard] = useState(() => createWebClipboardBinding({
    codec: sheetClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
  }));
  const surfaceRef = useRef<HTMLElement>(null);
  const [announcement, setAnnouncement] = useState("Ready");
  const [lastIntent, setLastIntent] = useState<SheetIntent | null>(null);
  const [lastResult, setLastResult] = useState<{ readonly ok: true } | { readonly ok: false; readonly code: string } | null>(null);

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

  const focus = editor.snapshot.selection.focus;
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedCells.map((cell) => cellKey(cell.rowId, cell.columnId)),
    focusKey: focus ? cellKey(focus.rowId, focus.columnId) : null,
    onSelect: (key, mode) => {
      const { rowId, columnId } = parseCellKey(key);
      run(
        () => dispatchIntent({ type: "selection.set", rowId, columnId, mode }),
        mode === "extend" ? "Range extended" : mode === "toggle" ? "Range toggled" : "Cell selected",
      );
    },
    keyboard: {
      resolve: (stroke) => editingCommandFromStroke(stroke),
      focusKey: () => {
        const focus = editor.snapshot.selection.focus;
        return focus ? cellKey(focus.rowId, focus.columnId) : undefined;
      },
      neighbor: (key, command) => {
        const sheet = editor.snapshot.value as SheetDocument;
        const topology = {
          rowIds: sheet.rows.map((row) => row.id),
          columnIds: sheet.columns.map((column) => column.id),
        };
        const current = parseCellKey(key);
        const next = command.type === "move"
          ? moveGridPoint(topology, current, command.direction)
          : gridBoundary(topology, current, command.edge);
        return next ? cellKey(next.rowId, next.columnId) : null;
      },
      onDelete: () => {
        run(() => dispatchIntent({ type: "selection.fill", value: null }), "Selected cells cleared");
      },
      onUndo: () => {
        run(() => editor.undo(), "Undone");
      },
      onRedo: () => {
        run(() => editor.redo(), "Redone");
      },
      afterMove: (key) => {
        const { rowId, columnId } = parseCellKey(key);
        focusCell(surfaceRef.current, rowId, columnId);
      },
      ignoreCommand: (command, context) => (
        context.inField
        && ((command.type === "toggle" && context.event.key === " ")
          || (command.type === "delete" && context.event.key === "Backspace"))
      ),
    },
  });
  const snapshot = editing.snapshot;
  const sheet = snapshot.value as SheetDocument;
  const commands = historyCommands(snapshot);

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

  return (
    <DemoPage documentation={(
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

    )}>
        <ProductApp
          toolbarLabel="Sheet actions"
          toolbar={(
            <>
              <Action label="Copy" onClick={copySelection} />
              <Action label="Cut" onClick={cutSelection} />
              <Action label="Paste" onClick={pasteSelection} disabled={clipboard === null} />
              <Action label="Fill selected" onClick={() => run(
                () => dispatchIntent({ type: "selection.fill", value: "Selected" }),
                "Selected cells filled",
              )} />
              <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
              <Action label="Undo" onClick={() => run(() => editor.undo(), "Undone")} disabled={commands.undo.disabled} />
              <Action label="Redo" onClick={() => run(() => editor.redo(), "Redone")} disabled={commands.redo.disabled} />
              <output data-testid="sheet-clipboard-tsv" className={classes("ml-auto self-center whitespace-pre", ui.text.meta)}>{clipboard?.text ?? "Clipboard is empty"}</output>
            </>
          )}
          inspector={(
            <Inspector placement="inline" items={[
              { label: "Canonical JSON", meta: "stable row + column ids", value: snapshot.value, testId: "sheet-canonical-json", size: "tall" },
              { label: "intent", meta: lastIntent ? lastIntent.type : "dispatch only", value: lastIntent, testId: "sheet-intent-json", size: "compact" },
              { label: "result", meta: lastResult?.ok === false ? lastResult.code : lastResult?.ok ? "ok" : "none yet", value: lastResult, testId: "sheet-result-json", size: "compact" },
              { label: "Selection", value: snapshot.selection, testId: "sheet-selection-json", size: "compact" },
            ]} />
          )}
        >
          <section
            ref={surfaceRef}
            aria-label="Editable sheet"
            tabIndex={0}
            onCopy={handleNativeCopy}
            onCut={handleNativeCut}
            onPaste={handleNativePaste}
            onKeyDown={editing.getKeyDownHandler()}
            className={classes("min-w-0 overflow-auto", ui.state.focus)}
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
                      const item = editing.getItem(cellKey(row.id, column.id));
                      return (
                        <SelectableItem
                          as="td"
                          key={column.id}
                          data-row-id={row.id}
                          data-column-id={column.id}
                          className={classes("p-0", ui.surface.gridCell)}
                          {...gridCellProps(item)}
                          onClick={(event) => {
                            applyAffordance(pointerSelect(event), {
                              hand: (hand) => {
                                if (hand.type !== "select") return;
                                run(
                                  () => dispatchIntent({
                                    type: "selection.set",
                                    rowId: row.id,
                                    columnId: column.id,
                                    mode: hand.operation,
                                  }),
                                  hand.operation === "extend" ? "Range extended" : hand.operation === "toggle" ? "Range toggled" : "Cell selected",
                                );
                              },
                            });
                          }}
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
            <p className={classes("mb-0 mt-3", ui.text.meta)}>Click replaces selection. Shift-click extends the primary rectangle. Mod-click or Mod+Space toggles a cell. Arrows move by the visible grid; Shift+arrows extend it. Delete clears selected cells. Fill selected changes every selected cell in one transaction.</p>
          </section>
        </ProductApp>
    </DemoPage>
  );
}

function cellKey(rowId: string, columnId: string): string {
  return `${rowId}\u0000${columnId}`;
}

function parseCellKey(key: string): { readonly rowId: string; readonly columnId: string } {
  const split = key.indexOf("\u0000");
  return { rowId: key.slice(0, split), columnId: key.slice(split + 1) };
}

function focusCell(surface: HTMLElement | null, rowId: string, columnId: string) {
  const cell = surface?.querySelector(
    `[data-row-id="${CSS.escape(rowId)}"][data-column-id="${CSS.escape(columnId)}"] input`,
  );
  if (cell instanceof HTMLInputElement) cell.focus();
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function Action(props: { readonly label: string; readonly onClick: () => void; readonly disabled?: boolean }) {
  return <ActionButton disabled={props.disabled} onClick={props.onClick}>{props.label}</ActionButton>;
}
