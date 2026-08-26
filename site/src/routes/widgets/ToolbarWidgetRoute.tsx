import {
  useRef,
  useState,
} from "react";
import { Redo2, Undo2 } from "lucide-react";
import { createOrderEditor, type OrderDocument } from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  activeDescendantContainerProps,
  activeDescendantItemProps,
  lineBoundary,
  moveLinePoint,
  projectWebWidgetState,
} from "@interactive-os/json-document-web";
import { ActionButton, IconButton, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../shared/ui/styles";
import {
  historyAffordance,
  editingCommandFromWebKeyboardStroke,
  applyAffordance,
} from "@interactive-os/json-document-affordance";
import { useWidgetKeyboard } from "../../shared/widget-binding";
import { editingItemProps } from "@interactive-os/json-document-react";
import { WidgetDemoFrame } from "./WidgetDemoFrame";

const initialOrder: OrderDocument = {
  items: [
    { id: "inbox", label: "Inbox" },
    { id: "today", label: "Today" },
    { id: "later", label: "Later" },
  ],
};

export function ToolbarWidgetRoute() {
  const listboxRef = useRef<HTMLUListElement>(null);
  const [editor] = useState(() => createOrderEditor(initialOrder));
  const [customActivations, setCustomActivations] = useState(0);
  const keyboard = useWidgetKeyboard();
  const ids = () => (editor.snapshot.value as OrderDocument).items.map((item) => item.id);
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedItemIds,
    focusKey: editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.itemId ?? null,
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
  const snapshot = editing.snapshot;
  const document = snapshot.value as OrderDocument;
  const focusKey = snapshot.selection.ranges[snapshot.selection.primaryIndex ?? 0]?.focus.itemId ?? null;
  let commands = {
    undo: { name: "undo" as const, disabled: true },
    redo: { name: "redo" as const, disabled: true },
  };
  applyAffordance(historyAffordance(snapshot), {
    hand: (hand) => {
      if (hand.type === "history") commands = { undo: hand.undo, redo: hand.redo };
    },
  });

  return (
    <WidgetDemoFrame
      title="Toolbar"
      description="Undo uses applyAffordance the same way as Select."
      illustration="clipboard"
      widgetLabel="Toolbar"
      widget={(
        <div className={classes("flex flex-wrap gap-1", ui.product.toolbar)} role="toolbar" aria-label="History">
          <IconButton label="Undo" disabled={commands.undo.disabled} onClick={() => editor.undo()}><Undo2 aria-hidden="true" size={16} /></IconButton>
          <IconButton label="Redo" disabled={commands.redo.disabled} onClick={() => editor.redo()}><Redo2 aria-hidden="true" size={16} /></IconButton>
          <ActionButton onClick={() => {
            editor.dispatch({ type: "selection.set", itemId: "today", mode: "replace" });
            setCustomActivations((count) => count + 1);
          }}>
            Select Today
          </ActionButton>
        </div>
      )}
      surfaceLabel="Listbox"
      surface={(
        <ul
          ref={listboxRef}
          role="listbox"
          aria-multiselectable="true"
          aria-label="Order items"
          {...activeDescendantContainerProps(focusKey === null ? null : toolbarItemId(focusKey))}
          onKeyDown={editing.getKeyDownHandler()}
          className={classes("m-0 grid list-none gap-1 p-0", ui.state.focus)}
        >
          {document.items.map((item) => (
            <SelectableItem
              as="li"
              key={item.id}
              className={classes("w-full text-left", ui.surface.selectableBlock)}
              {...editingItemProps(editing.getItem(item.id))}
              {...activeDescendantItemProps(toolbarItemId(item.id))}
              {...projectWebWidgetState({
                role: "option",
                selected: editing.getItem(item.id).getIsSelected(),
              })}
              onClick={(event) => {
                listboxRef.current?.focus();
                editing.getItem(item.id).getPressHandler()(event);
              }}
            >
              {item.label}
            </SelectableItem>
          ))}
        </ul>
      )}
      values={[
        { label: "commands", value: commands, testId: "widget-toolbar-commands", size: "compact" },
        { label: "canUndo / canRedo", value: { canUndo: snapshot.canUndo, canRedo: snapshot.canRedo }, testId: "widget-toolbar-history", size: "compact" },
        { label: "keyboard", value: keyboard.lastCommand, testId: "widget-toolbar-keyboard", size: "compact" },
        { label: "selection", value: snapshot.selection, testId: "widget-toolbar-selection", size: "compact" },
        { label: "custom activations", value: customActivations, testId: "widget-toolbar-press-count", size: "compact" },
      ]}
    />
  );
}

function toolbarItemId(itemId: string): string {
  return `widget-toolbar-option-${itemId}`;
}
