import type { OrderDocument } from "./order.js";

export function assertOrderDocument(document: OrderDocument): void {
  const ids = new Set<string>();
  for (const item of document.items) {
    if (item.id.length === 0) throw new Error("Order item ids must not be empty.");
    if (ids.has(item.id)) throw new Error(`Order item id must be unique: ${JSON.stringify(item.id)}.`);
    ids.add(item.id);
  }
}
