import type { KanbanDocument } from "./kanban.js";

export function assertKanbanDocument(document: KanbanDocument): void {
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
    for (const cardId of column.cardIds) if (!cardIds.has(cardId)) throw new Error(`Kanban column references unknown card: ${JSON.stringify(cardId)}.`);
  }
}
