import type { DocumentObject } from "./object-model.js";
import { objectSubtreeIds } from "./object-container-layout.js";

export interface ObjectCollisionGroup {
  readonly objectIds: readonly string[];
  readonly gap: number;
}

/** Keep gesture targets fixed and push intersecting siblings down, translating their subtrees together. */
export function resolveObjectCollisions(objects: readonly DocumentObject[], groups: readonly ObjectCollisionGroup[], anchoredIds: readonly string[]): readonly DocumentObject[] {
  const map = new Map(objects.map(object => [object.id, object]));
  const anchored = new Set(objectSubtreeIds(objects, anchoredIds));
  for (const group of groups) {
    if (!Number.isFinite(group.gap) || group.gap < 0) throw new TypeError("Collision gap must be finite and nonnegative.");
    const members = [...new Set(group.objectIds)].filter(id => map.has(id));
    // A group's own gesture anchors take precedence; unrelated groups remain untouched.
    if (!members.some(id => anchored.has(id))) continue;
    const occupied = members.filter(id => anchored.has(id));
    const siblings = members.filter(id => !anchored.has(id)).sort((a, b) => map.get(a)!.y - map.get(b)!.y || members.indexOf(a) - members.indexOf(b));
    for (const id of siblings) {
      const object = map.get(id)!;
      let y = object.y;
      let changed = true;
      while (changed) {
        changed = false;
        for (const blockerId of occupied) {
          const blocker = map.get(blockerId)!;
          const intersectsX = object.x < blocker.x + blocker.width && object.x + object.width > blocker.x;
          if (intersectsX && y < blocker.y + blocker.height + group.gap && y + object.height + group.gap > blocker.y) {
            y = blocker.y + blocker.height + group.gap;
            changed = true;
          }
        }
      }
      if (y !== object.y) for (const childId of objectSubtreeIds([...map.values()], [id])) {
        const child = map.get(childId)!;
        map.set(childId, {...child, y: child.y + y - object.y});
      }
      occupied.push(id);
    }
  }
  return objects.map(object => map.get(object.id)!);
}
