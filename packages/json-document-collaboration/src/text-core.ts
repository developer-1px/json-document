import { changeIdKey } from "./change.js";
import type {
  ChangeId,
  TextAtomId,
  TextNodeId,
  TextSpliceOperation,
} from "./types.js";

interface TextAtom {
  readonly id: TextAtomId;
  readonly value: string;
  deleted: boolean;
}

export interface TextState {
  readonly id: TextNodeId;
  readonly atomic: string;
  order?: TextAtomId[];
  atoms?: Map<TextAtomId, TextAtom>;
}

interface TextCoreFailure {
  readonly ok: false;
  readonly code: string;
  readonly reason: string;
}

export interface TextAtomSnapshot {
  readonly id: TextAtomId;
  readonly value: string;
}

interface TextSnapshot {
  readonly textNode: TextNodeId;
  readonly value: string;
  readonly atoms: ReadonlyArray<TextAtomSnapshot>;
}

interface MinimalTextSplice {
  readonly left: TextAtomId | null;
  readonly right: TextAtomId | null;
  readonly removed: ReadonlyArray<TextAtomId>;
  readonly inserted: string;
}

export function createTextNodeId(
  seed: string,
  path: string,
): TextNodeId {
  return `${seed}:text:${path}`;
}

export function createTextState(
  id: TextNodeId,
  value: string,
): TextState {
  return { id, atomic: value };
}

export function cloneTextState(state: TextState): TextState {
  if (state.order === undefined || state.atoms === undefined) {
    return {
      id: state.id,
      atomic: state.atomic,
    };
  }
  return {
    id: state.id,
    atomic: state.atomic,
    order: [...state.order],
    atoms: new Map(
      [...state.atoms].map(([id, atom]) => [
        id,
        {
          id: atom.id,
          value: atom.value,
          deleted: atom.deleted,
        },
      ]),
    ),
  };
}

export function projectText(state: TextState): string {
  if (state.order === undefined || state.atoms === undefined) {
    return state.atomic;
  }
  let value = "";
  for (const id of state.order) {
    const atom = state.atoms.get(id);
    if (atom !== undefined && !atom.deleted) value += atom.value;
  }
  return value;
}

export function snapshotText(state: TextState): TextSnapshot {
  const atoms = state.order === undefined || state.atoms === undefined
    ? textUnits(state.atomic).map((value, unitIndex) => Object.freeze({
        id: initialTextAtomId(state.id, unitIndex),
        value,
      }))
    : state.order.flatMap((id) => {
        const atom = state.atoms?.get(id);
        return atom === undefined || atom.deleted
          ? []
          : [Object.freeze({ id: atom.id, value: atom.value })];
      });
  return Object.freeze({
    textNode: state.id,
    value: atoms.map((atom) => atom.value).join(""),
    atoms: Object.freeze(atoms),
  });
}

export function createMinimalTextSplice(
  before: TextSnapshot,
  after: string,
): MinimalTextSplice | null {
  const afterUnits = textUnits(after);
  let prefix = 0;
  while (
    prefix < before.atoms.length
    && prefix < afterUnits.length
    && before.atoms[prefix]?.value === afterUnits[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < before.atoms.length - prefix
    && suffix < afterUnits.length - prefix
    && before.atoms[before.atoms.length - 1 - suffix]?.value
      === afterUnits[afterUnits.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const removedAtoms = before.atoms.slice(
    prefix,
    before.atoms.length - suffix,
  );
  const inserted = afterUnits.slice(
    prefix,
    afterUnits.length - suffix,
  ).join("");
  if (removedAtoms.length === 0 && inserted.length === 0) return null;
  return Object.freeze({
    left: prefix === 0
      ? null
      : before.atoms[prefix - 1]?.id ?? null,
    right: suffix === 0
      ? null
      : before.atoms[before.atoms.length - suffix]?.id ?? null,
    removed: Object.freeze(removedAtoms.map((atom) => atom.id)),
    inserted,
  });
}

export function initialTextAtomId(
  textNodeId: TextNodeId,
  unitIndex: number,
): TextAtomId {
  return `text-atom:${textNodeId}:initial:${unitIndex}`;
}

export function authoredTextAtomId(
  changeId: ChangeId,
  opIndex: number,
  unitIndex: number,
): TextAtomId {
  return `text-atom:${changeIdKey(changeId)}:${opIndex}:${unitIndex}`;
}

export function applyTextSplice(
  state: TextState,
  operation: TextSpliceOperation,
  changeId: ChangeId,
  opIndex: number,
): TextCoreFailure | { readonly ok: true } {
  const sequence = ensureSequence(state);
  const leftIndex = boundaryIndex(
    sequence.order,
    sequence.atoms,
    operation.left,
    -1,
  );
  if (!leftIndex.ok) return leftIndex;
  const rightIndex = boundaryIndex(
    sequence.order,
    sequence.atoms,
    operation.right,
    sequence.order.length,
  );
  if (!rightIndex.ok) return rightIndex;
  if (leftIndex.value >= rightIndex.value) {
    return failure(
      "text_anchor_order_invalid",
      "text gap anchors no longer identify an ordered interval",
    );
  }

  const removed = new Set(operation.removed);
  if (
    (operation.left !== null && removed.has(operation.left))
    || (operation.right !== null && removed.has(operation.right))
  ) {
    return failure(
      "text_boundary_removed",
      "text splice boundaries cannot also be removed",
    );
  }
  for (const atomId of operation.removed) {
    const atom = sequence.atoms.get(atomId);
    const index = sequence.order.indexOf(atomId);
    if (atom === undefined || index < 0) {
      return failure(
        "text_atom_not_found",
        `text removal atom is missing: ${atomId}`,
      );
    }
    if (index <= leftIndex.value || index >= rightIndex.value) {
      return failure(
        "text_removal_outside_gap",
        `text removal atom is outside the captured gap: ${atomId}`,
      );
    }
  }

  for (const atomId of operation.removed) {
    const atom = sequence.atoms.get(atomId) as TextAtom;
    atom.deleted = true;
  }

  const insertedAtoms = textUnits(operation.inserted).map(
    (value, unitIndex): TextAtom => ({
      id: authoredTextAtomId(changeId, opIndex, unitIndex),
      value,
      deleted: false,
    }),
  );
  for (const atom of insertedAtoms) {
    if (sequence.atoms.has(atom.id)) {
      return failure(
        "text_atom_collision",
        `text insertion atom already exists: ${atom.id}`,
      );
    }
  }
  sequence.order.splice(
    rightIndex.value,
    0,
    ...insertedAtoms.map((atom) => atom.id),
  );
  for (const atom of insertedAtoms) {
    sequence.atoms.set(atom.id, atom);
  }
  return { ok: true };
}

export function textUnits(value: string): ReadonlyArray<string> {
  return Array.from(value);
}

function ensureSequence(
  state: TextState,
): {
  readonly order: TextAtomId[];
  readonly atoms: Map<TextAtomId, TextAtom>;
} {
  if (state.order !== undefined && state.atoms !== undefined) {
    return {
      order: state.order,
      atoms: state.atoms,
    };
  }
  const atoms = new Map<TextAtomId, TextAtom>();
  const order = textUnits(state.atomic).map((value, unitIndex) => {
    const id = initialTextAtomId(state.id, unitIndex);
    atoms.set(id, { id, value, deleted: false });
    return id;
  });
  state.order = order;
  state.atoms = atoms;
  return { order, atoms };
}

function boundaryIndex(
  order: ReadonlyArray<TextAtomId>,
  atoms: ReadonlyMap<TextAtomId, TextAtom>,
  atomId: TextAtomId | null,
  nullIndex: number,
):
  | { readonly ok: true; readonly value: number }
  | TextCoreFailure {
  if (atomId === null) return { ok: true, value: nullIndex };
  if (!atoms.has(atomId)) {
    return failure(
      "text_anchor_not_found",
      `text gap anchor is missing: ${atomId}`,
    );
  }
  const index = order.indexOf(atomId);
  return index < 0
    ? failure(
        "text_anchor_not_found",
        `text gap anchor is missing from order: ${atomId}`,
      )
    : { ok: true, value: index };
}

function failure(code: string, reason: string): TextCoreFailure {
  return { ok: false, code, reason };
}
