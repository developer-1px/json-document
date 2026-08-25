import { useRef, useState } from "react";
import {
  createSheetEditor,
  gridTopology,
  type SheetDocument,
} from "@interactive-os/json-document-editing";
import { useGridEditing } from "@interactive-os/json-document-react";
import {
  activeDescendantContainerProps,
  activeDescendantItemProps,
  gridBoundary,
  moveGridPoint,
  projectWebWidgetState,
  webGridCellAddressProps,
} from "@interactive-os/json-document-web";
import { SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
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
  const editing = useGridEditing({
    source: editor,
    selectedPoints: editor.selectedCells,
    focusPoint: focus,
    onSelect: (point, mode) => {
      const { rowId, columnId } = point;
      editor.dispatch({ type: "selection.set", rowId, columnId, mode });
    },
    keyboard: {
      resolve: (stroke) => {
        keyboard.resolve(stroke);
        return editingCommandFromWebKeyboardStroke(stroke);
      },
      focusPoint: () => editor.snapshot.selection.focus ?? undefined,
      neighbor: (point, command) => {
        const sheet = editor.snapshot.value as SheetDocument;
        const visible = gridTopology(
          sheet.rows.map((row) => row.id),
          sheet.columns.map((column) => column.id),
        );
        const next = command.type === "move"
          ? moveGridPoint(visible, point, command.direction)
          : gridBoundary(visible, point, command.edge);
        return next;
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
                {document.columns.map((column) => {
                  const point = { rowId: row.id, columnId: column.id };
                  const cell = editing.getCell(point);
                  return <SelectableItem
                    as="td"
                    key={column.id}
                    className={classes("px-3 py-2", ui.surface.gridCell, ui.text.body)}
                    {...webGridCellAddressProps(point)}
                    {...optionProps(cell)}
                    {...activeDescendantItemProps(gridCellId(row.id, column.id))}
                    {...projectWebWidgetState({
                      role: "gridcell",
                      selected: cell.getIsSelected(),
                    })}
                    onClick={(event) => {
                      containerRef.current?.focus();
                      cell.getPressHandler()(event);
                    }}
                  >
                    {String(row.cells[column.id] ?? "")}
                  </SelectableItem>;
                })}
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
