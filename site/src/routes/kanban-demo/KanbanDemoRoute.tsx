import { useState, type DragEvent } from "react";
import { Redo2, Undo2 } from "lucide-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import {
  createKanbanEditor,
  type KanbanCardDropTarget,
  type KanbanDocument,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  createWebDragDropSession,
  kanbanCardDropTargetFromWebElement,
  webKanbanCardProps,
  webKanbanColumnProps,
} from "@interactive-os/json-document-web";
import {
  createBoardDragSession,
  historyAffordance,
  editingCommandFromWebKeyboardStroke,
  applyAffordance,
  commitAffordance,
  dropAffordance,
} from "@interactive-os/json-document-affordance";
import { IconButton, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { editingItemProps } from "@interactive-os/json-document-react";

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
  const [boardDrag] = useState(() => createBoardDragSession<string, KanbanCardDropTarget>({
    onCommit: ({ item: cardId, target }) => {
      editor.dispatch({
        type: "card.move",
        cardId,
        columnId: target.columnId,
        beforeCardId: target.beforeCardId,
      });
    },
  }));
  const [dragSession] = useState(() => createWebDragDropSession<string, KanbanCardDropTarget>({
    onPreview: (_cardId, target) => { boardDrag.preview(target); },
    onCommit: (_cardId, target) => {
      boardDrag.preview(target);
      boardDrag.commit();
    },
    onCancel: (_cardId, reason) => { boardDrag.cancel(reason); },
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
            <IconButton label="Undo" disabled={commands.undo.disabled} onClick={() => editor.undo()}><Undo2 aria-hidden="true" size={16} /></IconButton>
            <IconButton label="Redo" disabled={commands.redo.disabled} onClick={() => editor.redo()}><Redo2 aria-hidden="true" size={16} /></IconButton>
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
            {...webKanbanColumnProps(column.id)}
            onDragOver={(event) => {
              event.preventDefault();
              const target = dropTargetFromEvent(event);
              if (target !== null) dragSession.preview(target);
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
                  const target = dropTargetFromEvent(event);
                  if (target !== null) dragSession.commit(target);
                },
              });
            }}
            className="grid content-start gap-2 p-3"
          >
            <h2 className={classes("mt-0", ui.text.title)}>{column.title}</h2>
            {column.cardIds.map((cardId) => {
              const card = cards.get(cardId);
              if (!card) return null;
              const option = editingItemProps(editing.getItem(card.id));
              return (
                <SelectableItem
                  as="button"
                  key={card.id}
                  type="button"
                  selected={option.selected}
                  focus={option.focus}
                  draggable
                  {...webKanbanCardProps(card.id)}
                  data-selected={option.selected ? "true" : "false"}
                  data-focus={option.focus ? "true" : "false"}
                  aria-selected={option.selected}
                  onClick={option.onClick}
                  onDragStart={(event) => {
                    editing.getItem(card.id).getPressHandler()(event);
                    boardDrag.begin(card.id);
                    dragSession.begin(card.id);
                  }}
                  onDragEnd={() => dragSession.cancel()}
                  className={classes("w-full p-3 text-left", ui.surface.documentBlock, ui.interactive.selectable)}
                >
                  {card.title}
                </SelectableItem>
              );
            })}
          </div>
        ))}
      </section>
      </ProductApp>
    </DemoPage>
  );
}

function dropTargetFromEvent(event: DragEvent<HTMLElement>): KanbanCardDropTarget | null {
  return kanbanCardDropTargetFromWebElement(event.target instanceof Element ? event.target : null);
}
