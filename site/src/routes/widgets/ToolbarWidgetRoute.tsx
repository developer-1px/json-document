import { useState } from "react";
import { createOrderEditor, type OrderDocument } from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import { lineBoundary, moveLinePoint } from "@interactive-os/json-document-web";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import { historyAffordance, resolveAffordanceKey } from "@interactive-os/json-document-affordance";
import { optionProps, useWidgetKeyboard } from "../../shared/widget-binding";
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
        const command = resolveAffordanceKey(stroke);
        keyboard.resolve(stroke);
        return command;
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
  const commands = historyAffordance(snapshot);

  return (
    <WidgetDemoFrame
      title="Toolbar"
      description="The toolbar reads canUndo and canRedo. It does not own the list or the keymap."
      illustration="clipboard"
      widgetLabel="Toolbar"
      widget={(
        <div className={classes("flex flex-wrap gap-1", ui.product.toolbar)} role="toolbar" aria-label="History">
          <ActionButton disabled={commands.undo.disabled} onClick={() => editor.undo()}>Undo</ActionButton>
          <ActionButton disabled={commands.redo.disabled} onClick={() => editor.redo()}>Redo</ActionButton>
        </div>
      )}
      surfaceLabel="Listbox"
      surface={(
        <ul
          role="listbox"
          aria-multiselectable="true"
          aria-label="Order items"
          tabIndex={0}
          onKeyDown={editing.getKeyDownHandler()}
          className={classes("m-0 grid list-none gap-1 p-0", ui.state.focus)}
        >
          {document.items.map((item) => (
            <SelectableItem
              key={item.id}
              role="option"
              className={classes("w-full text-left", ui.surface.selectableBlock)}
              {...optionProps(editing.getItem(item.id))}
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
      ]}
    />
  );
}
