import {
  buildPointer,
  parsePointer,
  tryParsePointer,
  type Pointer,
} from "@interactive-os/json-document/session";

export type PointerRelation = "same" | "ancestor" | "descendant" | "disjoint";

export function canonicalPointer(pointer: Pointer): Pointer | null {
  const segments = tryParsePointer(pointer);
  return segments === null ? null : buildPointer(segments);
}

export function pointerRelation(
  left: Pointer,
  right: Pointer,
): PointerRelation {
  const leftSegments = parsePointer(left);
  const rightSegments = parsePointer(right);
  const shared = Math.min(leftSegments.length, rightSegments.length);
  for (let index = 0; index < shared; index += 1) {
    if (leftSegments[index] !== rightSegments[index]) return "disjoint";
  }
  if (leftSegments.length === rightSegments.length) return "same";
  return leftSegments.length < rightSegments.length ? "ancestor" : "descendant";
}

export function readPointerValue(
  state: unknown,
  pointer: Pointer,
): { ok: true; value: unknown } | { ok: false } {
  let current = state;
  for (const segment of parsePointer(pointer)) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(segment)) return { ok: false };
      const index = Number(segment);
      if (index >= current.length) return { ok: false };
      current = current[index];
      continue;
    }
    if (
      current === null
      || typeof current !== "object"
      || !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return { ok: false };
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return { ok: true, value: current };
}

export function isArrayAtEither(
  before: unknown,
  after: unknown,
  pointer: Pointer,
): boolean {
  const beforeValue = readPointerValue(before, pointer);
  if (beforeValue.ok && Array.isArray(beforeValue.value)) return true;
  const afterValue = readPointerValue(after, pointer);
  return afterValue.ok && Array.isArray(afterValue.value);
}
