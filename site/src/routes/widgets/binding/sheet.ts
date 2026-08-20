import {
  gridTopology,
  type SheetDocument,
  type SheetEditor,
} from "@interactive-os/json-document-editing";
import { useEditing, type EditingKeyboardOptions } from "@interactive-os/json-document-react";
import { gridBoundary, moveGridPoint } from "@interactive-os/json-document-web";
import { useWidgetKeyboard } from "./keyboard";
import { gridCellProps } from "./option";

export function useSheetWidget(editor: SheetEditor) {
  const keyboard = useWidgetKeyboard();
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedCells.map((cell) => cellKey(cell.rowId, cell.columnId)),
    focusKey: sheetFocusKey(editor),
    onSelect: (key, mode) => {
      const { rowId, columnId } = parseCellKey(key);
      editor.dispatch({ type: "selection.set", rowId, columnId, mode });
    },
    keyboard: sheetKeyboard(editor, (stroke) => keyboard.resolve(stroke)),
  });
  const snapshot = editing.snapshot;
  const document = snapshot.value as SheetDocument;
  const topology = gridTopology(
    document.rows.map((row) => row.id),
    document.columns.map((column) => column.id),
  );

  return {
    snapshot,
    document,
    topology,
    selectedCells: editor.selectedCells.map((cell) => ({ rowId: cell.rowId, columnId: cell.columnId })),
    lastCommand: keyboard.lastCommand,
    getCell: (rowId: string, columnId: string) => gridCellProps(editing.getItem(cellKey(rowId, columnId))),
    onKeyDown: editing.getKeyDownHandler(),
  };
}

function sheetFocusKey(editor: SheetEditor): string | null {
  const focus = editor.snapshot.selection.focus;
  return focus ? cellKey(focus.rowId, focus.columnId) : null;
}

function sheetKeyboard(
  editor: SheetEditor,
  resolve: EditingKeyboardOptions<string>["resolve"],
): EditingKeyboardOptions<string> {
  return {
    resolve,
    focusKey: () => sheetFocusKey(editor) ?? undefined,
    neighbor: (key, command) => {
      const sheet = editor.snapshot.value as SheetDocument;
      const visible = gridTopology(
        sheet.rows.map((row) => row.id),
        sheet.columns.map((column) => column.id),
      );
      const current = parseCellKey(key);
      const next = command.type === "move"
        ? moveGridPoint(visible, current, command.direction)
        : gridBoundary(visible, current, command.edge);
      return next ? cellKey(next.rowId, next.columnId) : null;
    },
    onDelete: () => {
      editor.dispatch({ type: "selection.fill", value: null });
    },
    onUndo: () => {
      editor.undo();
    },
    onRedo: () => {
      editor.redo();
    },
  };
}

function cellKey(rowId: string, columnId: string): string {
  return `${rowId}\u0000${columnId}`;
}

function parseCellKey(key: string): { readonly rowId: string; readonly columnId: string } {
  const split = key.indexOf("\u0000");
  return { rowId: key.slice(0, split), columnId: key.slice(split + 1) };
}
