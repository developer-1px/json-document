import { useMemo, useRef, useState, type ReactNode, type KeyboardEvent } from "react";
import { jsonCellText, type SheetDocument, type SheetEditor, type GridPoint } from "@interactive-os/json-document-editing";
import { editingItemProps, useEditingSnapshot, useGridEditing } from "@interactive-os/json-document-react";
import { editingCommandFromWebKeyboardStroke } from "@interactive-os/json-document-affordance";
import { createWebClipboardSurface, findWebGridCell, gridBoundary, moveGridPoint, rovingFocusItemProps, sheetClipboardCodec, webGridCellAddressProps } from "@interactive-os/json-document-web";
import { Command, ContextualControls, Toolbar, GridCell } from "@interactive-os/json-document-ui-primitives-react";

export interface SheetHandProps {
  readonly editor: SheetEditor;
  readonly label?: string;
  /** Markdown tables retain a mandatory header row and at least one column. */
  readonly headerRow?: boolean;
  readonly onExit?: (edge: "before" | "after") => void;
  readonly renderCell?: (value: string) => ReactNode;
}

/** Shared cell selection, edit mode, clipboard and structural controls. Data/history stay with editor. */
export function SheetHand({editor, label = "표 편집", headerRow = false, renderCell, onExit}: SheetHandProps) {
  const snapshot = useEditingSnapshot(editor);
  const sheet = snapshot.value as SheetDocument;
  const surface = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<{point: GridPoint; value: string} | null>(null);
  const draftRef = useRef(draft); draftRef.current = draft;
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
  const finish = () => {
    const current = draftRef.current;
    if (!current) return true;
    draftRef.current = null; setDraft(null);
    return report(editor.dispatch({type: "cell.commit", ...current.point, value: current.value}));
  };
  const tab = (point: GridPoint, backward: boolean) => {
    const index = topology.rowIds.indexOf(point.rowId) * topology.columnIds.length + topology.columnIds.indexOf(point.columnId) + (backward ? -1 : 1);
    if (index < 0 || index >= sheet.rows.length * sheet.columns.length) {if (!onExit) return false; onExit(backward ? "before" : "after"); return true;}
    select({rowId: topology.rowIds[Math.floor(index / sheet.columns.length)]!, columnId: topology.columnIds[index % sheet.columns.length]!}); return true;
  };
  const keyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (draftRef.current) return;
    if (!focus || event.target instanceof HTMLButtonElement) return;
    if (event.key === "Tab") {if (tab(focus, event.shiftKey)) event.preventDefault(); return;}
    if (event.key === "Enter" || event.key === "F2" || (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey)) {
      event.preventDefault(); const cell = sheet.rows.find(row => row.id === focus.rowId)?.cells[focus.columnId];
      setDraft({point: focus, value: event.key.length === 1 ? event.key : jsonCellText(cell)}); return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {event.preventDefault(); editor.dispatch({type: "selection.select-all"}); return;}
    editing.getKeyDownHandler()(event);
  };
  const rowIndex = sheet.rows.findIndex(row => row.id === focus?.rowId);
  const columnIndex = sheet.columns.findIndex(column => column.id === focus?.columnId);
  const nextId = (ids: readonly string[], prefix: string) => {let i = 1; while (ids.includes(`${prefix}-${i}`)) i++; return `${prefix}-${i}`;};
  return <ContextualControls capabilities={[{id: "structure", phases: ["approach", "selected", "editing"]}]} editing={draft !== null}>
    {context => <div data-sheet-hand="" ref={surface} onKeyDown={keyDown} onBeforeInput={event => event.stopPropagation()} onInput={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
    <Toolbar label="표 작업" style={{display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, fontSize: 13, visibility: headerRow && !context.visible.length ? "hidden" : "visible"}}>
      <Command onClick={() => report(editor.dispatch({type: "row.insert", index: Math.max(headerRow ? 1 : 0, rowIndex + 1), row: {id: nextId(topology.rowIds, "row"), cells: Object.fromEntries(sheet.columns.map(column => [column.id, ""]))}}))}>행 추가</Command>
      <Command onClick={() => report(editor.dispatch({type: "column.insert", index: columnIndex + 1, column: {id: nextId(topology.columnIds, "column"), label: String.fromCharCode(65 + sheet.columns.length)}}))}>열 추가</Command>
      <Command disabled={!focus || (headerRow && rowIndex === 0)} onClick={() => focus && report(editor.dispatch({type: "row.delete", rowId: focus.rowId}))}>행 삭제</Command>
      <Command disabled={!focus || (headerRow && sheet.columns.length === 1)} onClick={() => focus && report(editor.dispatch({type: "column.delete", columnId: focus.columnId}))}>열 삭제</Command>
      <Command disabled={!snapshot.canUndo} onClick={() => report(editor.undo())}>실행 취소</Command>
      <Command disabled={!snapshot.canRedo} onClick={() => report(editor.redo())}>다시 실행</Command>
    </Toolbar>
    <div style={{overflowX: "auto"}} {...clipboard}>
      <table role="grid" aria-label={label} aria-multiselectable="true" style={{borderCollapse: "collapse", width: "100%"}}>
        <thead><tr><th aria-label="행 번호" />{sheet.columns.map(column => <th key={column.id} scope="col">{column.label}</th>)}</tr></thead>
        <tbody>{sheet.rows.map((row, index) => <tr key={row.id}><th scope="row">{headerRow && index === 0 ? "제목" : index + (headerRow ? 0 : 1)}</th>{sheet.columns.map(column => {
          const point = {rowId: row.id, columnId: column.id}; const item = editing.getCell(point);
          const active = draft?.point.rowId === row.id && draft.point.columnId === column.id;
          return <GridCell key={column.id} {...webGridCellAddressProps(point)} {...rovingFocusItemProps(item.getIsFocus())} {...editingItemProps(item)}
            style={{minWidth: 90, padding: "7px 10px", border: "1px solid var(--border, #ddd)", position: "relative", fontWeight: headerRow && index === 0 ? 600 : undefined}}
            onDoubleClick={() => setDraft({point, value: jsonCellText(row.cells[column.id])})}>
            {active ? <input aria-label={`${column.label} ${index + 1}행 편집`} autoFocus value={draft.value} style={{width: "100%", minWidth: 60, font: "inherit"}}
              onFocus={event => event.currentTarget.select()} onPointerDown={event => event.stopPropagation()}
              onChange={event => setDraft({point, value: event.target.value})} onBlur={finish}
              onKeyDown={event => {
                event.stopPropagation(); if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                if (event.key === "Escape") {event.preventDefault(); draftRef.current = null; setDraft(null); focusCell(point);}
                else if (event.key === "Enter" || event.key === "Tab") {
                  if (event.key === "Enter") event.preventDefault();
                  if (!finish()) return;
                  if (event.key === "Tab") {if (tab(point, event.shiftKey)) event.preventDefault();}
                  else {const next = moveGridPoint(topology, point, event.shiftKey ? "up" : "down"); select(next ?? point);}
                }
              }} /> : (renderCell ? renderCell(jsonCellText(row.cells[column.id])) : jsonCellText(row.cells[column.id])) || <span aria-hidden="true">&nbsp;</span>}
          </GridCell>;
        })}</tr>)}</tbody>
      </table>
    </div>
    {message && <output role="status">{message}</output>}
  </div>}
  </ContextualControls>;
}
