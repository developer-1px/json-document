import { useState, type KeyboardEvent } from "react";
import { createOrderEditor, type OrderDocument } from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import { lineBoundary, moveLinePoint } from "@interactive-os/json-document-web";
import { SelectableItem } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import {
  applyAffordance,
  escapeAffordance,
  pointerSelect,
  typeaheadAffordance,
} from "@interactive-os/json-document-affordance";
import { editingCommandFromStroke, optionProps, useWidgetKeyboard } from "../../shared/widget-binding";
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
  const [typeahead, setTypeahead] = useState({ buffer: "", at: 0 });
  const keyboard = useWidgetKeyboard();
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
        return editingCommandFromStroke(stroke);
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

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const names = document.items.map((item) => item.label);
    const from = document.items.find((item) => item.id === focusKey)?.label ?? null;
    const result = typeaheadAffordance({
      buffer: typeahead.buffer,
      key: event.key,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      elapsedMs: event.timeStamp - typeahead.at,
      names,
      from,
    });
    let consumed = false;
    applyAffordance(result, {
      hand: (hand) => {
        if (hand.type !== "typeahead") return;
        consumed = true;
        setTypeahead({ buffer: hand.buffer, at: event.timeStamp });
        const item = document.items.find((candidate) => candidate.label === hand.name);
        if (item) editor.dispatch({ type: "selection.set", itemId: item.id, mode: "replace" });
      },
    });
    if (consumed) {
      event.preventDefault();
      return;
    }
    applyAffordance(escapeAffordance(event), {
      hand: (hand) => {
        if (hand.type !== "cancel") return;
        setTypeahead({ buffer: "", at: 0 });
      },
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
          role="listbox"
          aria-multiselectable="true"
          aria-label="Order items"
          tabIndex={0}
          onKeyDown={onKeyDown}
          className={classes("m-0 grid list-none gap-1 p-0", ui.state.focus)}
        >
          {document.items.map((item) => (
            <SelectableItem
              key={item.id}
              role="option"
              className={classes("w-full text-left", ui.surface.selectableBlock)}
              {...optionProps(editing.getItem(item.id))}
              onClick={(event) => {
                applyAffordance(pointerSelect(event), {
                  hand: (hand) => {
                    if (hand.type !== "select") return;
                    editor.dispatch({ type: "selection.set", itemId: item.id, mode: hand.operation });
                  },
                });
              }}
            >
              {item.label}
            </SelectableItem>
          ))}
        </ul>
      )}
      values={[
        { label: "selectedKeys", value: editor.selectedItemIds, testId: "widget-listbox-selected", size: "compact" },
        { label: "focus", value: focusKey, testId: "widget-listbox-focus", size: "compact" },
        { label: "keyboard", value: keyboard.lastCommand, testId: "widget-listbox-keyboard", size: "compact" },
        { label: "selection", value: editing.snapshot.selection, testId: "widget-listbox-selection", size: "compact" },
      ]}
    />
  );
}
