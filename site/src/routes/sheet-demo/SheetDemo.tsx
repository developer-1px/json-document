import { useRef, useState } from "react";
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
import { useEditingObservation, useGridEditing } from "@interactive-os/json-document-react";
import {
  createWebClipboardSurface,
  findWebGridCell,
  gridBoundary,
  moveGridPoint,
  rovingFocusItemProps,
  sheetClipboardCodec,
  webGridCellAddressProps,
} from "@interactive-os/json-document-web";
import {
  historyAffordance,
  editingCommandFromWebKeyboardStroke,
  applyAffordance,
} from "@interactive-os/json-document-affordance";
import { GridCell } from "@interactive-os/json-document-ui-primitives-react";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { editingItemProps } from "@interactive-os/json-document-react";

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
  const observation = useEditingObservation<SheetIntent>("Ready");
  const [clipboardSurface] = useState(() => createWebClipboardSurface({
    codec: sheetClipboardCodec,
    read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
    onResult(result) {
      if (!result.ok) return observation.announce(result.code);
      if (result.operation !== "paste") setClipboard(result.payload);
      if (result.operation === "cut") observation.observeResult(result.result);
      const verb = result.operation === "copy" ? "Copied" : result.operation === "cut" ? "Cut" : "Pasted";
      observation.announce(`${verb} ${result.payload.cells.length} × ${result.payload.cells[0]?.length ?? 0} structured cells`);
    },
  }));
  const surfaceRef = useRef<HTMLElement>(null);

  function dispatchIntent(intent: SheetIntent) {
    const result: EditingResult<SheetSelection> = editor.dispatch(intent);
    return observation.observe(intent, result);
  }

  function run(action: () => { readonly ok: boolean }, successMessage: string) {
    return observation.run(action, successMessage, "That action is not available here");
  }

  const focus = editor.snapshot.selection.focus;
  const editing = useGridEditing({
    source: editor,
    selectedPoints: editor.selectedCells,
    focusPoint: focus,
    onSelect: (point, mode) => {
      const { rowId, columnId } = point;
      run(
        () => dispatchIntent({ type: "selection.set", rowId, columnId, mode }),
        mode === "extend" ? "Range extended" : mode === "toggle" ? "Range toggled" : "Cell selected",
      );
    },
    keyboard: {
      resolve: (stroke) => editingCommandFromWebKeyboardStroke(stroke),
      focusPoint: () => editor.snapshot.selection.focus ?? undefined,
      neighbor: (point, command) => {
        const sheet = editor.snapshot.value as SheetDocument;
        const topology = {
          rowIds: sheet.rows.map((row) => row.id),
          columnIds: sheet.columns.map((column) => column.id),
        };
        const next = command.type === "move"
          ? moveGridPoint(topology, point, command.direction)
          : gridBoundary(topology, point, command.edge);
        return next;
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
      afterMove: (point) => focusCell(surfaceRef.current, point),
      ignoreCommand: (command, context) => (
        context.inField
        && ((command.type === "toggle" && context.event.key === " ")
          || (command.type === "delete" && context.event.key === "Backspace"))
      ),
    },
  });
  const snapshot = editing.snapshot;
  const sheet = snapshot.value as SheetDocument;
  const commands = historyAffordance(snapshot).hand;

  function copySelection() {
    const next = editor.copy();
    if (next === null) return observation.announce("Select a cell first");
    setClipboard(next);
    void navigator.clipboard?.writeText(next.text).catch(() => undefined);
    observation.announce(`Copied ${next.cells.length} × ${next.cells[0]?.length ?? 0} cells`);
  }

  function cutSelection() {
    const next = editor.cut();
    if (next === null) return observation.announce("Select a cell first");
    setClipboard(next.clipboard);
    observation.observeResult(next.result);
    void navigator.clipboard?.writeText(next.clipboard.text).catch(() => undefined);
    observation.announce(next.result.ok
      ? `Cut ${next.clipboard.cells.length} × ${next.clipboard.cells[0]?.length ?? 0} cells`
      : next.result.code);
  }

  function pasteSelection() {
    if (clipboard === null) return observation.announce("Copy cells first");
    run(
      () => dispatchIntent({ type: "clipboard.paste", clipboard }),
      `Pasted ${clipboard.cells.length} × ${clipboard.cells[0]?.length ?? 0} cells`,
    );
  }

  return (
    <DemoPage documentation={(
        <PageHeader
          illustration="braces"
          title="Sheet"
          aside={(
          <div className={classes("text-right", ui.text.meta)}>
            <div>{editor.selectedCells.length} cells · {snapshot.selection.ranges.length} ranges · revision {snapshot.revision}</div>
            <div aria-live="polite">{observation.announcement}</div>
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
              { label: "intent", meta: observation.lastIntent ? observation.lastIntent.type : "dispatch only", value: observation.lastIntent, testId: "sheet-intent-json", size: "compact" },
              { label: "result", meta: observation.lastResult?.ok === false ? observation.lastResult.code : observation.lastResult?.ok ? "ok" : "none yet", value: observation.lastResult, testId: "sheet-result-json", size: "compact" },
              { label: "Selection", value: snapshot.selection, testId: "sheet-selection-json", size: "compact" },
            ]} />
          )}
        >
          <section
            ref={surfaceRef}
            aria-label="Editable sheet"
            tabIndex={0}
            {...clipboardSurface}
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
                      const point = { rowId: row.id, columnId: column.id };
                      const item = editing.getCell(point);
                      return (
                        <GridCell
                          key={column.id}
                          {...webGridCellAddressProps(point)}
                          {...rovingFocusItemProps(item.getIsFocus())}
                          data-row-id={row.id}
                          data-column-id={column.id}
                          className={classes(ui.interactive.selectable, "p-0", ui.surface.gridCell)}
                          {...editingItemProps(item)}
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
                        </GridCell>
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

function focusCell(surface: HTMLElement | null, point: { readonly rowId: string; readonly columnId: string }) {
  findWebGridCell<HTMLElement>(surface, point)?.querySelector<HTMLInputElement>("input")?.focus();
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function Action(props: { readonly label: string; readonly onClick: () => void; readonly disabled?: boolean }) {
  return <ActionButton disabled={props.disabled} onClick={props.onClick}>{props.label}</ActionButton>;
}
