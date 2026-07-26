import type { Pointer } from "../pointer/core.js";
import type { ErrorCode, JSONResult } from "./contract.js";

export const ok: JSONResult = { ok: true };

export function fail(code: ErrorCode, reason?: string, pointer?: Pointer): JSONResult {
  return { ok: false, code, ...(reason === undefined ? {} : { reason }), ...(pointer === undefined ? {} : { pointer }) };
}
