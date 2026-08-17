import type { TreeDocument } from "./tree.js";

export function assertTreeDocument(document: TreeDocument): void {
  const ids = new Set<string>();
  const byId = new Map(document.nodes.map((node) => [node.id, node] as const));
  for (const node of document.nodes) {
    if (node.id.length === 0) throw new Error("Tree node ids must not be empty.");
    if (ids.has(node.id)) throw new Error(`Tree node id must be unique: ${JSON.stringify(node.id)}.`);
    ids.add(node.id);
  }
  const ancestryState = new Map<string, 1 | 2>();
  for (const node of document.nodes) {
    if (node.parentId !== null && !ids.has(node.parentId)) throw new Error(`Tree parent was not found: ${JSON.stringify(node.parentId)}.`);
    if (ancestryState.has(node.id)) continue;
    const path: string[] = [];
    let currentId: string | null = node.id;
    while (currentId !== null && !ancestryState.has(currentId)) {
      ancestryState.set(currentId, 1);
      path.push(currentId);
      currentId = byId.get(currentId)?.parentId ?? null;
    }
    if (currentId !== null && ancestryState.get(currentId) === 1) throw new Error(`Tree hierarchy contains a cycle at ${JSON.stringify(node.id)}.`);
    for (const id of path) ancestryState.set(id, 2);
  }
}
