export interface OrderedAxis<Id> {
  readonly ids: ReadonlyArray<Id>;
  indexOf(id: Id): number | null;
  interval(anchor: Id, focus: Id): ReadonlyArray<Id>;
}

export function createOrderedAxis<Id>(
  ids: ReadonlyArray<Id>,
  equals: (left: Id, right: Id) => boolean = Object.is,
): OrderedAxis<Id> {
  function indexOf(id: Id): number | null {
    const index = ids.findIndex((candidate) => equals(candidate, id));
    return index < 0 ? null : index;
  }

  return {
    ids,
    indexOf,
    interval(anchor, focus) {
      const anchorIndex = indexOf(anchor);
      const focusIndex = indexOf(focus);
      if (anchorIndex === null || focusIndex === null) return [];
      const start = Math.min(anchorIndex, focusIndex);
      const end = Math.max(anchorIndex, focusIndex);
      return ids.slice(start, end + 1);
    },
  };
}
