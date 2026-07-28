import type { JSONValue } from "@interactive-os/json-document";

import { canonicalStringify } from "./change.js";

export function jsonEqual(left: JSONValue, right: JSONValue): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}
