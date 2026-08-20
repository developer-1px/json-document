import { useState } from "react";
import { createDocumentEditor, type BlockDocument } from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import { lineBoundary, moveLinePoint } from "@interactive-os/json-document-web";
import { SelectableItem } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import {
  keyboardCommandFrom,
  pointerSelect,
  resolveAffordanceKey,
  selectOperationFrom,
} from "@interactive-os/json-document-affordance";
import { optionProps, useWidgetKeyboard } from "../../shared/widget-binding";
import { WidgetDemoFrame } from "./WidgetDemoFrame";

const initialDocument: BlockDocument = {
  blocks: [
    { id: "write", text: "Write the first block" },
    { id: "select", text: "Select a range" },
    { id: "move", text: "Move it together" },
  ],
};

export function DocumentWidgetRoute() {
  const [editor] = useState(() => createDocumentEditor(initialDocument));
  const keyboard = useWidgetKeyboard();
  const focus = editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus ?? null;
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedBlockIds,
    focusKey: focus?.blockId ?? null,
    textOffset: focus?.offset ?? null,
    onSelect: (blockId, mode) => {
      editor.dispatch({ type: "selection.set", blockId, mode });
    },
    operationFromEvent: (event) => selectOperationFrom(pointerSelect(event)),
    keyboard: {
      resolve: (stroke) => {
        const result = resolveAffordanceKey(stroke);
        keyboard.resolve(stroke);
        return keyboardCommandFrom(result);
      },
      focusKey: () => editor.selectedBlockIds.at(-1),
      neighbor: (key, command) => {
        const ids = (editor.snapshot.value as BlockDocument).blocks.map((block) => block.id);
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
    },
  });
  const document = editing.snapshot.value as BlockDocument;
  const offsets = Object.fromEntries(document.blocks.map((block) => [block.id, editing.getItem(block.id).getTextOffset()]));

  return (
    <WidgetDemoFrame
      title="Document"
      description="The document line reads selected keys, focus, and text offset. It does not own insert or clipboard."
      illustration="sleep"
      widgetLabel="Document"
      widget={(
        <ul
          role="listbox"
          aria-multiselectable="true"
          aria-label="Document blocks"
          tabIndex={0}
          onKeyDown={editing.getKeyDownHandler()}
          className={classes("m-0 grid list-none gap-1 p-0", ui.state.focus)}
        >
          {document.blocks.map((block) => (
            <SelectableItem
              key={block.id}
              role="option"
              className={classes("w-full text-left", ui.surface.selectableBlock)}
              {...optionProps(editing.getItem(block.id))}
            >
              {block.text}
            </SelectableItem>
          ))}
        </ul>
      )}
      values={[
        { label: "selectedKeys", value: editor.selectedBlockIds, testId: "widget-document-selected", size: "compact" },
        { label: "focus", value: focus?.blockId ?? null, testId: "widget-document-focus", size: "compact" },
        { label: "textOffset", value: offsets, testId: "widget-document-offset", size: "compact" },
        { label: "selection", value: editing.snapshot.selection, testId: "widget-document-selection", size: "compact" },
      ]}
    />
  );
}
