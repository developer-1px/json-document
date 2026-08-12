export interface SetSelectionState<Id> {
  readonly selectedIds: ReadonlyArray<Id>;
  readonly primaryId: Id | null;
}

export type SetSelectionMode = "replace" | "add" | "toggle";

export function selectSetItems<Id>(
  current: SetSelectionState<Id>,
  candidates: ReadonlyArray<Id>,
  mode: SetSelectionMode,
  equals: (left: Id, right: Id) => boolean = Object.is,
): SetSelectionState<Id> {
  const uniqueCandidates = unique(candidates, equals);
  if (mode === "replace") {
    return {
      selectedIds: uniqueCandidates,
      primaryId: uniqueCandidates.at(-1) ?? null,
    };
  }

  const selectedIds = [...current.selectedIds];
  let primaryId = current.primaryId;
  for (const candidate of uniqueCandidates) {
    const index = selectedIds.findIndex((selected) => equals(selected, candidate));
    if (mode === "toggle" && index >= 0) {
      selectedIds.splice(index, 1);
      if (primaryId !== null && equals(primaryId, candidate)) {
        primaryId = selectedIds.at(-1) ?? null;
      }
      continue;
    }
    if (index < 0) selectedIds.push(candidate);
    primaryId = candidate;
  }
  return { selectedIds, primaryId };
}

function unique<Id>(
  ids: ReadonlyArray<Id>,
  equals: (left: Id, right: Id) => boolean,
): Id[] {
  const result: Id[] = [];
  for (const id of ids) {
    if (!result.some((candidate) => equals(candidate, id))) result.push(id);
  }
  return result;
}
