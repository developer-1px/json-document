import {
  authoredTextAtomId,
  initialTextAtomId,
  textUnits,
  type TextAtomSnapshot,
  type TextState,
} from "./text-core.js";
import type {
  ChangeId,
  TextAtomId,
  TextSelection,
  TextSpliceOperation,
} from "./types.js";

export interface TextSelectionGap {
  readonly left: TextAtomId | null;
  readonly right: TextAtomId | null;
  readonly affinity: "after-left" | "before-right";
}

export interface PlannedTextSelection {
  readonly plan: { readonly selection?: TextSelection };
  readonly anchorGap: TextSelectionGap | null;
  readonly focusGap: TextSelectionGap | null;
}

export function prepareTextSelection(
  input: TextSelection | undefined,
  value: string,
):
  | {
      readonly ok: true;
      readonly value: TextSelection | null;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    } {
  if (input === undefined) return { ok: true, value: null };
  if (
    typeof input !== "object"
    || input === null
    || !Number.isSafeInteger(input.anchor)
    || !Number.isSafeInteger(input.focus)
    || input.anchor < 0
    || input.focus < 0
    || scalarBoundaryIndex(value, input.anchor) === null
    || scalarBoundaryIndex(value, input.focus) === null
  ) {
    return textFailure(
      "invalid_text_offset",
      "selection offsets must be valid UTF-16 scalar boundaries",
    );
  }
  return {
    ok: true,
    value: Object.freeze({
      anchor: input.anchor,
      focus: input.focus,
    }),
  };
}

export function observedTextAtomIds(
  captured: ReadonlyArray<TextAtomSnapshot>,
  operation: TextSpliceOperation | null,
  changeId: ChangeId,
): ReadonlyArray<TextAtomId> {
  if (operation === null) {
    return Object.freeze(captured.map((atom) => atom.id));
  }
  const leftIndex = operation.left === null
    ? -1
    : captured.findIndex((atom) => atom.id === operation.left);
  const rightIndex = operation.right === null
    ? captured.length
    : captured.findIndex((atom) => atom.id === operation.right);
  const inserted = textUnits(operation.inserted).map((_, unitIndex) => (
    authoredTextAtomId(changeId, 0, unitIndex)
  ));
  return Object.freeze([
    ...captured.slice(0, leftIndex + 1).map((atom) => atom.id),
    ...inserted,
    ...captured.slice(rightIndex).map((atom) => atom.id),
  ]);
}

export function textSelectionGap(
  value: string,
  atomIds: ReadonlyArray<TextAtomId>,
  offset: number,
): TextSelectionGap | null {
  const boundary = scalarBoundaryIndex(value, offset);
  if (boundary === null || atomIds.length !== textUnits(value).length) {
    return null;
  }
  return Object.freeze({
    left: boundary === 0 ? null : atomIds[boundary - 1] ?? null,
    right: boundary === atomIds.length ? null : atomIds[boundary] ?? null,
    affinity: boundary === 0 ? "before-right" : "after-left",
  });
}

export function resolvePlannedSelection(
  planned: PlannedTextSelection,
  state: TextState | undefined,
): TextSelection | null {
  if (
    planned.plan.selection === undefined
    || planned.anchorGap === null
    || planned.focusGap === null
    || state === undefined
  ) {
    return null;
  }
  return Object.freeze({
    anchor: textGapOffset(state, planned.anchorGap),
    focus: textGapOffset(state, planned.focusGap),
  });
}

export function textFailure(
  code: string,
  reason: string,
): {
  readonly ok: false;
  readonly code: string;
  readonly reason: string;
} {
  return Object.freeze({ ok: false, code, reason });
}

function scalarBoundaryIndex(value: string, offset: number): number | null {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > value.length) {
    return null;
  }
  let cursor = 0;
  const units = textUnits(value);
  for (let index = 0; index <= units.length; index += 1) {
    if (cursor === offset) return index;
    const unit = units[index];
    if (unit !== undefined) cursor += unit.length;
  }
  return null;
}

function textGapOffset(
  state: TextState,
  gap: TextSelectionGap,
): number {
  const order = state.order ?? textUnits(state.atomic).map((_, unitIndex) => (
    initialTextAtomId(state.id, unitIndex)
  ));
  const rightIndex = gap.right === null ? -1 : order.indexOf(gap.right);
  const leftIndex = gap.left === null ? -1 : order.indexOf(gap.left);
  const boundary = gap.affinity === "after-left" && leftIndex >= 0
      ? leftIndex + 1
      : rightIndex >= 0
        ? rightIndex
        : leftIndex >= 0
          ? leftIndex + 1
          : gap.left === null
        ? 0
        : order.length;
  let offset = 0;
  for (let index = 0; index < boundary; index += 1) {
    const id = order[index];
    if (id === undefined) continue;
    if (state.atoms === undefined) {
      const unitIndex = Number(id.slice(id.lastIndexOf(":") + 1));
      offset += textUnits(state.atomic)[unitIndex]?.length ?? 0;
      continue;
    }
    const atom = state.atoms.get(id);
    if (atom !== undefined && !atom.deleted) offset += atom.value.length;
  }
  return offset;
}
