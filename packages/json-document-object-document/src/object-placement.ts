import type { DocumentObject, ObjectBounds } from "./object-model.js";

/** Find a free horizontal slot at the requested row; include section title space. */
export function findVacantObjectBounds(objects: readonly DocumentObject[], requested: ObjectBounds, gap = 64): ObjectBounds {
  if (![requested.x, requested.y, requested.width, requested.height, gap].every(Number.isFinite)
    || requested.width <= 0 || requested.height <= 0 || gap < 0) throw new TypeError("Invalid placement bounds.");
  const top = requested.y - 32, bottom = requested.y + requested.height;
  const obstacles = objects.filter(object => object.y - (object.kind === "section" ? 32 : 0) - gap < bottom && object.y + object.height + gap > top)
    .map(object => ({ left: object.x - gap, right: object.x + object.width + gap })).sort((a, b) => a.left - b.left);
  let x = requested.x;
  for (const obstacle of obstacles) {
    if (obstacle.right <= x) continue;
    if (x + requested.width <= obstacle.left) break;
    x = obstacle.right;
  }
  if (!Number.isFinite(x + requested.width)) throw new TypeError("Placement exceeds finite coordinates.");
  return { ...requested, x };
}
