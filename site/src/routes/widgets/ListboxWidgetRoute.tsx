import { useState } from "react";
import { createOrderEditor, type OrderDocument } from "@interactive-os/json-document-editing";
import { SelectableItem } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import { useOrderWidget } from "./binding";
import { WidgetDemoFrame } from "./WidgetDemoFrame";

const initialOrder: OrderDocument = {
  items: [
    { id: "inbox", label: "Inbox" },
    { id: "today", label: "Today" },
    { id: "later", label: "Later" },
    { id: "done", label: "Done" },
  ],
};

export function ListboxWidgetRoute() {
  const [editor] = useState(() => createOrderEditor(initialOrder));
  const widget = useOrderWidget(editor);

  return (
    <WidgetDemoFrame
      title="Listbox"
      description="The listbox reads selected keys and focus. Arrows, Shift+arrows, Delete, and Mod+Z come from the binding."
      illustration="cursor"
      widgetLabel="Listbox"
      widget={(
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
        { label: "selectedKeys", value: widget.selectedKeys, testId: "widget-listbox-selected", size: "compact" },
        { label: "focus", value: widget.focusKey, testId: "widget-listbox-focus", size: "compact" },
        { label: "keyboard", value: widget.lastCommand, testId: "widget-listbox-keyboard", size: "compact" },
        { label: "selection", value: widget.snapshot.selection, testId: "widget-listbox-selection", size: "compact" },
      ]}
    />
  );
}
