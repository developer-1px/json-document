import {
  buildPointer,
  tryParsePointer,
  type Pointer,
  type SelectionPoint,
  type SelectionPointObject,
} from "@interactive-os/json-document";

const POINT_FIELDS = new Set(["path", "offset", "edge", "affinity"]);

export type PreparedSelectionPoint =
  | {
      readonly ok: true;
      readonly point: SelectionPoint;
      readonly path: Pointer;
    }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly pointer?: Pointer;
    };

export function prepareSelectionPoint(input: unknown): PreparedSelectionPoint {
  try {
    return readSelectionPoint(input);
  } catch {
    return { ok: false, reason: "invalid relative selection point" };
  }
}

function readSelectionPoint(input: unknown): PreparedSelectionPoint {
  if (typeof input === "string") {
    const path = canonicalPointer(input);
    return path === null
      ? {
          ok: false,
          reason: `invalid relative selection pointer: ${input}`,
          pointer: input,
        }
      : { ok: true, point: path, path };
  }
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, reason: "invalid relative selection point" };
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return { ok: false, reason: "invalid relative selection point" };
  }

  const fields = new Map<string, unknown>();
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !POINT_FIELDS.has(key)) {
      return { ok: false, reason: "invalid relative selection point" };
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (
      descriptor === undefined
      || !descriptor.enumerable
      || !("value" in descriptor)
    ) {
      return { ok: false, reason: "invalid relative selection point" };
    }
    fields.set(key, descriptor.value);
  }

  const rawPath = fields.get("path");
  if (typeof rawPath !== "string") {
    return { ok: false, reason: "invalid relative selection point" };
  }
  const path = canonicalPointer(rawPath);
  if (path === null) {
    return {
      ok: false,
      reason: `invalid relative selection point path: ${rawPath}`,
      pointer: rawPath,
    };
  }

  const offset = fields.get("offset");
  const edge = fields.get("edge");
  const affinity = fields.get("affinity");
  if (
    (fields.has("offset") && (!Number.isSafeInteger(offset) || (offset as number) < 0))
    || (fields.has("edge") && edge !== "before" && edge !== "after")
    || (
      fields.has("affinity")
      && affinity !== "forward"
      && affinity !== "backward"
    )
  ) {
    return {
      ok: false,
      reason: "invalid relative selection point",
      pointer: path,
    };
  }

  const point: SelectionPointObject = {
    path,
    ...(typeof offset === "number" ? { offset } : {}),
    ...(edge === "before" || edge === "after" ? { edge } : {}),
    ...(affinity === "forward" || affinity === "backward"
      ? { affinity }
      : {}),
  };
  return { ok: true, point, path };
}

export function selectionPointPath(point: SelectionPoint): Pointer {
  return typeof point === "string" ? point : point.path;
}

export function withSelectionPointPath(
  point: SelectionPoint,
  path: Pointer,
): SelectionPoint {
  return typeof point === "string" ? path : { ...point, path };
}

function canonicalPointer(pointer: Pointer): Pointer | null {
  const segments = tryParsePointer(pointer);
  return segments === null ? null : buildPointer(segments);
}
