import {
  appendSegment as appendSegmentInternal,
  applyProtocolPatch,
  buildPointer as buildPointerInternal,
  parentPointer as parentPointerInternal,
  parseArrayIndex as parseArrayIndexInternal,
  parsePointer as parsePointerInternal,
  trackPointer as trackPointerInternal,
  tryParsePointer as tryParsePointerInternal,
  jsonEqual as jsonEqualInternal,
} from "../../domain/json-document/index.js";
import type {
  JSONPatchOperation,
  JSONPatchResult,
  Pointer,
} from "./contract.js";

export function applyPatch(
  value: unknown,
  operations: ReadonlyArray<JSONPatchOperation>,
): JSONPatchResult {
  return applyProtocolPatch(value, operations);
}

export function parsePointer(pointer: Pointer): string[] {
  return parsePointerInternal(pointer);
}

export function parseArrayIndex(segment: string): number | null {
  return parseArrayIndexInternal(segment);
}

export function jsonEqual(left: unknown, right: unknown): boolean {
  return jsonEqualInternal(left, right);
}

export function tryParsePointer(pointer: Pointer): string[] | null {
  return tryParsePointerInternal(pointer);
}

export function buildPointer(
  segments: ReadonlyArray<string | number>,
  options: { readonly uriFragment?: boolean } = {},
): Pointer {
  return buildPointerInternal(segments, options);
}

export function parentPointer(pointer: Pointer): Pointer | null {
  return parentPointerInternal(pointer);
}

export function appendSegment(
  pointer: Pointer,
  segment: string | number,
): Pointer {
  return appendSegmentInternal(pointer, segment);
}

export function trackPointer(
  pointer: Pointer,
  applied: ReadonlyArray<JSONPatchOperation>,
): Pointer | null {
  return trackPointerInternal(pointer, applied);
}
