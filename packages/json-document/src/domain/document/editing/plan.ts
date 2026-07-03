import { query as jsonpathQuery } from "../../../foundation/jsonpath/index.js";
import { JSONPathSyntaxError } from "../../../foundation/jsonpath/index.js";
import type { JSONPatchOperation } from "../../../foundation/patch/index.js";
import { removeSourcesPatch } from "../../../foundation/patch/index.js";
import { appendSegment, buildPointer, readAt, tryParsePointer, type Pointer } from "../../../foundation/pointer/index.js";
import {
  primaryPointer,
  selectedSource,
} from "../../selection/read.js";
import {
  EMPTY_SELECTION,
  type SelectionSnap,
} from "../../selection/snap.js";
import type { SelectionSource } from "../../selection/read.js";
import type { CapabilityResult } from "../capabilities/result.js";
import type { JSONDocumentMoveTarget } from "./target.js";

export type DocumentEditPlan =
  | { ok: true; operations: JSONPatchOperation[] }
  | Extract<CapabilityResult, { ok: false }>;

type DocumentPathValueArgs = { target?: Pointer; value: unknown };

export function resolvePathValueArgs(
  pathOrValue: Pointer | unknown,
  value: unknown,
  hasValueArg: boolean,
): DocumentPathValueArgs {
  return hasValueArg
    ? { target: pathOrValue as Pointer, value }
    : { value: pathOrValue };
}

export function planDocumentReplace(input: {
  state: unknown;
  selection?: SelectionSnap | null | undefined;
  pathOrValue: Pointer | unknown;
  value: unknown;
  hasValueArg: boolean;
}): DocumentEditPlan {
  const args = resolvePathValueArgs(input.pathOrValue, input.value, input.hasValueArg);
  const target = args.target ?? primaryPointer(input.selection ?? EMPTY_SELECTION) ?? null;
  if (target === null) return emptySelectionCapability("replace target selection is empty");
  if (!target.startsWith("$")) {
    return { ok: true, operations: [{ op: "replace", path: target, value: args.value }] };
  }

  let pointers: Pointer[];
  try {
    pointers = jsonpathQuery(target, input.state);
  } catch (error) {
    if (error instanceof JSONPathSyntaxError) {
      return { ok: false, code: "syntax_error", reason: error.message };
    }
    throw error;
  }

  return pointers.length === 0
    ? { ok: false, code: "empty_match", reason: `no matches for ${target}` }
    : {
        ok: true,
        operations: [...pointers]
          .sort((a, b) => b.length - a.length)
          .map((path) => ({ op: "replace", path, value: args.value })),
      };
}

export function planDocumentDelete(input: {
  selection?: SelectionSnap | null | undefined;
  source?: SelectionSource | undefined;
}): DocumentEditPlan {
  const resolved = input.source ?? selectedSource(input.selection ?? EMPTY_SELECTION) ?? null;
  if (resolved === null) return emptySelectionCapability("delete source selection is empty");

  const planned = removeSourcesPatch(resolved);
  if (!planned.ok) {
    return planned.code === "invalid_pointer"
      ? {
          ok: false,
          code: "invalid_pointer",
          reason: `invalid delete source pointer: ${planned.pointer}`,
          pointer: planned.pointer,
        }
      : emptySelectionCapability("delete source selection is empty");
  }
  return { ok: true, operations: planned.patch };
}

export function planDocumentMove(input: {
  state: unknown;
  selection?: SelectionSnap | null | undefined;
  sourceOrTarget: Pointer | JSONDocumentMoveTarget;
  target?: JSONDocumentMoveTarget | undefined;
  hasSourceArg: boolean;
}): DocumentEditPlan {
  const source = input.hasSourceArg
    ? input.sourceOrTarget as Pointer
    : primaryPointer(input.selection ?? EMPTY_SELECTION) ?? null;
  if (source === null) return emptySelectionCapability("move source selection is empty");

  const target = input.hasSourceArg ? input.target! : input.sourceOrTarget as JSONDocumentMoveTarget;
  const destination = resolveMoveTarget(input.state, source, target);
  return destination.ok
    ? { ok: true, operations: [{ op: "move", from: source, path: destination.path }] }
    : destination;
}

function emptySelectionCapability(reason: string): Extract<CapabilityResult, { ok: false }> {
  return { ok: false, code: "empty_selection", reason };
}

function resolveMoveTarget(
  state: unknown,
  source: Pointer,
  target: JSONDocumentMoveTarget,
): { ok: true; path: Pointer } | Extract<CapabilityResult, { ok: false }> {
  if (typeof target === "string") return { ok: true, path: target };
  if (target !== null && typeof target === "object") {
    if ("into" in target) return resolveMoveIntoTarget(state, target.into);
    if ("before" in target) return resolveRelativeMoveTarget(source, target.before, "before");
    if ("after" in target) return resolveRelativeMoveTarget(source, target.after, "after");
  }
  return { ok: false, code: "invalid_pointer", reason: "invalid move target" };
}

function resolveMoveIntoTarget(
  state: unknown,
  target: Pointer,
): { ok: true; path: Pointer } | Extract<CapabilityResult, { ok: false }> {
  const segments = tryParsePointer(target);
  if (segments === null) {
    return { ok: false, code: "invalid_pointer", reason: `invalid move into target pointer: ${target}`, pointer: target };
  }
  const container = readAt(state, segments);
  // 구문 위반 = invalid_pointer, 부재 = path_not_found, 존재하나 종류 불일치 = invalid_target.
  if (!container.ok) {
    return { ok: false, code: "path_not_found", reason: `move into target not found: ${target}`, pointer: target };
  }
  if (!Array.isArray(container.value)) {
    return {
      ok: false,
      code: "invalid_target",
      reason: `move into target must address an array container: ${target}`,
      pointer: target,
    };
  }
  return { ok: true, path: appendSegment(target, "-") };
}

function resolveRelativeMoveTarget(
  source: Pointer,
  target: Pointer,
  position: "before" | "after",
): { ok: true; path: Pointer } | Extract<CapabilityResult, { ok: false }> {
  const targetLocation = arrayItemLocation(target);
  if (targetLocation === null) {
    return {
      ok: false,
      code: "invalid_target",
      reason: `relative move target must address an array item: ${target}`,
      pointer: target,
    };
  }

  const sourceLocation = arrayItemLocation(source);
  const sameParent = sourceLocation !== null && sourceLocation.parent === targetLocation.parent;
  if (sameParent && sourceLocation.index === targetLocation.index) return { ok: true, path: source };

  if (position === "before") {
    const index = sameParent && sourceLocation.index < targetLocation.index
      ? targetLocation.index - 1
      : targetLocation.index;
    return { ok: true, path: appendSegment(targetLocation.parent, index) };
  }

  const index = sameParent && sourceLocation.index < targetLocation.index
    ? targetLocation.index
    : targetLocation.index + 1;
  return { ok: true, path: appendSegment(targetLocation.parent, index) };
}

function arrayItemLocation(pointer: Pointer): { parent: Pointer; index: number } | null {
  const segments = tryParsePointer(pointer);
  if (segments === null || segments.length === 0) return null;
  const indexSegment = segments[segments.length - 1]!;
  if (!isArrayIndexSegment(indexSegment)) return null;
  return {
    parent: buildPointer(segments.slice(0, -1)),
    index: Number(indexSegment),
  };
}

function isArrayIndexSegment(segment: string): boolean {
  if (segment === "0") return true;
  if (segment.length === 0) return false;
  const first = segment.charCodeAt(0);
  if (first < 49 || first > 57) return false;
  for (let index = 1; index < segment.length; index += 1) {
    const code = segment.charCodeAt(index);
    if (code < 48 || code > 57) return false;
  }
  return true;
}
