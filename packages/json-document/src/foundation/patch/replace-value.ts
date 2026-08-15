import { replaceArrayIndex } from "../json/shared-array.js";
import { parseArrayIndex } from "../pointer/array-index.js";
import { objectHasOwn } from "./object.js";

export function replaceValueAtSegments(
  current: unknown,
  segments: ReadonlyArray<string>,
  index: number,
  value: unknown,
): unknown | null {
  if (index === segments.length) return value;
  if (current === null || typeof current !== "object") return null;

  const segment = segments[index]!;
  if (Array.isArray(current)) {
    const childIndex = parseArrayIndex(segment);
    if (childIndex === null || childIndex >= current.length) return null;
    const child = replaceValueAtSegments(current[childIndex], segments, index + 1, value);
    if (child === null) return null;
    return replaceArrayIndex(current, childIndex, child);
  }

  if (!objectHasOwn.call(current, segment)) return null;
  const child = replaceValueAtSegments(
    (current as Record<string, unknown>)[segment],
    segments,
    index + 1,
    value,
  );
  if (child === null) return null;
  return {
    ...(current as Record<string, unknown>),
    [segment]: child,
  };
}
