import type {
  Pointer,
} from "@interactive-os/json-document/session";

import type {
  CollectionError,
  CollectionErrorCode,
} from "./types.js";

export function collectionError(
  code: CollectionErrorCode,
  reason: string,
  pointer?: Pointer,
): CollectionError {
  return { ok: false, code, reason, ...(pointer === undefined ? {} : { pointer }) };
}
