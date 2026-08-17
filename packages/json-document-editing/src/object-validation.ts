import type { ObjectDocument } from "./object.js";

export function assertObjectDocument(document: ObjectDocument): void {
  const ids = new Set<string>();
  for (const object of document.objects) {
    if (object.id.length === 0) throw new Error("Object ids must not be empty.");
    if (ids.has(object.id)) throw new Error(`Object id must be unique: ${JSON.stringify(object.id)}.`);
    if (![object.x, object.y, object.width, object.height].every(Number.isFinite)) throw new Error(`Object geometry must be finite: ${JSON.stringify(object.id)}.`);
    if (object.width < 0 || object.height < 0) throw new Error(`Object dimensions must not be negative: ${JSON.stringify(object.id)}.`);
    ids.add(object.id);
  }
}
