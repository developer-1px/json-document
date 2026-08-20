import { useState } from "react";
import { createOrderEditor, type OrderDocument } from "@interactive-os/json-document-editing";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import { useOrderWidget } from "./binding";
import { WidgetDemoFrame } from "./WidgetDemoFrame";

const initialOrder: OrderDocument = {
  items: [
    { id: "inbox", label: "Inbox" },
    { id: "today", label: "Today" },
    { id: "later", label: "Later" },
  ],
};

export function ToolbarWidgetRoute() {
  const [editor] = useState(() => createOrderEditor(initialOrder));
  const widget = useOrderWidget(editor);

  return (
    <WidgetDemoFrame
      title="Toolbar"
      description="The toolbar reads canUndo and canRedo. It does not own the list or the keymap."
      illustration="clipboard"
      widgetLabel="Toolbar"
      widget={(
        <div className={classes("flex flex-wrap gap-1", ui.product.toolbar)} role="toolbar" aria-label="History">
          <ActionButton disabled={widget.commands.undo.disabled} onClick={() => editor.undo()}>Undo</ActionButton>
          <ActionButton disabled={widget.commands.redo.disabled} onClick={() => editor.redo()}>Redo</ActionButton>
        </div>
      )}
      surfaceLabel="Listbox"
      surface={(
        <ul
          role="listbox"
          aria-multiselectable="true"
          aria-label="Order items"
          tabIndex={0}
          onKeyDown={widget.onKeyDown}
          className={classes("m-0 grid list-none gap-1 p-0", ui.state.focus)}
        >
          {widget.document.items.map((item) => (
            <SelectableItem
              key={item.id}
              role="option"
              className={classes("w-full text-left", ui.surface.selectableBlock)}
              {...widget.getOption(item.id)}
            >
              {item.label}
            </SelectableItem>
          ))}
        </ul>
      )}
      values={[
        { label: "commands", value: widget.commands, testId: "widget-toolbar-commands", size: "compact" },
        { label: "canUndo / canRedo", value: { canUndo: widget.snapshot.canUndo, canRedo: widget.snapshot.canRedo }, testId: "widget-toolbar-history", size: "compact" },
        { label: "keyboard", value: widget.lastCommand, testId: "widget-toolbar-keyboard", size: "compact" },
        { label: "selection", value: widget.snapshot.selection, testId: "widget-toolbar-selection", size: "compact" },
      ]}
    />
  );
}
