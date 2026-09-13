import { Rows3, Columns3, Plus, Minus, Undo2, Redo2 } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode, type KeyboardEvent } from "react";
import { jsonCellText, type SheetDocument, type SheetEditor, type GridPoint } from "@interactive-os/json-document-editing";
import { editingItemProps, useEditingSnapshot, useGridEditing, useRenameSession } from "@interactive-os/json-document-react";
import { cellEditingAffordance, editingCommandFromWebKeyboardStroke } from "@interactive-os/json-document-affordance";
import { isWebComposingKey, createWebClipboardSurface, findWebGridCell, gridBoundary, moveGridPoint, rovingFocusItemProps, sheetClipboardCodec, webGridCellAddressProps } from "@interactive-os/json-document-web";
import { Command, Toolbar, GridCell, Field } from "@interactive-os/json-document-ui-primitives-react";

export interface SheetHandProps {
  readonly editor: SheetEditor;
  readonly label?: string;
  /** Header row presentation only; structure restrictions belong to editor.structure. */
  readonly headerRow?: boolean;
  readonly onExit?: (edge: "before" | "after") => void;
  readonly renderCell?: (value: string) => ReactNode;
}

/** Shared cell selection, edit mode, clipboard and structural controls. Data/history stay with editor. */
export function SheetHand({editor, label = "표 편집", headerRow = false, renderCell, onExit}: SheetHandProps) {
  const snapshot = useEditingSnapshot(editor);
  const sheet = snapshot.value as SheetDocument;
  const surface = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const focus = snapshot.selection.focus;
  const topology = {rowIds: sheet.rows.map(row => row.id), columnIds: sheet.columns.map(column => column.id)};
  const report = (result: {ok: boolean; code?: string}) => {setMessage(result.ok ? "" : result.code ?? "변경할 수 없습니다"); return result.ok;};
  const focusCell = (point: GridPoint) => findWebGridCell<HTMLElement>(surface.current, point)?.focus();
  const select = (point: GridPoint, mode: "replace" | "extend" | "toggle" = "replace") => {
    editor.dispatch({type: "selection.set", ...point, mode}); focusCell(point);
  };
  const editing = useGridEditing({source: editor, selectedPoints: editor.selectedCells, focusPoint: focus, onSelect: select,
    keyboard: {resolve: editingCommandFromWebKeyboardStroke, focusPoint: () => editor.snapshot.selection.focus ?? undefined,
      neighbor: (point, command) => command.type === "move" ? moveGridPoint(topology, point, command.direction) : gridBoundary(topology, point, command.edge),
      onDelete: () => report(editor.dispatch({type: "selection.fill", value: ""})), onUndo: () => report(editor.undo()), onRedo: () => report(editor.redo()), afterMove: focusCell}});
  const clipboard = useMemo(() => createWebClipboardSurface({codec: sheetClipboardCodec, read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? {ok: false, code: "selection.empty"}, paste: clipboard => editor.dispatch({type: "clipboard.paste", clipboard}), onResult: result => {if (!result.ok) setMessage(result.code);}}), [editor]);
  const rename = useRenameSession<GridPoint>({owner: editor,
    tryCommit: (point, value) => report(editor.dispatch({type: "cell.commit", ...point, value})),
    onFinish: focusCell,
  });
  const draft = rename.snapshot;
  const finish = () => {rename.session.commit(); return rename.session.getSnapshot() === null;};
  const move = (point: GridPoint, direction: "previous" | "next" | "up" | "down") => {
    const next = moveGridPoint(topology, point, direction);
    if (next) {select(next); return true;}
    if ((direction === "previous" || direction === "next") && onExit) {onExit(direction === "previous" ? "before" : "after"); return true;}
    return false;
  };
  const keyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (isWebComposingKey(event.nativeEvent)) return;
    const current = rename.session.getSnapshot();
    const point = current?.key ?? focus;
    if (!point || event.target instanceof HTMLButtonElement) return;
    const hand = cellEditingAffordance(event, {editing: current !== null, allSelected: editor.selectedCells.length === sheet.rows.length * sheet.columns.length}).hand;
    if (hand?.type === "rename") {
      event.preventDefault();
      if (hand.action === "begin") rename.session.begin(point, hand.initialText ?? jsonCellText(sheet.rows.find(row => row.id === point.rowId)?.cells[point.columnId]));
      else if (hand.action === "cancel") rename.session.cancel();
      else if (finish() && hand.move) move(point, hand.move);
    } else if (hand?.type === "tab") {
      if (!finish()) {event.preventDefault(); return;}
      if (move(point, hand.direction === "prev" ? "previous" : "next")) event.preventDefault();
    } else if (hand?.type === "select-all") {
      event.preventDefault(); editor.dispatch({type: "selection.select-all"});
    } else if (!current) editing.getKeyDownHandler()(event);
  };
  const structure = editor.structure;
  return <div data-sheet-hand="" ref={surface} onKeyDown={keyDown} onBeforeInput={event => event.stopPropagation()} onInput={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
    <Toolbar label="표 작업" style={{display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, fontSize: 13}}>
      <Command label="행 추가" onClick={() => report(editor.dispatch(structure.insertRow))}><AxisActionIcon axis="row" action="add" /></Command>
      <Command label="열 추가" onClick={() => report(editor.dispatch(structure.insertColumn))}><AxisActionIcon axis="column" action="add" /></Command>
      <Command label="행 삭제" disabled={!structure.deleteRow} onClick={() => structure.deleteRow && report(editor.dispatch(structure.deleteRow))}><AxisActionIcon axis="row" action="remove" /></Command>
      <Command label="열 삭제" disabled={!structure.deleteColumn} onClick={() => structure.deleteColumn && report(editor.dispatch(structure.deleteColumn))}><AxisActionIcon axis="column" action="remove" /></Command>
      <Command label="실행 취소" disabled={!snapshot.canUndo} onClick={() => report(editor.undo())}><Undo2 aria-hidden="true" size={16} /></Command>
      <Command label="다시 실행" disabled={!snapshot.canRedo} onClick={() => report(editor.redo())}><Redo2 aria-hidden="true" size={16} /></Command>
    </Toolbar>
    <div style={{overflowX: "auto"}} {...clipboard}>
      <table role="grid" aria-label={label} aria-multiselectable="true" style={{borderCollapse: "collapse", width: "100%"}}>
        <thead><tr><th aria-label="행 번호" />{sheet.columns.map(column => <th key={column.id} scope="col">{column.label}</th>)}</tr></thead>
        <tbody>{sheet.rows.map((row, index) => <tr key={row.id}><th scope="row">{headerRow && index === 0 ? "제목" : index + (headerRow ? 0 : 1)}</th>{sheet.columns.map(column => {
          const point = {rowId: row.id, columnId: column.id}; const item = editing.getCell(point);
          const active = draft?.key.rowId === row.id && draft.key.columnId === column.id;
          return <GridCell key={column.id} {...webGridCellAddressProps(point)} {...rovingFocusItemProps(item.getIsFocus())} {...editingItemProps(item)}
            style={{minWidth: 90, padding: "7px 10px", border: "1px solid var(--border, #ddd)", position: "relative", fontWeight: headerRow && index === 0 ? 600 : undefined}}
            onDoubleClick={() => rename.session.begin(point, jsonCellText(row.cells[column.id]))}>
            <div aria-hidden={active || undefined} style={{visibility: active ? "hidden" : "visible"}}>
              {(renderCell ? renderCell(jsonCellText(row.cells[column.id])) : jsonCellText(row.cells[column.id])) || <span aria-hidden="true">&nbsp;</span>}
            </div>
            {active && <Field presentation="seamless" label={`${column.label} ${index + 1}행 편집`} autoFocus value={draft.draft} style={{position: "absolute", inset: 0, boxSizing: "border-box", width: "100%", height: "100%", minWidth: 0, margin: 0, padding: "inherit", border: 0, borderRadius: 0, outline: "none", boxShadow: "none", background: "transparent", color: "inherit", font: "inherit", letterSpacing: "inherit"}}
              onFocus={event => event.currentTarget.select()} onPointerDown={event => event.stopPropagation()}
              onValueChange={rename.session.update} onBlur={finish}
              onKeyDown={keyDown} />}
          </GridCell>;
        })}</tr>)}</tbody>
      </table>
    </div>
    {message && <output role="status">{message}</output>}
  </div>;
}

function AxisActionIcon({axis, action}: {readonly axis: "row" | "column"; readonly action: "add" | "remove"}) {
  const Axis = axis === "row" ? Rows3 : Columns3;
  const Action = action === "add" ? Plus : Minus;
  return <span aria-hidden="true" style={{display: "inline-flex", alignItems: "center"}}><Axis size={16} /><Action size={10} /></span>;
}
