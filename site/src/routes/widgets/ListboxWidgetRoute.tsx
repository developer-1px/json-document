import { useRef, useState, type KeyboardEvent } from "react";
import { createOrderEditor, type OrderDocument } from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  activeDescendantContainerProps,
  activeDescendantItemProps,
  lineBoundary,
  moveLinePoint,
  projectWebWidgetState,
} from "@interactive-os/json-document-web";
import { SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../shared/ui/styles";
import {
  editingCommandFromWebKeyboardStroke,
  applyAffordance,
  createTypeaheadSession,
  escapeAffordance,
} from "@interactive-os/json-document-affordance";
import { optionProps, useWidgetKeyboard } from "../../shared/widget-binding";
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
  const [typeaheadSession] = useState(() => createTypeaheadSession<string>({
    onMatch: (itemId) => editor.dispatch({ type: "selection.set", itemId, mode: "replace" }),
  }));
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

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const consumed = typeaheadSession.handle({
      key: event.key,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      timeStamp: event.timeStamp,
      items: document.items.map((item) => ({ key: item.id, name: item.label })),
      fromKey: focusKey,
    });
    if (consumed) {
      event.preventDefault();
      return;
    }
    applyAffordance(escapeAffordance(event), {
      hand: (hand) => {
        if (hand.type !== "cancel") return;
        typeaheadSession.reset();
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
          ref={containerRef}
          role="listbox"
          aria-multiselectable="true"
          aria-label="Order items"
          {...activeDescendantContainerProps(focusKey === null ? null : listboxItemId(focusKey))}
          onKeyDown={onKeyDown}
          className={classes("m-0 grid list-none gap-1 p-0", ui.state.focus)}
        >
          {document.items.map((item) => (
            <SelectableItem
              as="li"
              key={item.id}
              className={classes("w-full text-left", ui.surface.selectableBlock)}
              {...optionProps(editing.getItem(item.id))}
              {...activeDescendantItemProps(listboxItemId(item.id))}
              {...projectWebWidgetState({
                role: "option",
                selected: editing.getItem(item.id).getIsSelected(),
              })}
              onClick={(event) => {
                containerRef.current?.focus();
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
        { label: "focus", value: focusKey, testId: "widget-listbox-focus", size: "compact" },
        { label: "keyboard", value: keyboard.lastCommand, testId: "widget-listbox-keyboard", size: "compact" },
        { label: "selection", value: editing.snapshot.selection, testId: "widget-listbox-selection", size: "compact" },
      ]}
    />
  );
}

function listboxItemId(itemId: string): string {
  return `widget-listbox-option-${itemId}`;
}
