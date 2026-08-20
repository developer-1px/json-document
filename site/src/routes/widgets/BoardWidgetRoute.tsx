import { useState } from "react";
import { createKanbanEditor, type KanbanDocument } from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import { SelectableItem } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import { optionProps } from "../../shared/widget-binding";
import { WidgetDemoFrame } from "./WidgetDemoFrame";

const initialBoard: KanbanDocument = {
  columns: [
    { id: "todo", title: "Todo", cardIds: ["write", "review"] },
    { id: "doing", title: "Doing", cardIds: ["draw"] },
    { id: "done", title: "Done", cardIds: [] },
  ],
  cards: [
    { id: "write", title: "Write the brief" },
    { id: "review", title: "Review copy" },
    { id: "draw", title: "Draw the board" },
  ],
};

export function BoardWidgetRoute() {
  const [editor] = useState(() => createKanbanEditor(initialBoard));
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedCardIds,
    focusKey: editor.snapshot.selection.primaryKey,
    onSelect: (cardId) => {
      editor.dispatch({ type: "selection.set", cardId });
    },
    operationFromEvent: () => "replace",
  });
  const board = editing.snapshot.value as KanbanDocument;
  const cards = new Map(board.cards.map((card) => [card.id, card]));
  const columns = board.columns.map((column) => ({
    id: column.id,
    cardIds: column.cardIds,
  }));

  return (
    <WidgetDemoFrame
      title="Board"
      description="The board reads columns of cards and selected keys. Moving between columns stays on the host."
      illustration="braces"
      widgetLabel="Board"
      widget={(
        <div className="grid gap-3 sm:grid-cols-3" role="list" aria-label="Board columns">
          {board.columns.map((column) => (
            <div key={column.id} className="grid content-start gap-2">
              <p className={classes("mb-0 mt-0", ui.text.label)}>{column.title}</p>
              <ul
                role="listbox"
                aria-label={column.title}
                className="m-0 grid list-none gap-1 p-0"
              >
                {column.cardIds.map((cardId) => {
                  const card = cards.get(cardId);
                  if (!card) return null;
                  return (
                    <li key={card.id}>
                      <SelectableItem
                        role="option"
                        className={classes("w-full text-left", ui.surface.selectableBlock)}
                        {...optionProps(editing.getItem(card.id))}
                      >
                        {card.title}
                      </SelectableItem>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      values={[
        { label: "columns", value: columns, testId: "widget-board-columns", size: "compact" },
        { label: "selectedKeys", value: editor.selectedCardIds, testId: "widget-board-selected", size: "compact" },
        { label: "focus", value: editor.snapshot.selection.primaryKey, testId: "widget-board-focus", size: "compact" },
        { label: "selection", value: editing.snapshot.selection, testId: "widget-board-selection", size: "compact" },
      ]}
    />
  );
}
