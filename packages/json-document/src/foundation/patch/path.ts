import type { Pointer } from "../pointer/core.js";
import { parseArrayIndex } from "../pointer/array-index.js";

export function arrayLocation(path: Pointer): { parent: Pointer; index: number | "-" } | null {
  if (path[0] !== "/") return null;
  const slash = path.lastIndexOf("/");
  const parent = path.slice(0, slash);
  const segment = path.slice(slash + 1);
  const index = segment === "-" ? "-" : parseArrayIndex(segment);
  return index === null ? null : { parent, index };
}
