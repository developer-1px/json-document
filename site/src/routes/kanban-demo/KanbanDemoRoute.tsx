import { useState, type DragEvent } from "react";
import {
  createKanbanEditor,
  type KanbanDocument,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  applyAffordance,
  commitAffordance,
  dropAffordance,
  pointerSelect,
} from "@interactive-os/json-document-affordance";
import { ActionButton } from "../../shared/ui/interactive";
import { PageFrame, PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { historyCommands, optionProps } from "../../shared/widget-binding";

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

export function KanbanDemoRoute() {
  const [editor] = useState(() => createKanbanEditor(initialBoard));
  const [dragging, setDragging] = useState<string | null>(null);
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedCardIds,
    focusKey: editor.snapshot.selection.primaryKey,
    onSelect: (cardId) => {
      editor.dispatch({ type: "selection.set", cardId });
    },
    operationFromEvent: () => "replace",
  });
  const snapshot = editing.snapshot;
  const board = snapshot.value as KanbanDocument;
  const commands = historyCommands(snapshot);
  const cards = new Map(board.cards.map((card) => [card.id, card]));

  function moveTo(columnId: string, beforeCardId?: string) {
    if (!dragging) return;
    editor.dispatch({ type: "card.move", cardId: dragging, columnId, beforeCardId: beforeCardId ?? null });
    setDragging(null);
  }

  return (
    <PageFrame>
      <PageHeader illustration="braces" title="Kanban">
        Drag a card into another column. One JSON document keeps the board.
      </PageHeader>

      <ProductApp
        toolbarLabel="Kanban actions"
        toolbar={(
          <>
            <ActionButton disabled={commands.undo.disabled} onClick={() => editor.undo()}>Undo</ActionButton>
            <ActionButton disabled={commands.redo.disabled} onClick={() => editor.redo()}>Redo</ActionButton>
          </>
        )}
      >
      <section aria-label="Kanban board" className="grid gap-3 md:grid-cols-3">
        {board.columns.map((column) => (
          <div
            key={column.id}
            data-column-id={column.id}
            onDragOver={(event) => {
              event.preventDefault();
              applyAffordance(dropAffordance({ canDrop: true }), {
                cursor: (cursor) => {
                  event.currentTarget.style.cursor = cursor;
                },
              });
            }}
            onDrop={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              const drop = dropAffordance({ canDrop: true });
              applyAffordance(drop, {
                cursor: (cursor) => {
                  event.currentTarget.style.cursor = cursor;
                },
              });
              const committed = commitAffordance(drop);
              if (!committed) return;
              applyAffordance(committed, {
                commit: (hand) => {
                  if (hand.type !== "move-drop") return;
                  moveTo(column.id);
                },
              });
            }}
            className="grid content-start gap-2 p-3"
          >
            <h2 className={classes("mt-0", ui.text.title)}>{column.title}</h2>
            {column.cardIds.map((cardId) => {
              const card = cards.get(cardId);
              if (!card) return null;
              const option = optionProps(editing.getItem(card.id));
              return (
                <button
                  key={card.id}
                  type="button"
                  draggable
                  data-card-id={card.id}
                  data-selected={option.selected ? "true" : "false"}
                  data-focus={option.focus ? "true" : "false"}
                  aria-selected={option["aria-selected"]}
                  onClick={option.onClick}
                  onDragStart={(event) => {
                    applyAffordance(pointerSelect(event), {
                      hand: (hand) => {
                        if (hand.type !== "select") return;
                        editor.dispatch({ type: "selection.set", cardId: card.id });
                      },
                    });
                    setDragging(card.id);
                  }}
                  onDragEnd={() => setDragging(null)}
                  className={classes("w-full p-3 text-left", ui.surface.documentBlock, ui.interactive.selectable)}
                >
                  {card.title}
                </button>
              );
            })}
          </div>
        ))}
      </section>
      </ProductApp>
    </PageFrame>
  );
}
