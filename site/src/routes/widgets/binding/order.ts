import {
  type OrderDocument,
  type OrderEditor,
} from "@interactive-os/json-document-editing";
import { useEditing, type EditingKeyboardOptions } from "@interactive-os/json-document-react";
import { lineBoundary, moveLinePoint } from "@interactive-os/json-document-web";
import { historyCommands } from "./history";
import { useWidgetKeyboard } from "./keyboard";
import { optionProps } from "./option";

export function useOrderWidget(editor: OrderEditor) {
  const keyboard = useWidgetKeyboard();
  const focusKey = orderFocusId(editor);
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedItemIds,
    focusKey,
    onSelect: (itemId, mode) => {
      editor.dispatch({ type: "selection.set", itemId, mode });
    },
    keyboard: orderKeyboard(editor, (stroke) => keyboard.resolve(stroke)),
  });
  const snapshot = editing.snapshot;
  const document = snapshot.value as OrderDocument;

  return {
    snapshot,
    document,
    focusKey: orderFocusId(editor),
    selectedKeys: editor.selectedItemIds,
    commands: historyCommands(snapshot),
    lastCommand: keyboard.lastCommand,
    getOption: (id: string) => optionProps(editing.getItem(id)),
    onKeyDown: editing.getKeyDownHandler(),
  };
}

function orderFocusId(editor: OrderEditor): string | null {
  const selection = editor.snapshot.selection;
  return selection.ranges[selection.primaryIndex ?? 0]?.focus.itemId ?? null;
}

function orderKeyboard(
  editor: OrderEditor,
  resolve: EditingKeyboardOptions<string>["resolve"],
): EditingKeyboardOptions<string> {
  return {
    resolve,
    focusKey: () => orderFocusId(editor) ?? undefined,
    neighbor: (key, command) => {
      const ids = (editor.snapshot.value as OrderDocument).items.map((item) => item.id);
      return command.type === "move"
        ? moveLinePoint(ids, key, command.direction)
        : lineBoundary(ids, command.edge);
    },
    onDelete: () => {
      editor.dispatch({ type: "selection.remove" });
    },
    onUndo: () => {
      editor.undo();
    },
    onRedo: () => {
      editor.redo();
    },
  };
}
