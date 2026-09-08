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
  isJSONValue as isJSONValueInternal,
  readPointer as readPointerInternal,
} from "../../domain/json-document/index.js";
import type {
  JSONPatchOperation,
  JSONPatchResult,
  JSONValue,
  Pointer,
  ReadResult,
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

/** Tests Core's JSON tree constraints without cloning or normalizing the input. */
export function isJSONValue(value: unknown): value is JSONValue {
  return isJSONValueInternal(value);
}

/** Reads a JSON value by Pointer, preserving the selected value's identity. */
export function readPointer(value: JSONValue, pointer: Pointer): ReadResult {
  return readPointerInternal(value, pointer);
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

/** Tracks a location through applied patches using the pre-patch value.
 * Omitting `before` retains the legacy numeric-segment-as-array interpretation.
 */
export function trackPointer(
  pointer: Pointer,
  applied: ReadonlyArray<JSONPatchOperation>,
  before?: JSONValue,
): Pointer | null {
  return trackPointerInternal(pointer, applied, before);
}
