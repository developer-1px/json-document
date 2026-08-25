import { useRef, useState, type KeyboardEvent } from "react";
import { createOrderEditor, type OrderDocument } from "@interactive-os/json-document-editing";
import { editingItemProps, useEditing } from "@interactive-os/json-document-react";
import {
  lineBoundary,
  moveLinePoint,
  projectWebWidgetState,
} from "@interactive-os/json-document-web";
import { SelectableItem, useListbox } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../shared/ui/styles";
import {
  editingCommandFromWebKeyboardStroke,
  applyAffordance,
  escapeAffordance,
} from "@interactive-os/json-document-affordance";
import { useWidgetKeyboard } from "../../shared/widget-binding";
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
  const containerRef = useRef<HTMLUListElement>(null);
  const [editor] = useState(() => createOrderEditor(initialOrder));
  const keyboard = useWidgetKeyboard();
  const [activeId, setActiveId] = useState<string | null>(initialOrder.items[0]?.id ?? null);
  const ids = () => (editor.snapshot.value as OrderDocument).items.map((item) => item.id);
  const focusKey = editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.itemId ?? null;
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedItemIds,
    focusKey,
    onSelect: (itemId, mode) => {
      editor.dispatch({ type: "selection.set", itemId, mode });
    },
    keyboard: {
      resolve: (stroke) => {
        keyboard.resolve(stroke);
        return editingCommandFromWebKeyboardStroke(stroke);
      },
      focusKey: () => editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.itemId ?? undefined,
      neighbor: (key, command) => command.type === "move"
        ? moveLinePoint(ids(), key, command.direction)
        : lineBoundary(ids(), command.edge),
      onDelete: () => {
        editor.dispatch({ type: "selection.remove" });
      },
      onUndo: () => {
        editor.undo();
      },
      onRedo: () => {
        editor.redo();
      },
    },
  });
  const document = editing.snapshot.value as OrderDocument;
  const effectiveActiveId = document.items.some((item) => item.id === activeId)
    ? activeId
    : document.items[0]?.id ?? null;
  const listbox = useListbox({
    id: "widget-listbox",
    label: "Order items",
    items: document.items.map((item) => ({ id: item.id, textValue: item.label })),
    activeId: effectiveActiveId,
    selectedId: editor.selectedItemIds[0] ?? null,
    onActiveChange: setActiveId,
    onAction: (itemId) => editor.dispatch({ type: "selection.set", itemId, mode: "replace" }),
  });

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    listbox.listboxProps.onKeyDown?.(event);
    if (event.defaultPrevented) return;
    applyAffordance(escapeAffordance(event), {
      hand: () => undefined,
    });
    editing.getKeyDownHandler()(event);
  }

  return (
    <WidgetDemoFrame
      title="Listbox"
      description="Select and typeahead use applyAffordance."
      illustration="cursor"
      widgetLabel="Listbox"
      widget={(
        <ul
          ref={containerRef}
          {...listbox.listboxProps}
          aria-multiselectable="true"
          tabIndex={0}
          onKeyDown={onKeyDown}
          className={classes("m-0 grid list-none gap-1 p-0", ui.state.focus)}
        >
          {document.items.map((item) => (
            <SelectableItem
              key={item.id}
              className={classes("w-full text-left", ui.surface.selectableBlock)}
              {...editingItemProps(editing.getItem(item.id))}
              {...listbox.optionProps({ id: item.id, textValue: item.label })}
              {...projectWebWidgetState({
                role: "option",
                selected: editing.getItem(item.id).getIsSelected(),
              })}
              onClick={(event) => {
                containerRef.current?.focus();
                setActiveId(item.id);
                editing.getItem(item.id).getPressHandler()(event);
              }}
            >
              {item.label}
            </SelectableItem>
          ))}
        </ul>
      )}
      values={[
        { label: "selectedKeys", value: editor.selectedItemIds, testId: "widget-listbox-selected", size: "compact" },
        { label: "focus", value: listbox.activeId, testId: "widget-listbox-focus", size: "compact" },
        { label: "keyboard", value: keyboard.lastCommand, testId: "widget-listbox-keyboard", size: "compact" },
        { label: "selection", value: editing.snapshot.selection, testId: "widget-listbox-selection", size: "compact" },
      ]}
    />
  );
}
