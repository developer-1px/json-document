import { cloneJson } from "../../foundation/json/clone.js";
import type { JSONPatchOperation } from "../../foundation/patch/contract.js";
import {
  escapeSegment,
  readAt,
  tryParsePointer,
  type Pointer,
} from "../../foundation/pointer/index.js";
import type { SelectionPoint, SelectionPointObject } from "../selection/point.js";
import type { SelectionSnap } from "../selection/snap.js";

export interface TextSurface {
  textPath: Pointer;
  atomsPath?: Pointer | null;
  rangesPath?: Pointer | null;
}

export interface TextSurfaceAtom {
  offset: number;
  [key: string]: unknown;
}

export interface TextSurfaceRange {
  start: number;
  end: number;
  [key: string]: unknown;
}

export interface TextSurfaceFragment {
  text: string;
  atoms?: Record<string, TextSurfaceAtom>;
  ranges?: Record<string, TextSurfaceRange>;
}

export type TextSurfaceReplacement = string | TextSurfaceFragment;

export interface TextSurfaceReplaceOptions {
  /** Optional affinity attached to the collapsed selection produced after replacement. */
  affinity?: SelectionPointObject["affinity"];
}

export type TextSurfaceErrorCode =
  | "invalid_pointer"
  | "invalid_sidecar"
  | "missing_selection"
  | "multi_pointer_range"
  | "not_string"
  | "path_not_found";

export interface TextSurfaceError {
  ok: false;
  code: TextSurfaceErrorCode;
  reason: string;
  pointer: Pointer | null;
}

export type TextSurfaceFragmentResult =
  | {
      ok: true;
      fragment: TextSurfaceFragment;
      selectionRange: TextSurfaceSelectionRange;
    }
  | TextSurfaceError;

export type TextSurfaceReplaceResult =
  | {
      ok: true;
      patch: JSONPatchOperation[];
      selectionAfter: SelectionSnap;
      selectionRange: TextSurfaceSelectionRange;
      fragment: TextSurfaceFragment;
    }
  | TextSurfaceError;

export type TextSurfaceMutationResult =
  | {
      ok: true;
      patch: JSONPatchOperation[];
      mutationRange: TextSurfaceMutationRange;
    }
  | TextSurfaceError;

export interface TextSurfaceSelectionRange {
  textPath: Pointer;
  start: number;
  end: number;
  anchorOffset: number;
  focusOffset: number;
  collapsed: boolean;
}

export interface TextSurfaceMutationRange {
  start: number;
  end: number;
  insertedTextLength: number;
}

export function textSurfaceFragment(
  selection: SelectionSnap,
  state: unknown,
  surface: TextSurface,
): TextSurfaceFragmentResult {
  const range = textSurfaceSelectionRange(selection, state, surface);
  if (!range.ok) return range;

  const text = readString(state, surface.textPath);
  if (!text.ok) return text;

  const atoms = textSurfaceAtomsInRange(state, surface.atomsPath ?? null, range.range);
  if (!atoms.ok) return atoms;
  const ranges = textSurfaceRangesInRange(state, surface.rangesPath ?? null, range.range);
  if (!ranges.ok) return ranges;

  return {
    ok: true,
    fragment: compactFragment({
      text: text.value.slice(range.range.start, range.range.end),
      atoms: atoms.atoms,
      ranges: ranges.ranges,
    }),
    selectionRange: range.range,
  };
}

export function replaceTextSurfaceSelection(
  selection: SelectionSnap,
  state: unknown,
  surface: TextSurface,
  replacement: TextSurfaceReplacement,
  options: TextSurfaceReplaceOptions = {},
): TextSurfaceReplaceResult {
  const range = textSurfaceSelectionRange(selection, state, surface);
  if (!range.ok) return range;

  const text = readString(state, surface.textPath);
  if (!text.ok) return text;

  const fragment = normalizeReplacement(replacement);
  const nextText = `${text.value.slice(0, range.range.start)}${fragment.text}${text.value.slice(range.range.end)}`;
  const patch: JSONPatchOperation[] = [
    { op: "replace", path: surface.textPath, value: nextText },
  ];
  const sidecar = textSurfaceSidecarReplacementPatch(
    state,
    surface,
    range.range,
    fragment,
  );
  if (!sidecar.ok) return sidecar;
  patch.push(...sidecar.patch);

  return {
    ok: true,
    patch,
    selectionAfter: textSurfaceSelectionAfter(
      surface.textPath,
      range.range.start + fragment.text.length,
      options,
      selection.context,
    ),
    selectionRange: range.range,
    fragment,
  };
}

export function syncTextSurfaceMutation(
  state: unknown,
  surface: TextSurface,
  previousText: string,
  nextText: string,
): TextSurfaceMutationResult {
  const current = readString(state, surface.textPath);
  if (!current.ok) return current;

  const mutationRange = changedTextRange(previousText, nextText);
  if (mutationRange.start === mutationRange.end && mutationRange.insertedTextLength === 0) {
    return { ok: true, patch: [], mutationRange };
  }

  const patch: JSONPatchOperation[] = [
    { op: "replace", path: surface.textPath, value: nextText },
  ];
  const sidecar = textSurfaceSidecarReplacementPatch(
    state,
    surface,
    {
      textPath: surface.textPath,
      start: mutationRange.start,
      end: mutationRange.end,
      anchorOffset: mutationRange.start,
      focusOffset: mutationRange.end,
      collapsed: mutationRange.start === mutationRange.end,
    },
    { text: nextText.slice(mutationRange.start, mutationRange.start + mutationRange.insertedTextLength) },
  );
  if (!sidecar.ok) return sidecar;
  patch.push(...sidecar.patch);
  return { ok: true, patch, mutationRange };
}

function textSurfaceSelectionRange(
  selection: SelectionSnap,
  state: unknown,
  surface: TextSurface,
): { ok: true; range: TextSurfaceSelectionRange } | TextSurfaceError {
  const text = readString(state, surface.textPath);
  if (!text.ok) return text;

  const range = selection.selectionRanges[selection.primaryIndex];
  if (range === undefined) {
    return {
      ok: false,
      code: "missing_selection",
      reason: "text surface selection has no primary range",
      pointer: surface.textPath,
    };
  }
  if (!isOffsetPoint(range.anchor) || !isOffsetPoint(range.focus)) {
    return {
      ok: false,
      code: "missing_selection",
      reason: "text surface selection points must include offsets",
      pointer: surface.textPath,
    };
  }
  if (range.anchor.path !== surface.textPath || range.focus.path !== surface.textPath) {
    return {
      ok: false,
      code: "multi_pointer_range",
      reason: `text surface selection must stay inside ${surface.textPath}`,
      pointer: surface.textPath,
    };
  }

  const anchorOffset = clampOffset(range.anchor.offset, text.value.length);
  const focusOffset = clampOffset(range.focus.offset, text.value.length);
  return {
    ok: true,
    range: {
      textPath: surface.textPath,
      start: Math.min(anchorOffset, focusOffset),
      end: Math.max(anchorOffset, focusOffset),
      anchorOffset,
      focusOffset,
      collapsed: anchorOffset === focusOffset,
    },
  };
}

function textSurfaceSidecarReplacementPatch(
  state: unknown,
  surface: TextSurface,
  range: TextSurfaceSelectionRange,
  fragment: TextSurfaceFragment,
): { ok: true; patch: JSONPatchOperation[] } | TextSurfaceError {
  const patch: JSONPatchOperation[] = [];
  const atoms = textSurfaceAtomReplacementPatch(
    state,
    surface.atomsPath ?? null,
    range,
    fragment.atoms ?? {},
    fragment.text.length,
  );
  if (!atoms.ok) return atoms;
  patch.push(...atoms.patch);

  const ranges = textSurfaceRangeReplacementPatch(
    state,
    surface.rangesPath ?? null,
    range,
    fragment.ranges ?? {},
    fragment.text.length,
  );
  if (!ranges.ok) return ranges;
  patch.push(...ranges.patch);
  return { ok: true, patch };
}

function textSurfaceAtomReplacementPatch(
  state: unknown,
  atomsPath: Pointer | null,
  range: TextSurfaceSelectionRange,
  insertedAtoms: Record<string, TextSurfaceAtom>,
  insertedTextLength: number,
): { ok: true; patch: JSONPatchOperation[] } | TextSurfaceError {
  if (atomsPath === null) return { ok: true, patch: [] };
  const atoms = readAtomRecords(state, atomsPath);
  if (!atoms.ok) return atoms;

  const patch: JSONPatchOperation[] = [];
  const delta = insertedTextLength - (range.end - range.start);
  const removed = new Set<string>();
  for (const [id, atom] of Object.entries(atoms.atoms)) {
    const path = `${atomsPath}/${escapeSegment(id)}`;
    if (range.start <= atom.offset && atom.offset < range.end) {
      removed.add(id);
      patch.push({ op: "remove", path });
      continue;
    }
    if (atom.offset >= range.end) {
      patch.push({ op: "replace", path: `${path}/offset`, value: atom.offset + delta });
    }
  }

  const reserved = new Set(Object.keys(atoms.atoms));
  for (const id of removed) reserved.delete(id);
  for (const [id, atom] of Object.entries(insertedAtoms)) {
    const nextId = uniqueSidecarId(id, reserved);
    reserved.add(nextId);
    patch.push({
      op: "add",
      path: `${atomsPath}/${escapeSegment(nextId)}`,
      value: { ...cloneJson(atom), offset: range.start + atom.offset },
    });
  }
  return { ok: true, patch };
}

function textSurfaceRangeReplacementPatch(
  state: unknown,
  rangesPath: Pointer | null,
  range: TextSurfaceSelectionRange,
  insertedRanges: Record<string, TextSurfaceRange>,
  insertedTextLength: number,
): { ok: true; patch: JSONPatchOperation[] } | TextSurfaceError {
  if (rangesPath === null) return { ok: true, patch: [] };
  const ranges = readRangeRecords(state, rangesPath);
  if (!ranges.ok) return ranges;

  const patch: JSONPatchOperation[] = [];
  const delta = insertedTextLength - (range.end - range.start);
  const removed = new Set<string>();
  for (const [id, existing] of Object.entries(ranges.ranges)) {
    const nextStart = mapRangeStart(existing.start, range, delta);
    const nextEnd = mapRangeEnd(existing.end, range, insertedTextLength, delta);
    const path = `${rangesPath}/${escapeSegment(id)}`;
    if (nextEnd <= nextStart) {
      removed.add(id);
      patch.push({ op: "remove", path });
      continue;
    }
    if (nextStart !== existing.start) {
      patch.push({ op: "replace", path: `${path}/start`, value: nextStart });
    }
    if (nextEnd !== existing.end) {
      patch.push({ op: "replace", path: `${path}/end`, value: nextEnd });
    }
  }

  const reserved = new Set(Object.keys(ranges.ranges));
  for (const id of removed) reserved.delete(id);
  for (const [id, inserted] of Object.entries(insertedRanges)) {
    const nextId = uniqueSidecarId(id, reserved);
    reserved.add(nextId);
    patch.push({
      op: "add",
      path: `${rangesPath}/${escapeSegment(nextId)}`,
      value: {
        ...cloneJson(inserted),
        start: range.start + inserted.start,
        end: range.start + inserted.end,
      },
    });
  }
  return { ok: true, patch };
}

function textSurfaceAtomsInRange(
  state: unknown,
  atomsPath: Pointer | null,
  range: TextSurfaceSelectionRange,
): { ok: true; atoms: Record<string, TextSurfaceAtom> } | TextSurfaceError {
  if (atomsPath === null) return { ok: true, atoms: {} };
  const atoms = readAtomRecords(state, atomsPath);
  if (!atoms.ok) return atoms;
  const selected: Record<string, TextSurfaceAtom> = {};
  for (const [id, atom] of Object.entries(atoms.atoms)) {
    if (range.start <= atom.offset && atom.offset < range.end) {
      selected[id] = { ...cloneJson(atom), offset: atom.offset - range.start };
    }
  }
  return { ok: true, atoms: selected };
}

function textSurfaceRangesInRange(
  state: unknown,
  rangesPath: Pointer | null,
  range: TextSurfaceSelectionRange,
): { ok: true; ranges: Record<string, TextSurfaceRange> } | TextSurfaceError {
  if (rangesPath === null) return { ok: true, ranges: {} };
  const ranges = readRangeRecords(state, rangesPath);
  if (!ranges.ok) return ranges;
  const selected: Record<string, TextSurfaceRange> = {};
  for (const [id, existing] of Object.entries(ranges.ranges)) {
    const start = Math.max(existing.start, range.start);
    const end = Math.min(existing.end, range.end);
    if (start < end) {
      selected[id] = {
        ...cloneJson(existing),
        start: start - range.start,
        end: end - range.start,
      };
    }
  }
  return { ok: true, ranges: selected };
}

function readString(
  state: unknown,
  pointer: Pointer,
): { ok: true; value: string } | TextSurfaceError {
  const value = readPointer(state, pointer);
  if (!value.ok) return value;
  if (typeof value.value !== "string") {
    return {
      ok: false,
      code: "not_string",
      reason: `text surface target is not a string: ${pointer}`,
      pointer,
    };
  }
  return { ok: true, value: value.value };
}

function readAtomRecords(
  state: unknown,
  pointer: Pointer,
): { ok: true; atoms: Record<string, TextSurfaceAtom> } | TextSurfaceError {
  const record = readRecord(state, pointer);
  if (!record.ok) return record;
  const atoms: Record<string, TextSurfaceAtom> = {};
  for (const [id, value] of Object.entries(record.value)) {
    if (isRecord(value) && typeof value.offset === "number") {
      atoms[id] = value as TextSurfaceAtom;
      continue;
    }
    return invalidSidecar(pointer, `text surface atom must include numeric offset: ${id}`);
  }
  return { ok: true, atoms };
}

function readRangeRecords(
  state: unknown,
  pointer: Pointer,
): { ok: true; ranges: Record<string, TextSurfaceRange> } | TextSurfaceError {
  const record = readRecord(state, pointer);
  if (!record.ok) return record;
  const ranges: Record<string, TextSurfaceRange> = {};
  for (const [id, value] of Object.entries(record.value)) {
    if (
      isRecord(value) &&
      typeof value.start === "number" &&
      typeof value.end === "number"
    ) {
      ranges[id] = value as TextSurfaceRange;
      continue;
    }
    return invalidSidecar(pointer, `text surface range must include numeric start/end: ${id}`);
  }
  return { ok: true, ranges };
}

function readRecord(
  state: unknown,
  pointer: Pointer,
): { ok: true; value: Record<string, unknown> } | TextSurfaceError {
  const value = readPointer(state, pointer);
  if (!value.ok) return value;
  if (!isRecord(value.value) || Array.isArray(value.value)) {
    return invalidSidecar(pointer, `text surface sidecar is not a record: ${pointer}`);
  }
  return { ok: true, value: value.value };
}

function readPointer(
  state: unknown,
  pointer: Pointer,
): { ok: true; value: unknown } | TextSurfaceError {
  const segments = tryParsePointer(pointer);
  if (segments === null) {
    return {
      ok: false,
      code: "invalid_pointer",
      reason: `invalid text surface pointer: ${pointer}`,
      pointer,
    };
  }
  const value = readAt(state, segments);
  if (!value.ok) {
    return {
      ok: false,
      code: "path_not_found",
      reason: `text surface path not found: ${pointer}`,
      pointer,
    };
  }
  return { ok: true, value: value.value };
}

function invalidSidecar(pointer: Pointer, reason: string): TextSurfaceError {
  return {
    ok: false,
    code: "invalid_sidecar",
    reason,
    pointer,
  };
}

function normalizeReplacement(replacement: TextSurfaceReplacement): TextSurfaceFragment {
  return typeof replacement === "string"
    ? { text: replacement }
    : compactFragment(cloneJson(replacement));
}

function compactFragment(fragment: TextSurfaceFragment): TextSurfaceFragment {
  const next: TextSurfaceFragment = { text: fragment.text };
  if (fragment.atoms !== undefined && Object.keys(fragment.atoms).length > 0) {
    next.atoms = fragment.atoms;
  }
  if (fragment.ranges !== undefined && Object.keys(fragment.ranges).length > 0) {
    next.ranges = fragment.ranges;
  }
  return next;
}

function textSurfaceSelectionAfter(
  path: Pointer,
  offset: number,
  options: TextSurfaceReplaceOptions,
  context: SelectionSnap["context"],
): SelectionSnap {
  const point: SelectionPointObject = { path, offset };
  if (options.affinity !== undefined) point.affinity = options.affinity;
  const selection: SelectionSnap = {
    selectedPointers: [path],
    selectionRanges: [{ anchor: point, focus: { ...point } }],
    primaryIndex: 0,
    anchor: { ...point },
    focus: { ...point },
  };
  return context === undefined ? selection : { ...selection, context: cloneJson(context) };
}

function changedTextRange(before: string, after: string): TextSurfaceMutationRange {
  const prefix = commonPrefixLength(before, after);
  const suffix = commonSuffixLength(before, after, prefix);
  return {
    start: prefix,
    end: before.length - suffix,
    insertedTextLength: after.length - prefix - suffix,
  };
}

function mapRangeStart(
  offset: number,
  range: TextSurfaceSelectionRange,
  delta: number,
): number {
  if (offset <= range.start) return offset;
  if (offset >= range.end) return offset + delta;
  return range.start;
}

function mapRangeEnd(
  offset: number,
  range: TextSurfaceSelectionRange,
  insertedTextLength: number,
  delta: number,
): number {
  if (offset <= range.start) return offset;
  if (offset >= range.end) return offset + delta;
  return range.start + insertedTextLength;
}

function uniqueSidecarId(id: string, reserved: Set<string>): string {
  if (!reserved.has(id)) return id;
  let index = 2;
  while (reserved.has(`${id}-${index}`)) index += 1;
  return `${id}-${index}`;
}

function commonPrefixLength(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  let index = 0;
  while (index < length && left[index] === right[index]) index += 1;
  return index;
}

function commonSuffixLength(
  left: string,
  right: string,
  prefixLength: number,
): number {
  let length = 0;
  const maxLength = Math.min(left.length, right.length) - prefixLength;
  while (
    length < maxLength &&
    left[left.length - 1 - length] === right[right.length - 1 - length]
  ) {
    length += 1;
  }
  return length;
}

function isOffsetPoint(
  point: SelectionPoint,
): point is SelectionPointObject & { path: Pointer; offset: number } {
  return typeof point === "object" && point !== null && typeof point.offset === "number";
}

function clampOffset(offset: number, length: number): number {
  if (!Number.isFinite(offset)) return 0;
  return Math.min(Math.max(Math.trunc(offset), 0), length);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
