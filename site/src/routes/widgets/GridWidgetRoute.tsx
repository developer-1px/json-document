import { useRef, useState } from "react";
import {
  createSheetEditor,
  gridPointFromKey,
  gridPointKey,
  gridTopology,
  type SheetDocument,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  activeDescendantContainerProps,
  activeDescendantItemProps,
  gridBoundary,
  moveGridPoint,
  projectWebWidgetState,
  webGridCellAddressProps,
} from "@interactive-os/json-document-web";
import { SelectableItem } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import {
  editingCommandFromWebKeyboardStroke,
  applyAffordance,
} from "@interactive-os/json-document-affordance";
import { optionProps, useWidgetKeyboard } from "../../shared/widget-binding";
import { WidgetDemoFrame } from "./WidgetDemoFrame";

const initialSheet: SheetDocument = {
  columns: [
    { id: "task", label: "Task" },
    { id: "owner", label: "Owner" },
  ],
  rows: [
    { id: "alpha", cells: { task: "Alpha", owner: "Mina" } },
    { id: "beta", cells: { task: "Beta", owner: "Theo" } },
    { id: "gamma", cells: { task: "Gamma", owner: "June" } },
  ],
};

export function GridWidgetRoute() {
  const containerRef = useRef<HTMLTableElement>(null);
  const [editor] = useState(() => createSheetEditor(initialSheet));
  const keyboard = useWidgetKeyboard();
  const focus = editor.snapshot.selection.focus;
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedCells.map(gridPointKey),
    focusKey: focus ? gridPointKey(focus) : null,
    onSelect: (key, mode) => {
      const point = gridPointFromKey(key);
      if (point === null) return;
      const { rowId, columnId } = point;
      editor.dispatch({ type: "selection.set", rowId, columnId, mode });
    },
    keyboard: {
      resolve: (stroke) => {
        keyboard.resolve(stroke);
        return editingCommandFromWebKeyboardStroke(stroke);
      },
      focusKey: () => {
        const next = editor.snapshot.selection.focus;
        return next ? gridPointKey(next) : undefined;
      },
      neighbor: (key, command) => {
        const sheet = editor.snapshot.value as SheetDocument;
        const visible = gridTopology(
          sheet.rows.map((row) => row.id),
          sheet.columns.map((column) => column.id),
        );
        const current = gridPointFromKey(key);
        if (current === null) return null;
        const next = command.type === "move"
          ? moveGridPoint(visible, current, command.direction)
          : gridBoundary(visible, current, command.edge);
        return next ? gridPointKey(next) : null;
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
    },
  });
  const document = editing.snapshot.value as SheetDocument;
  const topology = gridTopology(
    document.rows.map((row) => row.id),
    document.columns.map((column) => column.id),
  );

  return (
    <WidgetDemoFrame
      title="Grid"
      description="Select uses applyAffordance. Topology stays on the host."
      illustration="braces"
      widgetLabel="Grid"
      widget={(
        <table
          ref={containerRef}
          role="grid"
          aria-multiselectable="true"
          aria-label="Sheet cells"
          {...activeDescendantContainerProps(focus === null ? null : gridCellId(focus.rowId, focus.columnId))}
          onKeyDown={editing.getKeyDownHandler()}
          className={classes("w-full", ui.surface.table, ui.state.focus)}
        >
          <thead>
            <tr>
              {document.columns.map((column) => (
                <th key={column.id} scope="col" className={classes("px-3 py-2 text-left", ui.surface.gridHead, ui.text.meta)}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {document.rows.map((row) => (
              <tr key={row.id}>
                {document.columns.map((column) => (
                  <SelectableItem
                    as="td"
                    key={column.id}
                    className={classes("px-3 py-2", ui.surface.gridCell, ui.text.body)}
                    {...webGridCellAddressProps({ rowId: row.id, columnId: column.id })}
                    {...optionProps(editing.getItem(gridPointKey({ rowId: row.id, columnId: column.id })))}
                    {...activeDescendantItemProps(gridCellId(row.id, column.id))}
                    {...projectWebWidgetState({
                      role: "gridcell",
                      selected: editing.getItem(gridPointKey({ rowId: row.id, columnId: column.id })).getIsSelected(),
                    })}
                    onClick={(event) => {
                      containerRef.current?.focus();
                      editing.getItem(gridPointKey({ rowId: row.id, columnId: column.id })).getPressHandler()(event);
                    }}
                  >
                    {String(row.cells[column.id] ?? "")}
                  </SelectableItem>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      values={[
        { label: "topology", value: topology, testId: "widget-grid-topology", size: "compact" },
        { label: "selectedCells", value: editor.selectedCells.map((cell) => ({ rowId: cell.rowId, columnId: cell.columnId })), testId: "widget-grid-selected", size: "compact" },
        { label: "keyboard", value: keyboard.lastCommand, testId: "widget-grid-keyboard", size: "compact" },
        { label: "selection", value: editing.snapshot.selection, testId: "widget-grid-selection", size: "compact" },
      ]}
    />
  );
}

function gridCellId(rowId: string, columnId: string): string {
  return `widget-grid-cell-${rowId}-${columnId}`;
}
