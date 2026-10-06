import { Rows3, Columns3, Plus, Minus, Undo2, Redo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode, type KeyboardEvent, type CSSProperties, type KeyboardEventHandler, type FocusEventHandler } from "react";
import { sheetColumnLabel, jsonCellText, gridRangeBounds, gridCellsInRange, gridPointKey, type SheetRange, type SheetDocument, type SheetEditor, type GridPoint } from "@interactive-os/json-document-editing";
import { editingItemProps, useEditingSnapshot, useGridEditing, useRenameSession } from "@interactive-os/json-document-react";
import { cellEditingAffordance, gridEditingProfiles, resolveGridEditActivation, editingCommandFromWebKeyboardStroke, type GridEditingProfile } from "@interactive-os/json-document-affordance";
import { webKeyboardPlatform, isWebComposingKey, createWebClipboardSurface, findWebGridCell, gridBoundary, moveGridPoint, rovingFocusItemProps, sheetClipboardCodec, sheetClipboardRepresentations, webGridCellAddressProps } from "@interactive-os/json-document-web";
import { Command, Toolbar, GridCell, Field } from "@interactive-os/json-document-ui-primitives-react";
import {SheetAxisResize} from "./sheet-axis-resize.js";
import {useSheetRangeSelection} from "./sheet-range-selection.js";
import {SheetFillHandle} from "./sheet-fill-handle.js";

export interface SheetCellEditorProps {
  readonly label: string;
  readonly value: string;
  readonly initialSelection?: "all" | "end";
  readonly style: CSSProperties;
  readonly onValueChange: (value: string) => void;
  readonly onKeyDown: KeyboardEventHandler<HTMLElement>;
  readonly onBlur: FocusEventHandler<HTMLElement>;
}

export interface SheetHandProps {
  readonly editor: SheetEditor;
  readonly label?: string;
  /** Display positional A/B/C headers for an application grid instead of field labels. */
  readonly coordinateHeaders?: boolean;
  /** Header row presentation only; structure restrictions belong to editor.structure. */
  readonly headerRow?: boolean;
  /** Spreadsheet Enter starts editing on Mac; explicit policy objects override platform defaults. */
  readonly profile?: keyof typeof gridEditingProfiles | GridEditingProfile;
  readonly onDeactivate?: () => void;
  readonly onExit?: (edge: "before" | "after") => void;
  readonly renderCell?: (value: string) => ReactNode;
  /** Format-owned editor, e.g. Markdown. Receives a draft contract, never document/history ownership. */
  readonly renderEditor?: (props: SheetCellEditorProps) => ReactNode;
}

/** Shared cell selection, edit mode, clipboard and structural controls. Data/history stay with editor. */
export function SheetHand({editor, label = "표 편집", headerRow = false, coordinateHeaders = false, profile = "spreadsheet-grid", renderCell, renderEditor, onExit, onDeactivate}: SheetHandProps) {
  const policy = typeof profile === "string" ? gridEditingProfiles[profile === "spreadsheet-grid" && webKeyboardPlatform() === "mac" ? "spreadsheet-mac" : profile] : profile;
  const snapshot = useEditingSnapshot(editor);
  const sheet = editor.grid;
  const available = editor.availability;
  const editable = available === "ready";
  const surface = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [columnPreview, setColumnPreview] = useState<{id:string;size:number} | null>(null);
  const [rowPreview, setRowPreview] = useState<{id:string;size:number} | null>(null);
  const [fillPreview,setFillPreview] = useState<SheetRange | null>(null);
  const pointer = useSheetRangeSelection(editor, surface);
  const focus = snapshot.selection.focus;
  const topology = sheet;
  const primaryRange = snapshot.selection.primaryIndex === null ? undefined : snapshot.selection.ranges[snapshot.selection.primaryIndex];
  const primaryBounds = primaryRange && gridRangeBounds(topology,primaryRange);
  const fillCells = new Set(fillPreview ? gridCellsInRange(topology,fillPreview).map(gridPointKey) : []);
  const report = (result: {ok: boolean; code?: string}) => {setMessage(result.ok ? "" : result.code ?? "변경할 수 없습니다"); return result.ok;};
  const focusCell = (point: GridPoint) => findWebGridCell<HTMLElement>(surface.current, point)?.focus();
  const select = (point: GridPoint, mode: "replace" | "extend" | "toggle" = "replace") => {
    editor.dispatch({type: "selection.set", ...point, mode}); focusCell(point);
  };
  const editing = useGridEditing({source: editor, selectedPoints: editor.selectedCells, focusPoint: focus, onSelect: select,
    keyboard: {resolve: editingCommandFromWebKeyboardStroke, focusPoint: () => editor.snapshot.selection.focus ?? undefined,
      neighbor: (point, command) => command.type === "move" ? moveGridPoint(topology, point, command.direction) : gridBoundary(topology, point, command.edge),
      onDelete: () => report(editor.dispatch({type: "selection.fill", value: ""})), onUndo: () => report(editor.undo()), onRedo: () => report(editor.redo()), afterMove: focusCell}});
  const clipboard = useMemo(() => createWebClipboardSurface({codec: sheetClipboardCodec, representations:sheetClipboardRepresentations, read: () => editor.copy(),
    cut: () => editor.cut()?.result ?? {ok: false, code: "selection.empty"}, paste: clipboard => editor.dispatch({type: "clipboard.paste", clipboard}), onResult: result => {if (!result.ok) setMessage(result.code);}}), [editor]);
  const rename = useRenameSession<GridPoint>({owner: editor,
    tryCommit: (point, value) => report(editor.dispatch({type: "cell.commit", ...point, value, preserveSelection: true})),
    onFinish: focusCell,
  });
  useEffect(() => {
    const current=rename.session.getSnapshot();
    if (!editable || current && (!sheet.rows.some(row=>row.id === current.key.rowId) || !sheet.columns.some(column=>column.id === current.key.columnId))) rename.session.cancel();
  }, [editable, sheet, rename.session]);
  const beginEdit = (point: GridPoint, replacement?: string) => {
    if (!editable) return;
    const activation=resolveGridEditActivation(policy,jsonCellText(sheet.rows.find(row=>row.id === point.rowId)?.cells[point.columnId]),replacement);
    rename.session.begin(point,activation.draft,activation.initialSelection);
  };
  const draft = rename.snapshot;
  const finish = () => {rename.session.commit(); return rename.session.getSnapshot() === null;};
  const move = (point: GridPoint, direction: "previous" | "next" | "up" | "down") => {
    const result = editor.dispatch({type: "selection.navigate", direction});
    if (result.ok) {const next = result.snapshot.selection.focus; if (next) focusCell(next); return true;}
    if ((direction === "previous" || direction === "next") && onExit) {onExit(direction === "previous" ? "before" : "after"); return true;}
    return false;
  };
  const keyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (isWebComposingKey(event.nativeEvent)) return;
    const current = rename.session.getSnapshot();
    const point = current?.key ?? focus;
    const hand = cellEditingAffordance(event, {editing: current !== null, allSelected: editor.selectedCells.length === sheet.rows.length * sheet.columns.length, enter: policy.enter}).hand;
    if (hand?.type === "cancel" && onDeactivate) {event.preventDefault();onDeactivate();return;}
    if (!point || event.target instanceof HTMLButtonElement) return;
    if (hand?.type === "rename") {
      event.preventDefault();
      if (hand.action === "begin") beginEdit(point,hand.initialText);
      else if (hand.action === "cancel") rename.session.cancel();
      else if (hand.target === "selection" && current) {if(report(editor.dispatch({type:"selection.fill",value:current.draft}))) rename.session.cancel();}
      else if (finish() && hand.move) move(point, hand.move);
    } else if (hand?.type === "tab") {
      if (!finish()) {event.preventDefault(); return;}
      if (move(point, hand.direction === "prev" ? "previous" : "next")) event.preventDefault();
    } else if (hand?.type === "move" && (hand.direction === "up" || hand.direction === "down")) {
      event.preventDefault(); move(point, hand.direction);
    } else if (hand?.type === "select" && hand.axis) {
      event.preventDefault();editor.dispatch(hand.axis === "row" ? {type:"selection.row",rowId:point.rowId} : {type:"selection.column",columnId:point.columnId});
    } else if (hand?.type === "select-all") {
      event.preventDefault(); editor.dispatch({type: "selection.select-all"});
    } else if (!current) editing.getKeyDownHandler()(event);
  };
  const structure = editor.structure;
  return <div data-sheet-hand="" ref={surface} onKeyDown={keyDown} onBeforeInput={event => event.stopPropagation()} onInput={event => event.stopPropagation()}
    onPointerDown={event => {event.stopPropagation();if (!draft) pointer.onPointerDown(event);}} onLostPointerCapture={pointer.onLostPointerCapture}>
    <Toolbar label="표 작업" style={{display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, fontSize: 13}}>
      <Command disabled={!editable} label="행 추가" onClick={() => report(editor.dispatch(structure.insertRow))}><AxisActionIcon axis="row" action="add" /></Command>
      <Command disabled={!editable} label="열 추가" onClick={() => report(editor.dispatch(structure.insertColumn))}><AxisActionIcon axis="column" action="add" /></Command>
      <Command label="행 삭제" disabled={!editable || !structure.deleteRow} onClick={() => structure.deleteRow && report(editor.dispatch(structure.deleteRow))}><AxisActionIcon axis="row" action="remove" /></Command>
      <Command label="열 삭제" disabled={!editable || !structure.deleteColumn} onClick={() => structure.deleteColumn && report(editor.dispatch(structure.deleteColumn))}><AxisActionIcon axis="column" action="remove" /></Command>
      <Command label="실행 취소" disabled={!editable || !snapshot.canUndo} onClick={() => report(editor.undo())}><Undo2 aria-hidden="true" size={16} /></Command>
      <Command label="다시 실행" disabled={!editable || !snapshot.canRedo} onClick={() => report(editor.redo())}><Redo2 aria-hidden="true" size={16} /></Command>
    </Toolbar>
    <div style={{overflowX: "auto"}} {...clipboard}>
      <table role="grid" aria-label={label} aria-multiselectable="true" aria-readonly={!editable} style={{borderCollapse: "collapse", width: "100%"}}>
        <colgroup><col />{sheet.columns.map(column => <col key={column.id} style={{width:columnPreview?.id === column.id ? columnPreview.size : typeof column.width === "number" ? column.width : undefined}} />)}</colgroup>
        <thead><tr><th aria-label="행 번호" />{sheet.columns.map((column,columnIndex) => <th key={column.id} scope="col" style={{position:"relative"}}>
          <button type="button" aria-label={`${coordinateHeaders ? sheetColumnLabel(columnIndex) : column.label} 열 선택`} onClick={() => {editor.dispatch({type:"selection.column",columnId:column.id});const point=editor.snapshot.selection.focus;if(point) focusCell(point);}} style={{border:0,background:"transparent",font:"inherit",color:"inherit",padding:0}}>{coordinateHeaders ? sheetColumnLabel(columnIndex) : column.label}</button>
          {editable && editor.capabilities.resize && <SheetAxisResize axis="x" label={`${coordinateHeaders ? sheetColumnLabel(columnIndex) : column.label} 열 너비 조절`} onPreview={size => setColumnPreview(size === null ? null : {id:column.id,size})} onCommit={width => report(editor.dispatch({type:"column.resize",columnId:column.id,width}))} />}
        </th>)}</tr></thead>
        <tbody>{sheet.rows.map((row, index) => <tr key={row.id} style={{height:rowPreview?.id === row.id ? rowPreview.size : typeof row.height === "number" ? row.height : undefined}}><th scope="row" style={{position:"relative"}}>
          <button type="button" aria-label={`${index + 1}행 선택`} onClick={() => {editor.dispatch({type:"selection.row",rowId:row.id});const point=editor.snapshot.selection.focus;if(point) focusCell(point);}} style={{border:0,background:"transparent",font:"inherit",color:"inherit",padding:0}}>{headerRow && index === 0 ? "제목" : index + (headerRow ? 0 : 1)}</button>
          {editable && editor.capabilities.resize && <SheetAxisResize axis="y" label={`${index + 1}행 높이 조절`} onPreview={size => setRowPreview(size === null ? null : {id:row.id,size})} onCommit={height => report(editor.dispatch({type:"row.resize",rowId:row.id,height}))} />}
        </th>{sheet.columns.map(column => {
          const point = {rowId: row.id, columnId: column.id}; const item = editing.getCell(point);
          const active = draft?.key.rowId === row.id && draft.key.columnId === column.id;
          const editorProps: SheetCellEditorProps | null = active ? {label:`${column.label} ${index + 1}행 편집`, value:draft.draft,initialSelection:draft.initialSelection ?? "all",
            style:{position:"absolute",inset:0,boxSizing:"border-box",width:"100%",height:"100%",minWidth:0,margin:0,padding:"inherit",border:0,borderRadius:0,outline:"none",boxShadow:"none",background:"transparent",color:"inherit",font:"inherit",letterSpacing:"inherit",overflow:"auto"},
            onValueChange:rename.session.update,onBlur:finish,onKeyDown:keyDown} : null;
          return <GridCell key={column.id} {...webGridCellAddressProps(point)} {...rovingFocusItemProps(item.getIsFocus())} {...editingItemProps(item)}
            data-fill-preview={fillCells.has(gridPointKey(point)) || undefined}
            onClick={event => {if (!pointer.consumeClick()) item.getPressHandler()(event);}}
            style={{minWidth: 90, padding: "7px 10px", border: "1px solid var(--border, #ddd)", position: "relative", outline:fillCells.has(gridPointKey(point)) ? "1px dashed var(--accent, #9f4937)" : undefined, fontWeight: headerRow && index === 0 ? 600 : undefined}}
            onDoubleClick={() => beginEdit(point)}>
            <div aria-hidden={active || undefined} style={{visibility: active ? "hidden" : "visible"}}>
              {(renderCell ? renderCell(jsonCellText(row.cells[column.id])) : jsonCellText(row.cells[column.id])) || <span aria-hidden="true">&nbsp;</span>}
            </div>
            {editorProps && (renderEditor ? renderEditor(editorProps) : <Field label={editorProps.label} value={editorProps.value} style={editorProps.style} onValueChange={editorProps.onValueChange} onBlur={editorProps.onBlur} onKeyDown={editorProps.onKeyDown} presentation="seamless" autoFocus
              onFocus={event => {const input=event.currentTarget;if(editorProps.initialSelection === "end") input.setSelectionRange(input.value.length,input.value.length);else input.select();}} onPointerDown={event => event.stopPropagation()}
              />)}
            {editable && !draft && primaryRange && primaryBounds && row.id === topology.rowIds[primaryBounds.rowEnd] && column.id === topology.columnIds[primaryBounds.columnEnd]
              && <SheetFillHandle editor={editor} topology={topology} range={primaryRange} surface={surface} onPreview={setFillPreview} />}
          </GridCell>;
        })}</tr>)}</tbody>
      </table>
    </div>
    {available !== "ready" && <output role="status">{available === "readonly" ? "읽기 전용 표" : available === "missing" ? "표가 삭제되었습니다" : "표 데이터를 읽을 수 없습니다"}</output>}
    {message && <output role="status">{message}</output>}
  </div>;
}

function AxisActionIcon({axis, action}: {readonly axis: "row" | "column"; readonly action: "add" | "remove"}) {
  const Axis = axis === "row" ? Rows3 : Columns3;
  const Action = action === "add" ? Plus : Minus;
  return <span aria-hidden="true" style={{display: "inline-flex", alignItems: "center"}}><Axis size={16} /><Action size={10} /></span>;
}
