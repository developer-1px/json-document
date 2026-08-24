import { useState, type DragEvent } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import {
  createKanbanEditor,
  type KanbanDocument,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import { createWebDragDropSession } from "@interactive-os/json-document-web";
import {
  historyAffordance,
  editingCommandFromWebKeyboardStroke,
  applyAffordance,
  commitAffordance,
  dropAffordance,
} from "@interactive-os/json-document-affordance";
import { ActionButton } from "../../shared/ui/interactive";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { optionProps } from "../../shared/widget-binding";

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
  const [dragSession] = useState(() => createWebDragDropSession<string, {
    readonly columnId: string;
    readonly beforeCardId?: string;
  }>({
    onCommit: (cardId, target) => {
      editor.dispatch({
        type: "card.move",
        cardId,
        columnId: target.columnId,
        beforeCardId: target.beforeCardId ?? null,
      });
    },
  }));
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedCardIds,
    focusKey: editor.snapshot.selection.primaryKey,
    onSelect: (cardId) => {
      editor.dispatch({ type: "selection.set", cardId });
    },
    operationFromEvent: () => "replace",
    keyboard: {
      resolve: editingCommandFromWebKeyboardStroke,
      focusKey: () => editor.snapshot.selection.primaryKey ?? undefined,
      neighbor: () => null,
      onUndo: () => { editor.undo(); },
      onRedo: () => { editor.redo(); },
    },
  });
  const snapshot = editing.snapshot;
  const board = snapshot.value as KanbanDocument;
  const commands = historyAffordance(snapshot).hand;
  const cards = new Map(board.cards.map((card) => [card.id, card]));

  return (
    <DemoPage documentation={(
      <PageHeader illustration="braces" title="Kanban">
        Drag a card into another column. One JSON document keeps the board.
      </PageHeader>

    )}>
      <ProductApp
        toolbarLabel="Kanban actions"
        toolbar={(
          <>
            <ActionButton disabled={commands.undo.disabled} onClick={() => editor.undo()}>Undo</ActionButton>
            <ActionButton disabled={commands.redo.disabled} onClick={() => editor.redo()}>Redo</ActionButton>
          </>
        )}
      >
      <section
        aria-label="Kanban board"
        className="grid gap-3 md:grid-cols-3"
        tabIndex={0}
        onKeyDown={editing.getKeyDownHandler()}
      >
        {board.columns.map((column) => (
          <div
            key={column.id}
            data-column-id={column.id}
            onDragOver={(event) => {
              event.preventDefault();
              dragSession.preview({ columnId: column.id });
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
                  dragSession.commit({ columnId: column.id });
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
                    editing.getItem(card.id).getPressHandler()(event);
                    dragSession.begin(card.id);
                  }}
                  onDragEnd={() => dragSession.cancel()}
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
    </DemoPage>
  );
}
