import { useRef, useState, type KeyboardEventHandler, type PointerEvent, type ReactNode } from "react";
import { createKanbanEditor, type KanbanDocument } from "@interactive-os/json-document-editing";
import { useEditing, useRestoreElementFocus } from "@interactive-os/json-document-react";
import {
  activeDescendantContainerProps,
  activeDescendantItemProps,
  lineBoundary,
  moveLinePoint,
  projectWebWidgetState,
} from "@interactive-os/json-document-web";
import {
  editingCommandFromWebKeyboardStroke,
  applyAffordance,
  commitAffordance,
  dragAffordance,
  dropAffordance,
} from "@interactive-os/json-document-affordance";
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

type DragState = {
  readonly cardId: string;
  readonly originX: number;
  readonly originY: number;
  readonly dx: number;
  readonly dy: number;
};

export function BoardWidgetRoute() {
  const [editor] = useState(() => createKanbanEditor(initialBoard));
  const [drag, setDrag] = useState<DragState | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const cardIds = () => (editor.snapshot.value as KanbanDocument).columns.flatMap((column) => column.cardIds);
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedCardIds,
    focusKey: editor.snapshot.selection.primaryKey,
    onSelect: (cardId, mode) => {
      editor.dispatch({
        type: "selection.set",
        cardId,
        mode: mode === "replace" ? "replace" : "toggle",
      });
    },
    keyboard: {
      resolve: editingCommandFromWebKeyboardStroke,
      focusKey: () => editor.snapshot.selection.primaryKey ?? undefined,
      neighbor: (key, command) => command.type === "move"
        ? moveLinePoint(cardIds(), key, command.direction)
        : lineBoundary(cardIds(), command.edge),
      onDelete: () => {
        editor.dispatch({ type: "selection.remove" });
      },
    },
  });
  const board = editing.snapshot.value as KanbanDocument;
  const cards = new Map(board.cards.map((card) => [card.id, card]));
  const columns = board.columns.map((column) => ({
    id: column.id,
    cardIds: column.cardIds,
  }));
  const focusKey = editor.snapshot.selection.primaryKey;
  const focusColumnId = focusKey === null
    ? null
    : board.columns.find((column) => column.cardIds.includes(focusKey))?.id ?? null;

  function handleCardPointerDown(event: PointerEvent<HTMLElement>, cardId: string) {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget.closest("[role=listbox]") as HTMLElement | null)?.focus();
    surface.current?.setPointerCapture(event.pointerId);
    editing.getItem(cardId).getPressHandler()(event);
    setDrag({ cardId, originX: event.clientX, originY: event.clientY, dx: 0, dy: 0 });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    applyAffordance(
      dragAffordance({ x: drag.originX, y: drag.originY }, { x: event.clientX, y: event.clientY }),
      {
        cursor: (cursor) => {
          event.currentTarget.style.cursor = cursor;
        },
        hand: (hand) => {
          if (hand.type === "translate") setDrag({ ...drag, dx: hand.dx, dy: hand.dy });
        },
      },
    );
    applyAffordance(dropAffordance({ canDrop: columnAt(event) !== null }), {
      cursor: (cursor) => {
        event.currentTarget.style.cursor = cursor;
      },
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const moved = commitAffordance(
      dragAffordance({ x: drag.originX, y: drag.originY }, { x: event.clientX, y: event.clientY }),
    );
    const columnId = columnAt(event);
    const drop = dropAffordance({ canDrop: moved !== null && columnId !== null });
    applyAffordance(drop, {
      cursor: (cursor) => {
        event.currentTarget.style.cursor = cursor;
      },
    });
    const dropped = commitAffordance(drop);
    if (dropped && columnId !== null) {
      applyAffordance(dropped, {
        commit: (hand) => {
          if (hand.type !== "move-drop") return;
          editor.dispatch({ type: "card.move", cardId: drag.cardId, columnId, beforeCardId: null });
        },
      });
    }
    setDrag(null);
    event.currentTarget.style.cursor = "default";
  }

  return (
    <WidgetDemoFrame
      title="Board"
      description="Select and drag use applyAffordance. Column membership is host Intent."
      illustration="braces"
      widgetLabel="Board"
      widget={(
        <div
          ref={surface}
          className="grid gap-3 sm:grid-cols-3"
          role="group"
          aria-label="Board columns"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {board.columns.map((column) => (
            <div key={column.id} data-column-id={column.id} className="grid content-start gap-2">
              <p className={classes("mb-0 mt-0", ui.text.label)}>{column.title}</p>
              <BoardListbox
                label={column.title}
                activeId={focusColumnId === column.id && focusKey !== null ? boardCardId(focusKey) : null}
                onKeyDown={editing.getKeyDownHandler()}
              >
                {column.cardIds.map((cardId) => {
                  const card = cards.get(cardId);
                  if (!card) return null;
                  const option = optionProps(editing.getItem(card.id));
                  const offset = drag?.cardId === card.id ? drag : null;
                  return (
                    <li role="none" key={card.id}>
                      <SelectableItem
                        as="div"
                        className={classes("w-full text-left", ui.surface.selectableBlock)}
                        selected={option.selected}
                        focus={option.focus}
                        {...activeDescendantItemProps(boardCardId(card.id))}
                        {...projectWebWidgetState({ role: "option", selected: option.selected })}
                        style={{
                          transform: offset ? `translate(${offset.dx}px, ${offset.dy}px)` : undefined,
                          pointerEvents: drag ? "none" : undefined,
                        }}
                        onPointerDown={(event) => handleCardPointerDown(event, card.id)}
                      >
                        {card.title}
                      </SelectableItem>
                    </li>
                  );
                })}
              </BoardListbox>
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

function BoardListbox(props: {
  readonly label: string;
  readonly activeId: string | null;
  readonly onKeyDown: KeyboardEventHandler<HTMLUListElement>;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);
  useRestoreElementFocus(ref, props.activeId !== null);
  return (
    <ul
      ref={ref}
      role="listbox"
      aria-label={props.label}
      {...activeDescendantContainerProps(props.activeId)}
      onKeyDown={props.onKeyDown}
      className="m-0 grid min-h-[4rem] list-none gap-1 p-0"
    >
      {props.children}
    </ul>
  );
}

function boardCardId(cardId: string): string {
  return `widget-board-option-${cardId}`;
}

function columnAt(event: PointerEvent<HTMLElement>): string | null {
  const node = globalThis.document.elementFromPoint(event.clientX, event.clientY);
  if (!(node instanceof Element)) return null;
  return node.closest("[data-column-id]")?.getAttribute("data-column-id") ?? null;
}
