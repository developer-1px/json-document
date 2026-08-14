import { useState, type DragEvent } from "react";
import {
  createKanbanEditor,
  type KanbanDocument,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { ActionButton } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

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
  const snapshot = useEditingSnapshot(editor);
  const [dragging, setDragging] = useState<string | null>(null);
  const board = snapshot.value as KanbanDocument;
  const cards = new Map(board.cards.map((card) => [card.id, card]));
  const selected = new Set(editor.selectedCardIds);

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

      <div className="mb-3 flex gap-1">
        <ActionButton disabled={!snapshot.canUndo} onClick={() => editor.undo()}>Undo</ActionButton>
        <ActionButton disabled={!snapshot.canRedo} onClick={() => editor.redo()}>Redo</ActionButton>
      </div>

      <section aria-label="Kanban board" className="grid gap-3 md:grid-cols-3">
        {board.columns.map((column) => (
          <div
            key={column.id}
            data-column-id={column.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              moveTo(column.id);
            }}
            className={classes("grid content-start gap-2 p-3", ui.surface.raised)}
          >
            <h2 className={classes("mt-0", ui.text.title)}>{column.title}</h2>
            {column.cardIds.map((cardId) => {
              const card = cards.get(cardId);
              if (!card) return null;
              return (
                <button
                  key={card.id}
                  type="button"
                  draggable
                  data-card-id={card.id}
                  data-selected={selected.has(card.id) ? "true" : "false"}
                  onClick={() => editor.dispatch({ type: "selection.set", cardId: card.id })}
                  onDragStart={() => {
                    editor.dispatch({ type: "selection.set", cardId: card.id });
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
    </PageFrame>
  );
}
