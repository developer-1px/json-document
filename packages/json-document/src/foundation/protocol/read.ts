import { parsePointer, readAt, type Pointer } from "../pointer/core.js";
import type { JSONValue, ReadResult } from "./contract.js";

/** Resolves a pointer without cloning, freezing, or taking ownership of the value. */
export function readPointer(value: JSONValue, pointer: Pointer): ReadResult {
  let segments: string[];
  try {
    segments = parsePointer(pointer);
  } catch (error) {
    return Object.freeze({
      ok: false,
      code: "invalid_pointer",
      reason: error instanceof Error ? error.message : "invalid pointer",
      pointer,
    });
  }
  const result = readAt(value, segments);
  return result.ok
    ? Object.freeze({ ok: true, path: pointer, value: result.value as JSONValue })
    : Object.freeze({ ok: false, code: "path_not_found", reason: `path not found: ${pointer}`, pointer });
}
