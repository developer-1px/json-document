import { useState } from "react";
import { createSheetEditor, type SheetDocument } from "@interactive-os/json-document-editing";
import { SelectableItem } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import { useSheetWidget } from "./binding";
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
  const [editor] = useState(() => createSheetEditor(initialSheet));
  const widget = useSheetWidget(editor);

  return (
    <WidgetDemoFrame
      title="Grid"
      description="The grid reads topology and selected cells. Arrows, Shift+arrows, Delete, and Mod+Z come from the binding."
      illustration="braces"
      widgetLabel="Grid"
      widget={(
        <table
          role="grid"
          aria-multiselectable="true"
          aria-label="Sheet cells"
          tabIndex={0}
          onKeyDown={widget.onKeyDown}
          className={classes("w-full", ui.surface.table, ui.state.focus)}
        >
          <thead>
            <tr>
              {widget.document.columns.map((column) => (
                <th key={column.id} scope="col" className={classes("px-3 py-2 text-left", ui.surface.gridHead, ui.text.meta)}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {widget.document.rows.map((row) => (
              <tr key={row.id}>
                {widget.document.columns.map((column) => (
                  <SelectableItem
                    as="td"
                    key={column.id}
                    className={classes("px-3 py-2", ui.surface.gridCell, ui.text.body)}
                    {...widget.getCell(row.id, column.id)}
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
        { label: "topology", value: widget.topology, testId: "widget-grid-topology", size: "compact" },
        { label: "selectedCells", value: widget.selectedCells, testId: "widget-grid-selected", size: "compact" },
        { label: "keyboard", value: widget.lastCommand, testId: "widget-grid-keyboard", size: "compact" },
        { label: "selection", value: widget.snapshot.selection, testId: "widget-grid-selection", size: "compact" },
      ]}
    />
  );
}
