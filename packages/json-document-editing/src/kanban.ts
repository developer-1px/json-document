import {
  buildPointer,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";
import {
  createKeySelectionFamily,
  type KeySelectionCommand,
  type KeySelectionContext,
} from "@interactive-os/json-document-selection";
import {
  createEditingSession,
  type EditingResult,
  type EditingSnapshot,
} from "./session.js";
import { resolveDocumentSource, type EditingDocumentSource } from "./document-source.js";

export interface KanbanCard extends Record<string, JSONValue> {
  readonly id: string;
  readonly title: string;
}

export interface KanbanColumn extends Record<string, JSONValue> {
  readonly id: string;
  readonly title: string;
  readonly cardIds: ReadonlyArray<string>;
}

export interface KanbanDocument extends Record<string, JSONValue> {
  readonly columns: ReadonlyArray<KanbanColumn>;
  readonly cards: ReadonlyArray<KanbanCard>;
}

export interface KanbanSelection extends Record<string, JSONValue> {
  readonly kind: "explicit";
  readonly keys: ReadonlyArray<string>;
  readonly primaryKey: string | null;
}

export type KanbanIntent =
  | {
      readonly type: "selection.set";
      readonly cardId: string;
      readonly mode?: "replace" | "toggle";
    }
  | {
      readonly type: "card.move";
      readonly cardId: string;
      readonly columnId: string;
      readonly beforeCardId?: string | null;
    }
  | { readonly type: "selection.remove" };

export interface KanbanEditor {
  readonly snapshot: EditingSnapshot<KanbanSelection>;
  readonly selectedCardIds: ReadonlyArray<string>;
  dispatch(intent: KanbanIntent): EditingResult<KanbanSelection>;
  undo(): EditingResult<KanbanSelection>;
  redo(): EditingResult<KanbanSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<KanbanSelection>) => void): () => void;
}

export function createKanbanEditor(source: EditingDocumentSource<KanbanDocument>): KanbanEditor {
  const document = resolveDocumentSource(source);
  const initial = document.value as KanbanDocument;
  assertKanbanDocument(initial);
  const selectionFamily = createKeySelectionFamily<string>();
  const first = initial.cards[0];
  const session = createEditingSession({
    document,
    selection: first ? selectionFor([first.id]) : selectionFor([]),
  });

  function value(): KanbanDocument {
    return session.snapshot.value as KanbanDocument;
  }

  function selectedCardIds(): string[] {
    const ids = new Set(selectionFamily.targets(session.snapshot.selection, selectionContext()));
    return value().cards.map((card) => card.id).filter((id) => ids.has(id));
  }

  function selectionContext(): KeySelectionContext<string> {
    return {
      keys: value().cards.map((card) => card.id),
      universe: "cards",
      universeMismatch: "clear",
    };
  }

  function dispatch(intent: KanbanIntent): EditingResult<KanbanSelection> {
    if (intent.type === "selection.set") {
      if (!value().cards.some((card) => card.id === intent.cardId)) {
        return failure("selection.card-not-found");
      }
      const command: KeySelectionCommand<string> = {
        type: intent.mode ?? "replace",
        keys: [intent.cardId],
      };
      const selection = selectionFamily.transition(
        session.snapshot.selection,
        command,
        selectionContext(),
      ).state;
      return success(session.select(selectionFor(
        selectionFamily.targets(selection, selectionContext()),
        selection.primaryKey,
      )));
    }

    if (intent.type === "card.move") {
      return moveCard(intent.cardId, intent.columnId, intent.beforeCardId);
    }

    const selected = selectedCardIds();
    if (selected.length === 0) return failure("selection.empty");
    return removeCards(selected);
  }

  function moveCard(
    cardId: string,
    columnId: string,
    beforeCardId?: string | null,
  ): EditingResult<KanbanSelection> {
    const board = value();
    if (!board.cards.some((card) => card.id === cardId)) return failure("selection.card-not-found");
    const targetIndex = board.columns.findIndex((column) => column.id === columnId);
    if (targetIndex < 0) return failure("move.column-not-found");
    if (beforeCardId && beforeCardId !== cardId && !board.cards.some((card) => card.id === beforeCardId)) {
      return failure("move.target-not-found");
    }

    const operations: JSONPatchOperation[] = [];
    const nextColumns = board.columns.map((column) => ({
      ...column,
      cardIds: column.cardIds.filter((id) => id !== cardId),
    }));
    const target = nextColumns[targetIndex]!;
    const insertAt = beforeCardId
      ? Math.max(0, target.cardIds.indexOf(beforeCardId))
      : target.cardIds.length;
    const placed = [
      ...target.cardIds.slice(0, insertAt),
      cardId,
      ...target.cardIds.slice(insertAt),
    ];
    nextColumns[targetIndex] = { ...target, cardIds: placed };

    for (const [index, column] of nextColumns.entries()) {
      if (column.cardIds.join("\0") === board.columns[index]?.cardIds.join("\0")) continue;
      operations.push({
        op: "replace",
        path: buildPointer(["columns", index, "cardIds"]),
        value: column.cardIds,
      });
    }
    if (operations.length === 0) {
      return success(session.select(selectionFor([cardId])));
    }
    return session.apply({
      operations,
      selectionAfter: selectionFor([cardId]),
      origin: "card.move",
    });
  }

  function removeCards(ids: ReadonlyArray<string>): EditingResult<KanbanSelection> {
    const board = value();
    const removing = new Set(ids);
    const operations: JSONPatchOperation[] = [];
    board.columns.forEach((column, index) => {
      const nextIds = column.cardIds.filter((id) => !removing.has(id));
      if (nextIds.length !== column.cardIds.length) {
        operations.push({
          op: "replace",
          path: buildPointer(["columns", index, "cardIds"]),
          value: nextIds,
        });
      }
    });
    board.cards.forEach((card, index) => {
      if (removing.has(card.id)) {
        operations.push({ op: "remove", path: buildPointer(["cards", index]) });
      }
    });
    const removals = operations.filter((operation) => operation.op === "remove").reverse();
    const replacements = operations.filter((operation) => operation.op !== "remove");
    operations.length = 0;
    operations.push(...replacements, ...removals);
    return session.apply({
      operations,
      selectionAfter: selectionFor([]),
      origin: "selection.remove",
    });
  }

  return {
    get snapshot() { return session.snapshot; },
    get selectedCardIds() { return selectedCardIds(); },
    dispatch,
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

function selectionFor(ids: ReadonlyArray<string>, primaryKey: string | null = ids[0] ?? null): KanbanSelection {
  return { kind: "explicit", keys: [...ids], primaryKey };
}

function success(snapshot: EditingSnapshot<KanbanSelection>): EditingResult<KanbanSelection> {
  return { ok: true, snapshot };
}

function failure(code: string): EditingResult<KanbanSelection> {
  return { ok: false, code };
}

function assertKanbanDocument(document: KanbanDocument): void {
  const cardIds = new Set<string>();
  for (const card of document.cards) {
    if (card.id.length === 0) throw new Error("Kanban card ids must not be empty.");
    if (cardIds.has(card.id)) throw new Error(`Kanban card id must be unique: ${JSON.stringify(card.id)}.`);
    cardIds.add(card.id);
  }
  const columnIds = new Set<string>();
  for (const column of document.columns) {
    if (column.id.length === 0) throw new Error("Kanban column ids must not be empty.");
    if (columnIds.has(column.id)) throw new Error(`Kanban column id must be unique: ${JSON.stringify(column.id)}.`);
    columnIds.add(column.id);
    for (const cardId of column.cardIds) {
      if (!cardIds.has(cardId)) throw new Error(`Kanban column references unknown card: ${JSON.stringify(cardId)}.`);
    }
  }
}
