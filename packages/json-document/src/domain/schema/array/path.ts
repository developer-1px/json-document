import {
  parentPointer,
  parsePointer,
  readAt,
  type Pointer,
} from "../../../foundation/pointer/index.js";
import type { JSONPatchOperation } from "../../../foundation/patch/index.js";
import { numericSegment } from "../../../foundation/patch/index.js";

export type AppliedLocalOpSourceValue = { ok: true; value: unknown } | { ok: false };

export function arrayIndexInParent(path: Pointer, parent: Pointer): { index: number | "-" } | null {
  const simple = parseSimpleArrayIndexPath(path);
  if (simple !== null) return simple.parent === parent ? { index: simple.index } : null;

  if (parentPointer(path) !== parent) return null;
  let segments: string[];
  try {
    segments = parsePointer(path);
  } catch {
    return null;
  }
  const segment = segments[segments.length - 1];
  if (segment === undefined) return null;
  const index = segment === "-" ? "-" : numericSegment(segment);
  return index === null ? null : { index };
}

export function arrayIndexPathLocation(
  path: Pointer,
): { parent: Pointer; parentSegments: string[]; index: number | "-" } | null {
  const simple = parseSimpleArrayIndexPath(path);
  if (simple !== null) {
    return {
      parent: simple.parent,
      parentSegments: simple.parent === "" ? [] : simple.parent.slice(1).split("/"),
      index: simple.index,
    };
  }

  const parent = parentPointer(path);
  if (parent === null) return null;
  let segments: string[];
  try {
    segments = parsePointer(path);
  } catch {
    return null;
  }
  const segment = segments[segments.length - 1];
  if (segment === undefined) return null;
  const index = segment === "-" ? "-" : numericSegment(segment);
  return index === null ? null : { parent, parentSegments: segments.slice(0, -1), index };
}

export function readArrayAtSegments(
  state: unknown,
  segments: ReadonlyArray<string>,
): { ok: true; array: ReadonlyArray<unknown> } | { ok: false } {
  const current = readAt(state, segments);
  return current.ok && Array.isArray(current.value) ? { ok: true, array: current.value } : { ok: false };
}

export function readAppliedLocalOpSourceValue(state: unknown, operation: JSONPatchOperation): AppliedLocalOpSourceValue {
  if (operation.op !== "copy" && operation.op !== "move") return { ok: false };
  try {
    return readAt(state, parsePointer(operation.from));
  } catch {
    return { ok: false };
  }
}

function parseSimpleArrayIndexPath(path: Pointer): { parent: Pointer; index: number | "-" } | null {
  if (path === "" || path[0] !== "/" || path.includes("~")) return null;
  const indexSlash = path.lastIndexOf("/");
  if (indexSlash < 0) return null;
  const segment = path.slice(indexSlash + 1);
  const index = segment === "-" ? "-" : numericSegment(segment);
  return index === null ? null : { parent: path.slice(0, indexSlash), index };
}
